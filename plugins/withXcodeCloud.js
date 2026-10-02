const { createRunOncePlugin, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const POST_CLONE_SOURCE = path.join('xcode-cloud', 'ci_post_clone.sh');
const CI_SCRIPTS_DIR = 'ci_scripts';

function workspaceContents(projectName) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Workspace',
    '   version = "1.0">',
    '   <FileRef',
    `      location = "group:${projectName}.xcodeproj">`,
    '   </FileRef>',
    '   <FileRef',
    '      location = "group:Pods/Pods.xcodeproj">',
    '   </FileRef>',
    '</Workspace>',
    '',
  ].join('\n');
}

function findXcodeProjectName(iosDir) {
  const project = fs.readdirSync(iosDir).find((name) => name.endsWith('.xcodeproj'));
  if (!project) {
    throw new Error(`[withXcodeCloud] No .xcodeproj found in ${iosDir}`);
  }
  return path.basename(project, '.xcodeproj');
}

/**
 * Xcode Cloud needs ci_scripts next to the workspace it builds, and the workspace
 * must exist in the clone before CocoaPods runs, so both are written at prebuild.
 */
function writeXcodeCloudFiles(projectRoot, iosDir) {
  const sourcePath = path.join(projectRoot, POST_CLONE_SOURCE);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`[withXcodeCloud] Missing ${POST_CLONE_SOURCE}`);
  }
  const scriptsDir = path.join(iosDir, CI_SCRIPTS_DIR);
  fs.mkdirSync(scriptsDir, { recursive: true });
  const scriptPath = path.join(scriptsDir, 'ci_post_clone.sh');
  fs.copyFileSync(sourcePath, scriptPath);
  fs.chmodSync(scriptPath, 0o755);

  const projectName = findXcodeProjectName(iosDir);
  const workspaceDir = path.join(iosDir, `${projectName}.xcworkspace`);
  fs.mkdirSync(workspaceDir, { recursive: true });
  const contentsPath = path.join(workspaceDir, 'contents.xcworkspacedata');
  if (!fs.existsSync(contentsPath)) {
    fs.writeFileSync(contentsPath, workspaceContents(projectName));
  }
  return { scriptPath, workspaceDir };
}

function withXcodeCloud(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      writeXcodeCloudFiles(cfg.modRequest.projectRoot, cfg.modRequest.platformProjectRoot);
      return cfg;
    },
  ]);
}

const plugin = createRunOncePlugin(withXcodeCloud, 'with-xcode-cloud', '1.0.0');

module.exports = plugin;
module.exports.writeXcodeCloudFiles = writeXcodeCloudFiles;
module.exports.workspaceContents = workspaceContents;
