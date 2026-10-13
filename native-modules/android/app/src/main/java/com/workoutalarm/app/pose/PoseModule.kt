package com.workoutalarm.app.pose

import android.view.WindowManager
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.PoseLandmark
// ML Kit 18.x moved the concrete options into the .defaults subpackage
// (verified against the official API reference).
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import java.util.concurrent.Executors
import kotlin.math.acos
import kotlin.math.sqrt

/**
 * PoseModule — on-device rep verification (CameraX + ML Kit Pose Detection).
 *
 * Frames NEVER cross the bridge: only rep events do. Each analyzed frame
 * yields one joint angle for the active exercise, measured on whichever
 * side of the body the camera sees best; a small state machine (mirroring
 * src/workout/repCounter.ts) counts only full-range, human-tempo reps, and
 * only while the joints it needs are in frame. Emits:
 *  - `onRepCounted` { reps, total, exercise } per verified rep,
 *  - `onFraming`    { state } when framing changes: in_frame | partial | none.
 *
 * Keeps the screen on while detection runs: a propped-up phone must not
 * time out mid-set.
 *
 * Thresholds mirror EXERCISE_COUNTER_CONFIGS in src/workout/repCounter.ts —
 * keep the two in sync; the TS copy exists for tests and the demo fallback.
 */
