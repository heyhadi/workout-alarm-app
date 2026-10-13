package com.workoutalarm.app.pose

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.workoutalarm.app.alarm.AlarmModule
import com.workoutalarm.app.lockdown.LockdownModule
import com.workoutalarm.app.ringing.RingingModule
import com.workoutalarm.app.steps.StepModule

/**
 * Registers every Workout Alarm native module. Added to MainActivity's
 * package list by the withWorkoutAlarmPackage config plugin — never by
 * hand-editing android/ (see plugins/).
 */
class WorkoutAlarmPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(
      AlarmModule(reactContext),
      RingingModule(reactContext),
      LockdownModule(reactContext),
      PoseModule(reactContext),
      StepModule(reactContext)
    )

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = listOf(PoseCameraViewManager())
}
