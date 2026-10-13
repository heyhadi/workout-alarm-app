package com.workoutalarm.app.alarm

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
 * Released alarms were removed from AlarmStore, so they never ring again.
 */
class BootReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
      intent.action != "android.intent.action.QUICKBOOT_POWERON"
    ) {
      return
    }
    val now = System.currentTimeMillis()
    val (owed, upcoming) = AlarmStore.readAll(context).partition { it.triggerAt <= now }

    upcoming.forEach { AlarmStore.rearm(context, it) }

    // Missed while off — resume ringing now, workout still owed. One
    // service rings at a time: the most recent debt wins.
    owed.maxByOrNull { it.triggerAt }?.let { scheduled ->
      val serviceIntent = Intent(context, RingingService::class.java).apply {
        putExtra(AlarmReceiver.EXTRA_ALARM_ID, scheduled.alarmId)
        putExtra(AlarmReceiver.EXTRA_EXERCISE, scheduled.exercise)
        putExtra(AlarmReceiver.EXTRA_REP_TARGET, scheduled.repTarget)
        putExtra(AlarmReceiver.EXTRA_SOUND_URI, scheduled.soundUri)
      }
      ContextCompat.startForegroundService(context, serviceIntent)
    }
  }
}
