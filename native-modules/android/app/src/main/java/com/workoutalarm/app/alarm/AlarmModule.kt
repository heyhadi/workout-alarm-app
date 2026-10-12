package com.workoutalarm.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * AlarmModule — exact alarm scheduling via AlarmManager.setAlarmClock().
 *
 * setAlarmClock is the strongest scheduling guarantee on Android: the system
 * shows an alarm-clock icon and fires even in Doze. The schedule is mirrored
 * to SharedPreferences so BootReceiver/TimeChangeReceiver can re-arm it
 * without the JS runtime.
 *
 * Bridge: scheduleAlarm(alarmId, triggerAtMillis, exercise, repTarget),
 * cancelAlarm(alarmId). Emits nothing — AlarmReceiver starts the ringing.
 */
class AlarmModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AlarmModule"

  @ReactMethod
  fun scheduleAlarm(
    alarmId: String,
    triggerAtMillis: Double,
    exercise: String,
    repTarget: Double,
    promise: Promise
  ) {
    try {
      val triggerAt = triggerAtMillis.toLong()
      val context = reactApplicationContext

      val intent = Intent(context, AlarmReceiver::class.java).apply {
        putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
        putExtra(AlarmReceiver.EXTRA_EXERCISE, exercise)
        putExtra(AlarmReceiver.EXTRA_REP_TARGET, repTarget.toInt())
      }
      val pendingIntent = PendingIntent.getBroadcast(
        context,
        alarmId.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      // showIntent = null: RingingService raises its own full-screen intent.
      alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt, null), pendingIntent)

      persistSchedule(alarmId, triggerAt, exercise, repTarget.toInt())
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SCHEDULE_FAILED", "Could not schedule exact alarm: ${e.message}", e)
    }
  }

  @ReactMethod
  fun cancelAlarm(alarmId: String, promise: Promise) {
    try {
      val context = reactApplicationContext
      val intent = Intent(context, AlarmReceiver::class.java)
      val pendingIntent = PendingIntent.getBroadcast(
        context,
        alarmId.hashCode(),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarmManager.cancel(pendingIntent)
      clearSchedule()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CANCEL_FAILED", "Could not cancel alarm: ${e.message}", e)
    }
  }

  private fun persistSchedule(alarmId: String, triggerAt: Long, exercise: String, repTarget: Int) {
    reactApplicationContext
      .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_ALARM_ID, alarmId)
      .putLong(KEY_TRIGGER_AT, triggerAt)
      .putString(KEY_EXERCISE, exercise)
      .putInt(KEY_REP_TARGET, repTarget)
      .apply()
  }

  private fun clearSchedule() {
    reactApplicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }

  companion object {
    const val PREFS = "workout_alarm_schedule"
    const val KEY_ALARM_ID = "alarm_id"
    const val KEY_TRIGGER_AT = "trigger_at"
    const val KEY_EXERCISE = "exercise"
    const val KEY_REP_TARGET = "rep_target"

    /** Read by BootReceiver/TimeChangeReceiver without the JS runtime. */
    fun readSchedule(context: Context): ScheduledAlarm? {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val alarmId = prefs.getString(KEY_ALARM_ID, null) ?: return null
      return ScheduledAlarm(
        alarmId = alarmId,
        triggerAt = prefs.getLong(KEY_TRIGGER_AT, 0L),
        exercise = prefs.getString(KEY_EXERCISE, "squats") ?: "squats",
        repTarget = prefs.getInt(KEY_REP_TARGET, 20)
      )
    }
  }
}

data class ScheduledAlarm(
  val alarmId: String,
  val triggerAt: Long,
  val exercise: String,
  val repTarget: Int
)
