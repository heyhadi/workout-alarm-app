package com.workoutalarm.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * TIME_SET / TIMEZONE_CHANGED: the user (or network) changed the clock.
 * Jumping the clock forward must not mark the alarm done — re-arm from the
 * persisted schedule. If the stored trigger is now in the past, AlarmManager
 * fires it immediately, which resumes ringing: the workout is still owed.
 *
 * Milestone 1 note: re-arms against the stored wall-clock trigger. Full
 * elapsed-realtime tracking (RTC vs wall clock reconciliation) is a
 * hardening task for the strict-lockdown milestone.
 */
class TimeChangeReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_TIME_CHANGED &&
      intent.action != Intent.ACTION_TIMEZONE_CHANGED
    ) {
      return
    }
    val scheduled = AlarmModule.readSchedule(context) ?: return
    val fireIntent = Intent(context, AlarmReceiver::class.java).apply {
      putExtra(AlarmReceiver.EXTRA_ALARM_ID, scheduled.alarmId)
      putExtra(AlarmReceiver.EXTRA_EXERCISE, scheduled.exercise)
      putExtra(AlarmReceiver.EXTRA_REP_TARGET, scheduled.repTarget)
    }
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      scheduled.alarmId.hashCode(),
      fireIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.setAlarmClock(
      AlarmManager.AlarmClockInfo(scheduled.triggerAt, null),
      pendingIntent
    )
  }
}
