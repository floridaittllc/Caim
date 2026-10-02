const fs = require('fs');
const os = require('os');
const path = require('path');

const { writeXcodeCloudFiles } = require('../plugins/withXcodeCloud');

const REPO_ROOT = path.join(__dirname, '..');

function makeIosDir() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'caim-xcode-cloud-'));
  const iosDir = path.join(temp, 'ios');
  fs.mkdirSync(path.join(iosDir, 'CAIm.xcodeproj'), { recursive: true });
  return { temp, iosDir };
}

describe('withXcodeCloud', () => {
  it('writes an executable post-clone script that installs deps and pods', () => {
    const { temp, iosDir } = makeIosDir();
    const { scriptPath } = writeXcodeCloudFiles(REPO_ROOT, iosDir);

    expect(scriptPath).toBe(path.join(iosDir, 'ci_scripts', 'ci_post_clone.sh'));
    expect(fs.statSync(scriptPath).mode & 0o111).toBeTruthy();
    const script = fs.readFileSync(scriptPath, 'utf8');
    expect(script.startsWith('#!/bin/sh')).toBe(true);
    expect(script).toContain('set -e');
    expect(script).toContain('cd "$CI_PRIMARY_REPOSITORY_PATH"');
    expect(script).toContain('npm ci');
    expect(script).toContain('pod install');
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it('creates the CocoaPods workspace for the generated project', () => {
    const { temp, iosDir } = makeIosDir();
    writeXcodeCloudFiles(REPO_ROOT, iosDir);
    const contents = fs.readFileSync(
      path.join(iosDir, 'CAIm.xcworkspace', 'contents.xcworkspacedata'),
      'utf8',
    );
    expect(contents).toContain('location = "group:CAIm.xcodeproj"');
    expect(contents).toContain('location = "group:Pods/Pods.xcodeproj"');
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it('is safe to run on every prebuild', () => {
    const { temp, iosDir } = makeIosDir();
    writeXcodeCloudFiles(REPO_ROOT, iosDir);
    const contentsPath = path.join(iosDir, 'CAIm.xcworkspace', 'contents.xcworkspacedata');
    const first = fs.readFileSync(contentsPath, 'utf8');
    writeXcodeCloudFiles(REPO_ROOT, iosDir);
    expect(fs.readFileSync(contentsPath, 'utf8')).toBe(first);
    expect(fs.readdirSync(path.join(iosDir, 'ci_scripts'))).toEqual(['ci_post_clone.sh']);
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it('keeps the committed ios/ci_scripts copy in sync with the source script', () => {
    const committed = path.join(REPO_ROOT, 'ios', 'ci_scripts', 'ci_post_clone.sh');
    expect(fs.readFileSync(committed, 'utf8')).toBe(
      fs.readFileSync(path.join(REPO_ROOT, 'xcode-cloud', 'ci_post_clone.sh'), 'utf8'),
    );
  });
});
