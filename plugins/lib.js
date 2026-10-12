/**
 * Shared helpers for the Workout Alarm config plugins.
 *
 * Canonical Kotlin sources live in `native-modules/android/` (git-tracked).
 * Each plugin copies the files it owns into the prebuilt `android/` tree,
 * so `npx expo prebuild --clean` regenerates everything from the repo —
 * native work is never lost and android/ stays a build artifact.
 */
const fs = require('fs');
const path = require('path');

const KOTLIN_SRC = path.join('native-modules', 'android', 'app', 'src', 'main', 'java');
const KOTLIN_DEST = path.join('app', 'src', 'main', 'java');

/**
 * Copy Kotlin files (relative to the java/ root) from the repo into the
 * prebuilt android/ directory. Idempotent — overwrites on re-run.
 *
 * Note: withDangerousMod does not provide the android path via modResults,
 * so it is derived from the project root (prebuild always generates
 * <projectRoot>/android).
 */
function copyKotlinSources(projectRoot, files) {
  const androidDir = path.join(projectRoot, 'android');
  for (const file of files) {
    const src = path.join(projectRoot, KOTLIN_SRC, file);
    const dest = path.join(androidDir, KOTLIN_DEST, file);
    if (!fs.existsSync(src)) {
      throw new Error(`[workout-alarm] Kotlin source missing: ${src}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/** Add <uses-permission> entries to AndroidManifest.xml (no duplicates). */
function addUsesPermissions(manifest, permissions) {
  const root = manifest.manifest;
  root['uses-permission'] = root['uses-permission'] || [];
  const existing = new Set(root['uses-permission'].map((p) => p.$['android:name']));
  for (const name of permissions) {
    if (!existing.has(name)) {
      root['uses-permission'].push({ $: { 'android:name': name } });
      existing.add(name);
    }
  }
  return manifest;
}

function mainApplication(manifest) {
  const apps = manifest.manifest.application;
  if (!apps || apps.length === 0) {
    throw new Error('[workout-alarm] No <application> in AndroidManifest.xml');
  }
  return apps[0];
}

/** Add a <service> / <receiver> entry (no duplicates by android:name). */
function addApplicationComponent(manifest, tag, entry) {
  const app = mainApplication(manifest);
  app[tag] = app[tag] || [];
  const name = entry.$['android:name'];
  const exists = app[tag].some((e) => e.$['android:name'] === name);
  if (!exists) {
    app[tag].push(entry);
  }
  return manifest;
}

module.exports = {
  copyKotlinSources,
  addUsesPermissions,
  addApplicationComponent,
};
