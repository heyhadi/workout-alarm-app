import { requireNativeComponent, type ViewProps } from 'react-native';

/**
 * Native CameraX preview surface, driven by PoseModule.
 *
 * The preview and the pose analyzer share ONE CameraX session inside the
 * native module — this is what makes rep counting actually work. Do NOT
 * render expo-camera's CameraView alongside it: two camera clients fight
 * over the exclusive camera resource and the analysis starves.
 */
export const PoseCameraView = requireNativeComponent<ViewProps>('PoseCameraView');
