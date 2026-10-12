/**
 * withWorkoutAlarmPackage — pose detection bridge + module registration.
 *
 * - Copies PoseModule.kt + WorkoutAlarmPackage.kt into android/.
 * - Gradle: CameraX + ML Kit Pose Detection dependencies.
 * - MainApplication: registers WorkoutAlarmPackage so the four native
 *   modules (Alarm, Ringing, Lockdown, Pose) resolve from JS.
 *
 * Kept as an explicit registration (not autolinking magic) so the wiring
 * is visible and auditable in one place.
 */
const {
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');
const { copyKotlinSources } = require('./lib');

const KOTLIN_FILES = [
  'com/workoutalarm/app/pose/PoseModule.kt',
  'com/workoutalarm/app/pose/WorkoutAlarmPackage.kt',
];

const GRADLE_DEPS = [
  // NOTE: 18.0.0 stable does not exist on Google Maven; 18.0.0-beta5 is the
  // current release line (verified against maven-metadata.xml).
  'implementation("com.google.mlkit:pose-detection:18.0.0-beta5")',
  'implementation("androidx.camera:camera-core:1.3.4")',
  'implementation("androidx.camera:camera-camera2:1.3.4")',
  'implementation("androidx.camera:camera-lifecycle:1.3.4")',
  // Explicit: CameraX's ProcessCameraProvider.getInstance() returns Guava's
  // ListenableFuture, which must be on the compile classpath (Kotlin fails
  // with "Cannot access class 'ListenableFuture'" without it).
  'implementation("com.google.guava:listenablefuture:1.0.0")',
];

const withWorkoutAlarmPackage = (config) => {
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const missing = GRADLE_DEPS.filter((dep) => !contents.includes(dep));
    if (missing.length > 0) {
      contents = contents.replace(
        /dependencies\s*\{/,
        (match) =>
          `${match}\n    // Workout Alarm: CameraX + ML Kit Pose Detection (PoseModule)\n` +
          missing.map((dep) => `    ${dep}`).join('\n'),
      );
      config.modResults.contents = contents;
    }
    return config;
  });

  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    const importLine = 'import com.workoutalarm.app.pose.WorkoutAlarmPackage';
    if (!contents.includes(importLine)) {
      // Insert after the last import.
      contents = contents.replace(
        /(^import .+$\n)(?![\s\S]*^import )/m,
        (match) => `${match}${importLine}\n`,
      );
    }
    // Expo 57 generates: PackageList(this).packages.apply { ... }
    const anchor = 'PackageList(this).packages.apply {';
    if (!contents.includes(anchor)) {
      console.warn(
        '[withWorkoutAlarmPackage] PackageList anchor not found; skipping registration',
      );
    } else if (!contents.includes('WorkoutAlarmPackage()')) {
      contents = contents.replace(
        anchor,
        `${anchor}\n          // Workout Alarm native modules (Alarm, Ringing, Lockdown, Pose).\n` +
          '          add(WorkoutAlarmPackage())',
      );
    }
    config.modResults.contents = contents;
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      copyKotlinSources(config.modRequest.projectRoot, KOTLIN_FILES);
      return config;
    },
  ]);

  return config;
};

module.exports = withWorkoutAlarmPackage;
