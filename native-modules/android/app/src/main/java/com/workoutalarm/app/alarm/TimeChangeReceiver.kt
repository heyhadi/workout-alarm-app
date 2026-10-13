package com.workoutalarm.app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.workoutalarm.app.ringing.RingingService

/**
 * TIME_SET / TIMEZONE_CHANGED: the user (or network) changed the clock.
 * Jumping the clock forward must not mark an alarm done — re-arm every
 * persisted alarm. One whose trigger is now in the past fires immediately,
 * which resumes ringing: the workout is still owed. Released alarms are
 * no longer in AlarmStore, so a clock change never re-rings them.
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
    val ringingId = RingingService.currentRinging?.alarmId
    AlarmStore.readAll(context)
      // Already ringing: re-firing would only restart the same alarm.
      .filter { it.alarmId != ringingId }
      .forEach { AlarmStore.rearm(context, it) }
  }
}
