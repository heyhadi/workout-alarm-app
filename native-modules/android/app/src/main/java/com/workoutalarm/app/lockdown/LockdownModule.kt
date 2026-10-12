package com.workoutalarm.app.lockdown

import android.app.Activity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * LockdownModule — lock-task (kiosk) mode during an active alarm.
 *
 * While pinned, Back/Home/recents gestures are swallowed and the ringing
 * screen stays on top. On non-device-owner phones the first call shows a
 * one-time system prompt ("Allow Workout Alarm to pin the screen?") —
 * expected, handled by the OS, and remembered afterwards.
 *
 * Released only together with the alarm itself (releaseAlarm path).
 */
class LockdownModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "LockdownModule"

  @ReactMethod
  fun enterLockTask(promise: Promise) {
    try {
      // NOTE: RN 0.81 removed BaseJavaModule.getCurrentActivity(); use the
      // ReactApplicationContext accessor instead.
      val activity: Activity? = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No foreground activity to pin")
        return
      }
      activity.runOnUiThread {
        try {
          activity.startLockTask()
          promise.resolve(true)
        } catch (e: Exception) {
          promise.reject("LOCK_FAILED", "Could not enter lock-task mode: ${e.message}", e)
        }
      }
    } catch (e: Exception) {
      promise.reject("LOCK_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun exitLockTask(promise: Promise) {
    try {
      val activity: Activity? = reactApplicationContext.currentActivity
      if (activity == null) {
        promise.resolve(null)
        return
      }
      activity.runOnUiThread {
        try {
          activity.stopLockTask()
        } catch (_: Exception) {
          // Not pinned — nothing to do.
        }
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.reject("UNLOCK_FAILED", e.message, e)
    }
  }
}
