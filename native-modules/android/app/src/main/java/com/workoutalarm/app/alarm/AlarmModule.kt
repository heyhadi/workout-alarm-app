package com.workoutalarm.app.alarm

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * AlarmModule — exact alarm scheduling via AlarmManager.setAlarmClock().
 *
 * setAlarmClock is the strongest scheduling guarantee on Android: the system
 * shows an alarm-clock icon and fires even in Doze. Every armed alarm is
 * mirrored to AlarmStore so BootReceiver/TimeChangeReceiver can re-arm
 * them all without the JS runtime.
 *
 * Bridge: scheduleAlarm(alarmId, triggerAtMillis, exercise, repTarget),
 * cancelAlarm(alarmId). Emits nothing — AlarmReceiver starts the ringing.
 */
class AlarmModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AlarmModule"

  // Required by NativeEventEmitter; events go through RCTDeviceEventEmitter.
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  @ReactMethod
  fun scheduleAlarm(
    alarmId: String,
    triggerAtMillis: Double,
    exercise: String,
    repTarget: Double,
    promise: Promise
  ) {
    try {
      AlarmStore.arm(
        reactApplicationContext,
        ScheduledAlarm(alarmId, triggerAtMillis.toLong(), exercise, repTarget.toInt())
      )
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCHEDULE_FAILED", "Could not schedule exact alarm: ${e.message}", e)
    }
  }

  @ReactMethod
  fun cancelAlarm(alarmId: String, promise: Promise) {
    try {
      AlarmStore.disarm(reactApplicationContext, alarmId)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CANCEL_FAILED", "Could not cancel alarm: ${e.message}", e)
    }
  }
}
