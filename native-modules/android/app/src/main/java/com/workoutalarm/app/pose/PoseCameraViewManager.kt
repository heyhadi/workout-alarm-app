package com.workoutalarm.app.pose

import android.widget.FrameLayout
import androidx.camera.view.PreviewView
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

/**
 * Native camera preview for the ringing screen.
 *
 * The preview surface is handed to PoseModule (static) so a SINGLE CameraX
 * session binds Preview + ImageAnalysis together. Two separate camera
 * clients (e.g. expo-camera's CameraView + our analyzer) fight over the
 * exclusive camera resource and the analysis starves — this is why reps
 * never counted while a preview was on screen.
 */
class PoseCameraViewManager : SimpleViewManager<FrameLayout>() {

  override fun getName() = REACT_CLASS

  override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
    val layout = FrameLayout(reactContext)
    val previewView = PreviewView(reactContext).apply {
      // Fill the parent; CameraX handles the transform.
      layoutParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    }
    layout.addView(previewView)
    PoseModule.attachPreviewView(previewView)
    return layout
  }

  override fun onDropViewInstance(view: FrameLayout) {
    super.onDropViewInstance(view)
    PoseModule.detachPreviewView()
  }

  companion object {
    const val REACT_CLASS = "PoseCameraView"
  }
}
