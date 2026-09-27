const {
  withDangerousMod,
  IOSConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Scaffold plugin: copies `targets/CAImKeyboardExtension` into the generated
 * `ios/CAImKeyboardExtension` folder during prebuild.
 *
 * Note: Adding the Xcode target to the pbxproj still requires Xcode (or a
 * follow-up plugin). This ensures the Swift sources are present next to the
 * Expo iOS project after `npx expo prebuild`.
 */
function withCAImKeyboardExtension(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const src = path.join(projectRoot, 'targets', 'CAImKeyboardExtension');
      const dest = path.join(cfg.modRequest.platformProjectRoot, 'CAImKeyboardExtension');

      if (!fs.existsSync(src)) {
        console.warn('[withCAImKeyboardExtension] source folder missing:', src);
        return cfg;
      }

      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        if (entry === 'README.md') {
          continue;
        }
        fs.copyFileSync(path.join(src, entry), path.join(dest, entry));
      }

      const hint = path.join(dest, 'INTEGRATION.txt');
      fs.writeFileSync(
        hint,
        [
          'CAIm Keyboard Extension sources were copied by withCAImKeyboardExtension.',
          'In Xcode: add a Custom Keyboard Extension target and include these files.',
          'Add the local Swift package at ../Packages/CAImKeyboardCore to that target.',
          'The extension imports CAImKeyboardCore for layout, editing, PIN rules, and Grok parsing.',
          'Enable App Group: group.com.caim.keyboard',
          'Info.plist already sets RequestsOpenAccess = true.',
          '',
        ].join('\n'),
      );

      // Keep bundle id hint aligned with Expo iOS config when present.
      const bundleId = IOSConfig.BundleIdentifier.getBundleIdentifier(cfg);
      if (bundleId) {
        fs.writeFileSync(
          path.join(dest, 'HOST_BUNDLE_ID.txt'),
          `${bundleId}\nSuggested extension id: ${bundleId}.CAImKeyboardExtension\n`,
        );
      }

      return cfg;
    },
  ]);
}

module.exports = withCAImKeyboardExtension;
