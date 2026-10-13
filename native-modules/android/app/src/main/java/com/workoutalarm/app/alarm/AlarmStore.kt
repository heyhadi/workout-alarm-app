package com.workoutalarm.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/**
 * Every armed alarm, one entry per id, mirrored to SharedPreferences so
 * BootReceiver/TimeChangeReceiver can re-arm all of them without JS.
 *
 * An entry lives from scheduling until the workout is released (or the
 * alarm is cancelled). A fired-but-unfinished alarm stays here as a debt:
 * a reboot mid-ring resumes ringing. Released alarms are removed, so they
 * never ring twice; JS then arms the next occurrence of a repeating alarm.
 */
object AlarmStore {
  private const val PREFS = "workout_alarm_schedule"
  private const val KEY_PREFIX = "alarm."

  // Pre-fix single-slot keys: migrated on first read so an alarm armed
  // before this upgrade isn't lost.
  private const val LEGACY_ALARM_ID = "alarm_id"
  private const val LEGACY_TRIGGER_AT = "trigger_at"
  private const val LEGACY_EXERCISE = "exercise"
  private const val LEGACY_REP_TARGET = "rep_target"

  /** Arm the exact alarm and persist it. Replaces any entry with this id. */
  fun arm(context: Context, alarm: ScheduledAlarm) {
    setAlarmClock(context, alarm)
    prefs(context).edit().putString(KEY_PREFIX + alarm.alarmId, toJson(alarm)).apply()
  }

  /** Re-arm from a persisted entry (boot / clock change); storage unchanged. */
  fun rearm(context: Context, alarm: ScheduledAlarm) = setAlarmClock(context, alarm)

  /** Cancel the pending exact alarm and forget it (user disabled/deleted). */
  fun disarm(context: Context, alarmId: String) {
    alarmManager(context).cancel(pendingIntent(context, alarmId, null))
    remove(context, alarmId)
  }

  /** Forget an alarm whose workout was released — it must not ring again. */
  fun remove(context: Context, alarmId: String) {
    prefs(context).edit().remove(KEY_PREFIX + alarmId).apply()
  }

  fun readAll(context: Context): List<ScheduledAlarm> {
    migrateLegacy(context)
    return prefs(context).all.mapNotNull { (key, value) ->
      if (!key.startsWith(KEY_PREFIX) || value !is String) return@mapNotNull null
      try {
        fromJson(key.removePrefix(KEY_PREFIX), value)
      } catch (_: Exception) {
        null
      }
    }
  }

  private fun setAlarmClock(context: Context, alarm: ScheduledAlarm) {
    // showIntent = null: RingingService raises its own full-screen intent.
    alarmManager(context).setAlarmClock(
      AlarmManager.AlarmClockInfo(alarm.triggerAt, null),
      pendingIntent(context, alarm.alarmId, alarm)
    )
  }

  /**
   * One PendingIntent identity per alarm id (request code = id hash; extras
   * don't take part in matching), so arm/disarm always address the same one.
   */
  private fun pendingIntent(context: Context, alarmId: String, alarm: ScheduledAlarm?): PendingIntent {
    val intent = Intent(context, AlarmReceiver::class.java)
    if (alarm != null) {
      intent.putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarm.alarmId)
      intent.putExtra(AlarmReceiver.EXTRA_EXERCISE, alarm.exercise)
      intent.putExtra(AlarmReceiver.EXTRA_REP_TARGET, alarm.repTarget)
    }
    return PendingIntent.getBroadcast(
      context,
      alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun migrateLegacy(context: Context) {
    val p = prefs(context)
    val legacyId = p.getString(LEGACY_ALARM_ID, null) ?: return
    val alarm = ScheduledAlarm(
      alarmId = legacyId,
      triggerAt = p.getLong(LEGACY_TRIGGER_AT, 0L),
      exercise = p.getString(LEGACY_EXERCISE, "squats") ?: "squats",
      repTarget = p.getInt(LEGACY_REP_TARGET, 20)
    )
    p.edit()
      .remove(LEGACY_ALARM_ID)
      .remove(LEGACY_TRIGGER_AT)
      .remove(LEGACY_EXERCISE)
      .remove(LEGACY_REP_TARGET)
      .putString(KEY_PREFIX + legacyId, toJson(alarm))
      .apply()
  }

  private fun toJson(alarm: ScheduledAlarm): String = JSONObject()
    .put("triggerAt", alarm.triggerAt)
    .put("exercise", alarm.exercise)
    .put("repTarget", alarm.repTarget)
    .toString()

  private fun fromJson(alarmId: String, json: String): ScheduledAlarm {
    val o = JSONObject(json)
    return ScheduledAlarm(
      alarmId = alarmId,
      triggerAt = o.getLong("triggerAt"),
      exercise = o.optString("exercise", "squats"),
      repTarget = o.optInt("repTarget", 20)
    )
  }

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun alarmManager(context: Context) =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
}

data class ScheduledAlarm(
  val alarmId: String,
  val triggerAt: Long,
  val exercise: String,
  val repTarget: Int
)
