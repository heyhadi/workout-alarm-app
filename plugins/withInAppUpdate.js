/**
 * withInAppUpdate — install newer builds from the repo's GitHub Releases.
 *
 * - Manifest: REQUEST_INSTALL_PACKAGES + INTERNET, and a FileProvider
 *   (UpdateFileProvider) that shares the downloaded APK with the system
 *   installer.
 * - res/xml/update_paths.xml: exposes only cache/updates/.
 * - Copies UpdateModule.kt into android/ (registered in WorkoutAlarmPackage).
 */
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const {
  addApplicationComponent,
  addUsesPermissions,
  copyKotlinSources,
} = require('./lib');

const KOTLIN_FILES = ['com/workoutalarm/app/update/UpdateModule.kt'];

const UPDATE_PATHS_XML = `<?xml version="1.0" encoding="utf-8"?>
<paths>
  <cache-path name="updates" path="updates/" />
</paths>
`;

const withInAppUpdate = (config) => {
  config = withAndroidManifest(config, (config) => {
    addUsesPermissions(config.modResults, [
      'android.permission.REQUEST_INSTALL_PACKAGES',
      'android.permission.INTERNET',
    ]);
    addApplicationComponent(config.modResults, 'provider', {
      $: {
        'android:name': 'com.workoutalarm.app.update.UpdateFileProvider',
        'android:authorities': '${applicationId}.updates',
        'android:exported': 'false',
        'android:grantUriPermissions': 'true',
      },
      'meta-data': [
        {
          $: {
            'android:name': 'android.support.FILE_PROVIDER_PATHS',
            'android:resource': '@xml/update_paths',
          },
        },
      ],
    });
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.projectRoot;
      copyKotlinSources(root, KOTLIN_FILES);
      const xmlDir = path.join(root, 'android', 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'update_paths.xml'), UPDATE_PATHS_XML);
      return config;
    },
  ]);

  return config;
};

module.exports = withInAppUpdate;
