package com.workoutalarm.app.pose

import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.PoseDetectorOptions
import java.util.concurrent.Executors
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.sqrt

/**
 * PoseModule — on-device rep verification (CameraX + ML Kit Pose Detection).
 *
 * Frames NEVER cross the bridge: only rep events do. Each analyzed frame
 * yields one joint angle for the active exercise; a small state machine
 * (mirroring src/workout/repCounter.ts) counts only full-range,
 * human-tempo reps. Emits:
 *  - `onRepCounted` { reps, total, exercise } per verified rep,
 *  - `onPoseLost`   { reason } when no body is visible.
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
  private var lastPoseMs: Long = 0L
  private var poseLostEmitted = false

  @ReactMethod
  fun startPoseDetection(exercise: String, repTarget: Double, promise: Promise) {
    try {
      this.exercise = exercise
      this.repTarget = repTarget.toInt()
      this.total = 0
      resetCycle()

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
          provider.bindToLifecycle(
            activity,
            androidx.camera.core.CameraSelector.DEFAULT_FRONT_CAMERA,
            analysis
          )
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
        val landmarks = pose.allPoseLandmarks
        if (landmarks.isEmpty()) {
          onNoPose(now)
        } else {
          lastPoseMs = now
          poseLostEmitted = false
          val angle = jointAngleForExercise(pose, exercise) ?: return@addOnSuccessListener
          feedAngle(angle, now)
        }
      }
      ?.addOnFailureListener {
        onNoPose(System.currentTimeMillis())
      }
      ?.addOnCompleteListener {
        imageProxy.close()
      }
      ?: imageProxy.close()
  }

  private fun onNoPose(now: Long) {
    if (!poseLostEmitted && now - lastPoseMs > POSE_LOST_MS) {
      poseLostEmitted = true
      emit("onPoseLost", Arguments.createMap().apply {
        putString("reason", "no_body")
      })
    }
  }

  /** One joint angle (degrees) per exercise, from ML Kit landmarks. */
  private fun jointAngleForExercise(
    pose: com.google.mlkit.vision.pose.Pose,
    exercise: String
  ): Double? {
    val lm = pose.allPoseLandmarks.associateBy { it.landmarkType }
    fun pt(type: Int) = lm[type]?.position?.let { doubleArrayOf(it.x.toDouble(), it.y.toDouble()) }
    return when (exercise) {
      "squats" -> {
        // Knee angle: hip–knee–ankle (left side).
        val hip = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_HIP)
        val knee = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_KNEE)
        val ankle = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_ANKLE)
        if (hip != null && knee != null && ankle != null) angleBetween(hip, knee, ankle) else null
      }
      "pushups" -> {
        // Elbow angle: shoulder–elbow–wrist (left side).
        val shoulder = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_SHOULDER)
        val elbow = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_ELBOW)
        val wrist = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_WRIST)
        if (shoulder != null && elbow != null && wrist != null) angleBetween(shoulder, elbow, wrist) else null
      }
      "jumping_jacks" -> {
        // Shoulder abduction approx: angle at shoulder between hip–shoulder–wrist.
        val hip = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_HIP)
        val shoulder = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_SHOULDER)
        val wrist = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_WRIST)
        if (hip != null && shoulder != null && wrist != null) angleBetween(hip, shoulder, wrist) else null
      }
      "situps" -> {
        // Hip angle: shoulder–hip–knee (left side).
        val shoulder = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_SHOULDER)
        val hip = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_HIP)
        val knee = pt(com.google.mlkit.vision.pose.PoseLandmark.LEFT_KNEE)
        if (shoulder != null && hip != null && knee != null) angleBetween(shoulder, hip, knee) else null
      }
      else -> null
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
  }
}
