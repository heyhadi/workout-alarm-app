package com.workoutalarm.app.steps

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * StepModule — the backup when the camera can't count reps (permission
 * denied, camera failed, nobody in frame for too long). Walking or marching
 * in place is counted by the phone's hardware step counter; the alarm
 * still demands movement, just not on camera.
 *
 * Emits `onStepCounted` { total } — steps since startStepCounting().
 * Needs ACTIVITY_RECOGNITION at runtime (Android 10+); JS asks first.
 */
class StepModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), SensorEventListener {

  override fun getName() = "StepModule"

  private val sensorManager =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager

  // TYPE_STEP_COUNTER reports steps since boot; count from the first reading.
  private var baseline = -1f

  @ReactMethod
  fun isStepCountingAvailable(promise: Promise) {
    promise.resolve(sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null)
  }

  @ReactMethod
  fun startStepCounting(promise: Promise) {
    val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    if (sensor == null) {
      promise.reject("NO_SENSOR", "This phone has no step counter")
      return
    }
    sensorManager.unregisterListener(this)
    baseline = -1f
    if (sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI)) {
      promise.resolve(null)
    } else {
      promise.reject("REGISTER_FAILED", "Could not start the step counter")
    }
  }

  @ReactMethod
  fun stopStepCounting(promise: Promise) {
    sensorManager.unregisterListener(this)
    promise.resolve(null)
  }

  override fun onSensorChanged(event: SensorEvent) {
    val sinceBoot = event.values.firstOrNull() ?: return
    if (baseline < 0f) baseline = sinceBoot
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onStepCounted", Arguments.createMap().apply {
        putInt("total", (sinceBoot - baseline).toInt())
      })
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  // Required by NativeEventEmitter; events go through RCTDeviceEventEmitter.
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Double) = Unit

  override fun invalidate() {
    sensorManager.unregisterListener(this)
    super.invalidate()
  }
}
