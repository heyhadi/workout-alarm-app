package com.workoutalarm.app.ringing

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import com.workoutalarm.app.MainActivity
import com.workoutalarm.app.alarm.AlarmReceiver

/**
 * Foreground service that OWNS the ringing state. Sound loops on the alarm
 * audio stream, volume is re-asserted if the user dives for the buttons,
 * vibration runs alongside, and a full-screen intent raises MainActivity
 * over the lock screen into the /ringing route.
 *
 * The ONLY exit is RingingModule.releaseAlarm() after verified reps —
 * there is no stop path anywhere else in this file.
 */
class RingingService : Service() {

  private var mediaPlayer: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private val watchdog = Handler(Looper.getMainLooper())
  private var alarmVolume = -1
  // Chosen sound for the current alarm; null = the phone's default alarm.
  private var soundUri: Uri? = null

  private val watchdogTask = object : Runnable {
    override fun run() {
      // Keep the sound alive: if anything killed the player, restart it.
      // (Full activity-relaunch watchdog is a hardening task — the service
      // itself is sticky and the notification is ongoing.)
      try {
        if (mediaPlayer?.isPlaying != true) startSound()
        reassertVolume()
      } catch (_: Exception) { }
      watchdog.postDelayed(this, WATCHDOG_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      shutdown()
      return START_NOT_STICKY
    }
    val alarmId = intent?.getStringExtra(AlarmReceiver.EXTRA_ALARM_ID) ?: "unknown"
    val exercise = intent?.getStringExtra(AlarmReceiver.EXTRA_EXERCISE) ?: "squats"
    val repTarget = intent?.getIntExtra(AlarmReceiver.EXTRA_REP_TARGET, 20) ?: 20

    soundUri = intent?.getStringExtra(AlarmReceiver.EXTRA_SOUND_URI)?.let(Uri::parse)
    currentRinging = RingingInfo(alarmId, exercise, repTarget)
    startForeground(NOTIFICATION_ID, buildNotification(alarmId, exercise, repTarget))
    startSound()
    startVibration()
    watchdog.removeCallbacks(watchdogTask)
    watchdog.post(watchdogTask)
    return START_STICKY
  }

  private fun createChannel() {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Workout Alarm",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Unskippable workout alarm"
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(alarmId: String, exercise: String, repTarget: Int): Notification {
    // Full-screen intent: MainActivity opens over the lock screen.
    val ringingIntent = Intent(this, MainActivity::class.java).apply {
      action = ACTION_RINGING
      putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
      putExtra(AlarmReceiver.EXTRA_EXERCISE, exercise)
      putExtra(AlarmReceiver.EXTRA_REP_TARGET, repTarget)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val fullScreenPending = PendingIntent.getActivity(
      this, 0, ringingIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Workout Alarm")
      .setContentText("Finish your reps to release.")
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreenPending, true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .build()
  }

  private fun startSound() {
    try {
      mediaPlayer?.release()
      val audioManager = getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
      if (alarmVolume < 0) {
        alarmVolume = audioManager.getStreamVolume(android.media.AudioManager.STREAM_ALARM)
      }
      mediaPlayer = try {
        createPlayer(soundUri ?: defaultAlarmUri())
      } catch (_: Exception) {
        // Chosen sound gone (deleted file, revoked access): never ring silent.
        createPlayer(defaultAlarmUri())
      }
      reassertVolume()
    } catch (_: Exception) { }
  }

  private fun defaultAlarmUri(): Uri =
    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

  private fun createPlayer(uri: Uri): MediaPlayer {
    val player = MediaPlayer()
    try {
      player.setDataSource(this, uri)
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      player.isLooping = true
      player.prepare()
      player.start()
      return player
    } catch (e: Exception) {
      player.release()
      throw e
    }
  }

  private fun reassertVolume() {
    try {
      val audioManager = getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
      val max = audioManager.getStreamMaxVolume(android.media.AudioManager.STREAM_ALARM)
      val want = if (alarmVolume > 0) alarmVolume else max
      if (audioManager.getStreamVolume(android.media.AudioManager.STREAM_ALARM) != want) {
        audioManager.setStreamVolume(android.media.AudioManager.STREAM_ALARM, want, 0)
      }
    } catch (_: Exception) { }
  }

  private fun startVibration() {
    try {
      vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
      } else {
        @Suppress("DEPRECATION")
        getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
      }
      val pattern = longArrayOf(0, 800, 400, 800)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
      } else {
        @Suppress("DEPRECATION")
        vibrator?.vibrate(pattern, 0)
      }
    } catch (_: Exception) { }
  }

  private fun shutdown() {
    watchdog.removeCallbacks(watchdogTask)
    currentRinging = null
    try {
      mediaPlayer?.stop()
      mediaPlayer?.release()
    } catch (_: Exception) { }
    mediaPlayer = null
    try { vibrator?.cancel() } catch (_: Exception) { }
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    shutdown()
    super.onDestroy()
  }

  companion object {
    const val ACTION_RINGING = "com.workoutalarm.app.RINGING"
    const val ACTION_STOP = "com.workoutalarm.app.STOP_RINGING"
    private const val CHANNEL_ID = "workout_alarm_ringing"
    private const val NOTIFICATION_ID = 7101
    private const val WATCHDOG_MS = 5000L

    /** What the service is currently ringing for, null when idle. */
    @Volatile
    var currentRinging: RingingInfo? = null
  }
}

/** Alarm payload the service is currently ringing for. */
data class RingingInfo(
  val alarmId: String,
  val exercise: String,
  val repTarget: Int,
)
