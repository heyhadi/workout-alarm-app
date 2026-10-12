package com.workoutalarm.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.workoutalarm.app.ringing.RingingService

/**
 * BOOT_COMPLETED: the phone restarted (or died and was recharged).
 * An unfinished alarm is a debt that does not expire with the battery:
 *  - trigger time already passed  → resume ringing immediately,
 *  - trigger time still ahead     → re-arm the exact alarm.
 */
class BootReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
      intent.action != "android.intent.action.QUICKBOOT_POWERON"
    ) {
      return
    }
    val scheduled = AlarmModule.readSchedule(context) ?: return
    val now = System.currentTimeMillis()

    if (scheduled.triggerAt <= now) {
      // Missed while off — resume ringing now, workout still owed.
      val serviceIntent = Intent(context, RingingService::class.java).apply {
        putExtra(AlarmReceiver.EXTRA_ALARM_ID, scheduled.alarmId)
        putExtra(AlarmReceiver.EXTRA_EXERCISE, scheduled.exercise)
        putExtra(AlarmReceiver.EXTRA_REP_TARGET, scheduled.repTarget)
      }
      ContextCompat.startForegroundService(context, serviceIntent)
    } else {
      rearm(context, scheduled)
    }
  }

  private fun rearm(context: Context, scheduled: ScheduledAlarm) {
    val intent = Intent(context, AlarmReceiver::class.java).apply {
      putExtra(AlarmReceiver.EXTRA_ALARM_ID, scheduled.alarmId)
      putExtra(AlarmReceiver.EXTRA_EXERCISE, scheduled.exercise)
      putExtra(AlarmReceiver.EXTRA_REP_TARGET, scheduled.repTarget)
    }
    val pendingIntent = PendingIntent.getBroadcast(
      context,
      scheduled.alarmId.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.setAlarmClock(
      AlarmManager.AlarmClockInfo(scheduled.triggerAt, null),
      pendingIntent
    )
  }
}
