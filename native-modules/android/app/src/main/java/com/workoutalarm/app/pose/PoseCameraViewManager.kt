package com.workoutalarm.app.pose

import android.content.Context
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
    val layout = PreviewContainer(reactContext)
    val previewView = PreviewView(reactContext).apply {
      // TextureView-backed: composes correctly under React Native's
      // overlays (border, pills, bottom strip) instead of punching through.
      implementationMode = PreviewView.ImplementationMode.COMPATIBLE
      scaleType = PreviewView.ScaleType.FILL_CENTER
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

  /**
   * React Native sizes this view but never measures native children added
   * by hand. Without this, PreviewView stays 0×0, never offers CameraX a
   * surface, and the whole session — preview AND pose analysis — stalls
   * ("Failed to get Surfaces" in logcat, black preview, no reps).
   */
  private class PreviewContainer(context: Context) : FrameLayout(context) {
    private val measureAndLayout = Runnable {
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
      )
      layout(left, top, right, bottom)
    }

    override fun requestLayout() {
      super.requestLayout()
      post(measureAndLayout)
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
      val w = r - l
      val h = b - t
      for (i in 0 until childCount) {
        getChildAt(i).apply {
          measure(
            MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY)
          )
          layout(0, 0, w, h)
        }
      }
    }
  }

  companion object {
    const val REACT_CLASS = "PoseCameraView"
  }
}
