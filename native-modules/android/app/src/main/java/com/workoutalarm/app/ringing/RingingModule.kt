package com.workoutalarm.app.ringing

import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.workoutalarm.app.alarm.AlarmReceiver
import com.workoutalarm.app.alarm.AlarmStore

/**
 * RingingModule — JS handle on the ringing state.
 *
 * startRinging() begins the unskippable foreground service.
 * releaseAlarm() is the ONLY code path that stops the sound: it is called
 * after the PoseModule verifies the rep target. Emits `onAlarmReleased`
 * with the authoritative payload.
 */
class RingingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "RingingModule"

  // The open sound-picker request, resolved from onActivityResult.
  private var pickPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
      ) {
        if (requestCode != PICK_SOUND_REQUEST) return
        val promise = pickPromise ?: return
        pickPromise = null
        if (resultCode != Activity.RESULT_OK) {
          promise.resolve(null) // cancelled: keep the current sound
          return
        }
        @Suppress("DEPRECATION")
        val uri: Uri? = data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
        promise.resolve(Arguments.createMap().apply {
          // Null when the user picked "Default": follow the phone's alarm sound.
          putString("uri", uri?.toString())
          putString("title", soundTitle(uri))
        })
      }
    })
  }

  // Required by NativeEventEmitter; events go through RCTDeviceEventEmitter.
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  @ReactMethod
  fun startRinging(alarmId: String, exercise: String, repTarget: Double, promise: Promise) {
    try {
      val intent = Intent(reactApplicationContext, RingingService::class.java).apply {
        putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
        putExtra(AlarmReceiver.EXTRA_EXERCISE, exercise)
        putExtra(AlarmReceiver.EXTRA_REP_TARGET, repTarget.toInt())
      }
      ContextCompat.startForegroundService(reactApplicationContext, intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("RING_FAILED", "Could not start ringing: ${e.message}", e)
    }
  }

  @ReactMethod
  fun releaseAlarm(alarmId: String, repsDone: Double, durationMs: Double, promise: Promise) {
    try {
      val stopIntent = Intent(reactApplicationContext, RingingService::class.java).apply {
        action = RingingService.ACTION_STOP
      }
      reactApplicationContext.stopService(stopIntent)
      // Paid in full: drop the persisted debt so a reboot or clock change
      // never rings this occurrence again. JS arms the next one.
      AlarmStore.remove(reactApplicationContext, alarmId)

      val params = Arguments.createMap().apply {
        putString("alarmId", alarmId)
        putInt("repsDone", repsDone.toInt())
        putDouble("durationMs", durationMs)
      }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onAlarmReleased", params)
      promise.resolve(params)
    } catch (e: Exception) {
      promise.reject("RELEASE_FAILED", "Could not release alarm: ${e.message}", e)
    }
  }

  /**
   * Read the launch intent when the app was opened by the full-screen
   * ringing intent, so JS can route straight to /ringing. Null otherwise.
   */
  @ReactMethod
  fun getRingingIntent(promise: Promise) {
    // NOTE: RN 0.81 removed BaseJavaModule.getCurrentActivity(); use the
    // ReactApplicationContext accessor instead.
    val intent = reactApplicationContext.currentActivity?.intent
    if (intent?.action == RingingService.ACTION_RINGING) {
      val params = Arguments.createMap().apply {
        putString("alarmId", intent.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID))
        putString("exercise", intent.getStringExtra(AlarmReceiver.EXTRA_EXERCISE) ?: "squats")
        putInt("repTarget", intent.getIntExtra(AlarmReceiver.EXTRA_REP_TARGET, 20))
      }
      // Consume it: a second read must not re-route.
      intent.action = null
      promise.resolve(params)
    } else {
      promise.resolve(null)
    }
  }

  /**
   * Fallback that does not depend on the Activity intent at all: asks the
   * service directly what it is ringing for. Used when getRingingIntent()
   * misses (e.g. intent consumed before JS read it).
   */
  @ReactMethod
  fun getActiveRinging(promise: Promise) {
    val ringing = RingingService.currentRinging
    if (ringing != null) {
      val params = Arguments.createMap().apply {
        putString("alarmId", ringing.alarmId)
        putString("exercise", ringing.exercise)
        putInt("repTarget", ringing.repTarget)
      }
      promise.resolve(params)
    } else {
      promise.resolve(null)
    }
  }

  /**
   * What the phone allows the alarm to do. Each false means the alarm can
   * ring without ever opening the workout screen (or not ring on time).
   */
  @ReactMethod
  fun getAlarmReadiness(promise: Promise) {
    val context = reactApplicationContext
    val notifications = NotificationManagerCompat.from(context).areNotificationsEnabled()
    val fullScreen = if (Build.VERSION.SDK_INT >= 34) {
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
        .canUseFullScreenIntent()
    } else {
      true
    }
    val exactAlarms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
    } else {
      true
    }
    promise.resolve(Arguments.createMap().apply {
      putBoolean("notifications", notifications)
      putBoolean("fullScreen", fullScreen)
      putBoolean("exactAlarms", exactAlarms)
    })
  }

  /** Open the system page where the user can allow full-screen alarms. */
  @ReactMethod
  fun openFullScreenIntentSettings(promise: Promise) {
    try {
      val intent = if (Build.VERSION.SDK_INT >= 34) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
          .setData(Uri.parse("package:${reactApplicationContext.packageName}"))
      } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
          .setData(Uri.parse("package:${reactApplicationContext.packageName}"))
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactApplicationContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SETTINGS_FAILED", e.message, e)
    }
  }

  /**
   * Android's own alarm-sound picker. Resolves { uri, title } — uri null
   * for "Default" — or null if the user backed out.
   */
  @ReactMethod
  fun pickAlarmSound(currentUri: String?, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No foreground activity")
      return
    }
    pickPromise?.resolve(null)
    pickPromise = promise
    val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
      putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
      putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
      putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false) // never a silent alarm
      putExtra(
        RingtoneManager.EXTRA_RINGTONE_DEFAULT_URI,
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      )
      putExtra(
        RingtoneManager.EXTRA_RINGTONE_EXISTING_URI,
        currentUri?.let(Uri::parse) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      )
    }
    try {
      activity.startActivityForResult(intent, PICK_SOUND_REQUEST)
    } catch (e: Exception) {
      pickPromise = null
      promise.reject("PICKER_FAILED", e.message, e)
    }
  }

  /** Display name of a sound URI; null URI → the phone's default alarm. */
  @ReactMethod
  fun getSoundTitle(uri: String?, promise: Promise) {
    promise.resolve(soundTitle(uri?.let(Uri::parse)))
  }

  private fun soundTitle(uri: Uri?): String {
    if (uri == null) return "Phone default"
    return try {
      RingtoneManager.getRingtone(reactApplicationContext, uri)
        ?.getTitle(reactApplicationContext)
        ?: "Phone default"
    } catch (_: Exception) {
      "Phone default"
    }
  }

  companion object {
    private const val PICK_SOUND_REQUEST = 7102
  }
}