@ExperimentalGetImage
class PoseModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "PoseModule"

  private var detector: PoseDetector? = null
  private var cameraProvider: ProcessCameraProvider? = null
  private val cameraExecutor = Executors.newSingleThreadExecutor()

  private var exercise: String = "squats"
  private var repTarget: Int = 20
  private var total: Int = 0

  // Rep state machine (mirrors the TS RepCounter).
  private var phase: Int = PHASE_UP
  private var cycleStartMs: Long = 0L

  // Framing: last emitted state, plus a candidate that must hold for a
  // moment before it is emitted (no flicker at the edge of the frame).
  private var framing: Int = FRAMING_NONE
  private var pendingFraming: Int = FRAMING_NONE
  private var pendingSinceMs: Long = 0L

  @ReactMethod
  fun startPoseDetection(exercise: String, repTarget: Double, promise: Promise) {
    try {
      this.exercise = exercise
      this.repTarget = repTarget.toInt()
      this.total = 0
      resetCycle()
      framing = FRAMING_NONE
      pendingFraming = FRAMING_NONE

      // ML Kit 18.x: base SDK uses PoseDetectorOptions (the old
      // AccuratePoseDetectorOptions moved to the separate
      // pose-detection-accurate artifact). STREAM_MODE is the right mode
      // for a live camera feed.
      val options = PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
        .build()
      detector = PoseDetection.getClient(options)

      // NOTE: RN 0.81 removed BaseJavaModule.getCurrentActivity(); use the
      // ReactApplicationContext accessor instead.
      val activity = reactApplicationContext.currentActivity
      if (activity !is LifecycleOwner) {
        promise.reject("NO_LIFECYCLE", "Current activity is not a LifecycleOwner")
        return
      }
      val cameraProviderFuture = ProcessCameraProvider.getInstance(reactApplicationContext)
      cameraProviderFuture.addListener({
        val provider = cameraProviderFuture.get()
        cameraProvider = provider
        val analysis = ImageAnalysis.Builder()
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .build()
        analysis.setAnalyzer(cameraExecutor, ::analyzeFrame)
        try {
          provider.unbindAll()
          // Front camera: the user faces the phone propped up.
          // Single session binds Preview + Analysis together — one camera
          // client, no fight over the exclusive resource.
          val useCases = mutableListOf<androidx.camera.core.UseCase>(analysis)
          previewViewRef?.let { pv ->
            val preview = Preview.Builder().build()
            preview.setSurfaceProvider(pv.surfaceProvider)
            useCases.add(0, preview)
          }
          provider.bindToLifecycle(
            activity,
            androidx.camera.core.CameraSelector.DEFAULT_FRONT_CAMERA,
            *useCases.toTypedArray()
          )
          activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } catch (e: Exception) {
          promise.reject("BIND_FAILED", "Camera bind failed: ${e.message}", e)
          return@addListener
        }
        promise.resolve(null)
      }, ContextCompat.getMainExecutor(reactApplicationContext))
    } catch (e: Exception) {
      promise.reject("START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun stopPoseDetection(promise: Promise) {
    try {
      cameraProvider?.unbindAll()
      detector?.close()
      detector = null
      reactApplicationContext.currentActivity?.let { activity ->
        activity.runOnUiThread {
          activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("STOP_FAILED", e.message, e)
    }
  }

  private fun analyzeFrame(imageProxy: ImageProxy) {
    val mediaImage = imageProxy.image
    if (mediaImage == null) {
      imageProxy.close()
      return
    }
    val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    detector?.process(image)
      ?.addOnSuccessListener { pose ->
        val now = System.currentTimeMillis()
        val (state, angle) = measure(pose)
        updateFraming(state, now)
        // Count only while the joints this exercise needs are in frame:
        // guessed off-screen landmarks must never bank (or block) a rep.
        if (state == FRAMING_IN && angle != null) feedAngle(angle, now)
      }
      ?.addOnFailureListener {
        updateFraming(FRAMING_NONE, System.currentTimeMillis())
      }
      ?.addOnCompleteListener {
        imageProxy.close()
      }
      ?: imageProxy.close()
  }

  /**
   * Framing state and joint angle for this frame. ML Kit always returns all
   * 33 landmarks once it finds a person, guessing positions for the ones it
   * can't see — so visibility comes from inFrameLikelihood, not presence.
   */
  private fun measure(pose: Pose): Pair<Int, Double?> {
    val landmarks = pose.allPoseLandmarks
    if (landmarks.isEmpty()) return FRAMING_NONE to null

    var best: List<PoseLandmark>? = null
    var bestScore = -1f
    for (left in listOf(true, false)) {
      val joints = jointsFor(exercise, left)?.mapNotNull { pose.getPoseLandmark(it) } ?: continue
      if (joints.size != 3) continue
      val score = joints.minOf { it.inFrameLikelihood }
      if (score > bestScore) {
        best = joints
        bestScore = score
      }
    }
    val joints = best
    if (joints != null && bestScore >= MIN_IN_FRAME) {
      val (a, b, c) = joints.map { doubleArrayOf(it.position.x.toDouble(), it.position.y.toDouble()) }
      return FRAMING_IN to angleBetween(a, b, c)
    }
    val visible = landmarks.count { it.inFrameLikelihood >= MIN_IN_FRAME }
    return (if (visible >= MIN_VISIBLE_FOR_PARTIAL) FRAMING_PARTIAL else FRAMING_NONE) to null
  }

  /** The three joints whose angle drives the rep count, per exercise and side. */
  private fun jointsFor(exercise: String, left: Boolean): List<Int>? = when (exercise) {
    // Knee angle: hip–knee–ankle.
    "squats" -> if (left) {
      listOf(PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_KNEE, PoseLandmark.LEFT_ANKLE)
    } else {
      listOf(PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_KNEE, PoseLandmark.RIGHT_ANKLE)
    }
    // Elbow angle: shoulder–elbow–wrist.
    "pushups" -> if (left) {
      listOf(PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_ELBOW, PoseLandmark.LEFT_WRIST)
    } else {
      listOf(PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_ELBOW, PoseLandmark.RIGHT_WRIST)
    }
    // Shoulder abduction approx: hip–shoulder–wrist.
    "jumping_jacks" -> if (left) {
      listOf(PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_WRIST)
    } else {
      listOf(PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_WRIST)
    }
    // Hip angle: shoulder–hip–knee.
    "situps" -> if (left) {
      listOf(PoseLandmark.LEFT_SHOULDER, PoseLandmark.LEFT_HIP, PoseLandmark.LEFT_KNEE)
    } else {
      listOf(PoseLandmark.RIGHT_SHOULDER, PoseLandmark.RIGHT_HIP, PoseLandmark.RIGHT_KNEE)
    }
    else -> null
  }

  /** Emit `onFraming` once a new state has held long enough to trust. */
  private fun updateFraming(next: Int, now: Long) {
    if (next == framing) {
      pendingFraming = framing
      return
    }
    if (next != pendingFraming) {
      pendingFraming = next
      pendingSinceMs = now
      return
    }
    val hold = if (next == FRAMING_NONE) POSE_LOST_MS else FRAMING_HOLD_MS
    if (now - pendingSinceMs >= hold) {
      framing = next
      emit("onFraming", Arguments.createMap().apply {
        putString("state", when (next) {
          FRAMING_IN -> "in_frame"
          FRAMING_PARTIAL -> "partial"
          else -> "none"
        })
      })
    }
  }

  private fun angleBetween(a: DoubleArray, b: DoubleArray, c: DoubleArray): Double {
    val v1x = a[0] - b[0]; val v1y = a[1] - b[1]
    val v2x = c[0] - b[0]; val v2y = c[1] - b[1]
    val dot = v1x * v2x + v1y * v2y
    val mag = sqrt(v1x * v1x + v1y * v1y) * sqrt(v2x * v2x + v2y * v2y)
    if (mag == 0.0) return 180.0
    return Math.toDegrees(acos((dot / mag).coerceIn(-1.0, 1.0)))
  }

  /** Thresholds mirror EXERCISE_COUNTER_CONFIGS (TS). Keep in sync. */
  private fun thresholds(): Triple<Double, Double, Pair<Long, Long>> = when (exercise) {
    "pushups" -> Triple(100.0, 160.0, 500L to 6000L)
    "jumping_jacks" -> Triple(40.0, 140.0, 400L to 4000L)
    "situps" -> Triple(70.0, 150.0, 700L to 8000L)
    else -> Triple(100.0, 160.0, 600L to 6000L) // squats
  }

  private fun resetCycle() {
    phase = PHASE_UP
    cycleStartMs = 0L
  }

  private fun feedAngle(angle: Double, now: Long) {
    val (downAt, upAt, tempo) = thresholds()
    val (minMs, maxMs) = tempo

    if (phase != PHASE_UP && cycleStartMs > 0 && now - cycleStartMs > maxMs) {
      // Stale cycle: abandon, discard this sample (mirrors TS).
      resetCycle()
      return
    }

    when (phase) {
      PHASE_UP -> {
        if (angle > downAt && angle < upAt) {
          phase = PHASE_DESCENDING
          cycleStartMs = now
        }
      }
      PHASE_DESCENDING -> {
        when {
          angle <= downAt -> phase = PHASE_DOWN
          angle >= upAt -> { resetCycle() }
        }
      }
      PHASE_DOWN -> {
        when {
          angle >= upAt -> resetCycle() // skipped the ascent: sloppy, no count
          angle > downAt -> phase = PHASE_ASCENDING
        }
      }
      PHASE_ASCENDING -> {
        when {
          angle <= downAt -> phase = PHASE_DOWN
          angle >= upAt -> {
            val elapsed = now - cycleStartMs
            resetCycle()
            if (elapsed in minMs..maxMs) {
              total += 1
              emit("onRepCounted", Arguments.createMap().apply {
                putInt("reps", 1)
                putInt("total", total)
                putString("exercise", exercise)
              })
            }
          }
        }
      }
    }
  }

  private fun emit(event: String, params: com.facebook.react.bridge.WritableMap) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, params)
  }

  companion object {
    private const val PHASE_UP = 0
    private const val PHASE_DESCENDING = 1
    private const val PHASE_DOWN = 2
    private const val PHASE_ASCENDING = 3
    private const val POSE_LOST_MS = 2500L
    private const val FRAMING_HOLD_MS = 400L
    private const val MIN_IN_FRAME = 0.5f
    private const val MIN_VISIBLE_FOR_PARTIAL = 4

    private const val FRAMING_NONE = 0
    private const val FRAMING_PARTIAL = 1
    private const val FRAMING_IN = 2

    /**
     * Preview surface from PoseCameraViewManager. Static because the view
     * manager and the module are created independently by React Native.
     * Null when the native preview isn't mounted (then analysis runs
     * headless — reps still count, just no viewfinder).
     */
    @Volatile
    private var previewViewRef: PreviewView? = null

    @JvmStatic
    fun attachPreviewView(view: PreviewView) {
      previewViewRef = view
    }

    @JvmStatic
    fun detachPreviewView() {
      previewViewRef = null
    }
  }
}
