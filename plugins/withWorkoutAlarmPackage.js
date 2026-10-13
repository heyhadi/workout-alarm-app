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
  'implementation("androidx.camera:camera-core:1.6.2")',
  'implementation("androidx.camera:camera-camera2:1.6.2")',
  'implementation("androidx.camera:camera-lifecycle:1.6.2")',
  // Explicit full Guava: CameraX's ProcessCameraProvider.getInstance() returns
  // Guava's ListenableFuture, which must be on the compile classpath. We use
  // full Guava (not the standalone listenablefuture artifact) because the
  // standalone one collides at packaging time: Guava 27.0+ transitively pulls
  // listenablefuture:9999.0-empty-to-avoid-conflict-with-guava (an EMPTY jar
  // Gradle prefers by version number), and forcing the real 1.0 then causes
  // "Duplicate class" against Guava's own bundled copy.
  'implementation("com.google.guava:guava:33.7.2-android")',
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
    }
    // Exclude the standalone listenablefuture artifact entirely. Full Guava
    // (declared above) already bundles ListenableFuture; the standalone
    // module only causes trouble — either the EMPTY 9999.0 placeholder
    // (breaks compilation) or the real 1.0 (duplicate class at packaging).
    const excludeBlock = `configurations.all {
    exclude group: 'com.google.guava', module: 'listenablefuture'
}`;
    if (!contents.includes('module = "listenablefuture"')) {
      contents = contents.replace(
        /dependencies\s*\{/,
        (match) =>
          `// Workout Alarm: full Guava provides ListenableFuture; drop the standalone module.\n${excludeBlock}\n\n${match}`,
      );
    }
    config.modResults.contents = contents;
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
