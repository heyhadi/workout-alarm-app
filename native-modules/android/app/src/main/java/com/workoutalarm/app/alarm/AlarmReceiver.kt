package com.workoutalarm.app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.workoutalarm.app.ringing.RingingService

/**
 * Fires when an exact alarm goes off. Starts the foreground ringing service
 * immediately — no JS involved, so it works with the app killed.
 */
class AlarmReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
    val serviceIntent = Intent(context, RingingService::class.java).apply {
      putExtra(EXTRA_ALARM_ID, alarmId)
      putExtra(EXTRA_EXERCISE, intent.getStringExtra(EXTRA_EXERCISE) ?: "squats")
      putExtra(EXTRA_REP_TARGET, intent.getIntExtra(EXTRA_REP_TARGET, 20))
    }
    // Foreground-service start: allowed from a receiver for alarm clocks.
    ContextCompat.startForegroundService(context, serviceIntent)
  }

  companion object {
    const val EXTRA_ALARM_ID = "com.workoutalarm.app.ALARM_ID"
    const val EXTRA_EXERCISE = "com.workoutalarm.app.EXERCISE"
    const val EXTRA_REP_TARGET = "com.workoutalarm.app.REP_TARGET"
  }
}
