const fs = require('fs');
const os = require('os');
const path = require('path');
const xcode = require('xcode');
const plist = require('plist');
const { IOSConfig } = require('@expo/config-plugins');

const {
  APP_GROUP_ID,
  EXTENSION_TARGET_NAME,
  copyKeyboardSources,
  extensionBundleIdentifier,
  findCorePackages,
  injectKeyboardExtension,
  mergeAppGroupEntitlement,
  readSwiftPackageProducts,
} = require('../plugins/withCaimKeyboard');

const FIXTURE = path.join(__dirname, 'fixtures', 'HostApp.pbxproj');
const REAL_SOURCES = path.join(__dirname, '..', 'targets', 'CAImKeyboardExtension');

function loadProject() {
  const project = xcode.project(FIXTURE);
  project.parseSync();
  return project;
}

function nativeTargets(project) {
  const section = project.pbxNativeTargetSection();
  return Object.keys(section)
    .filter((key) => !key.endsWith('_comment'))
    .map((key) => ({ uuid: key, target: section[key] }));
}

function extensionTarget(project) {
  return nativeTargets(project).find(
    (entry) => String(entry.target.name).replace(/"/g, '') === EXTENSION_TARGET_NAME,
  );
}

function linkedProducts(project) {
  const extension = extensionTarget(project);
  const frameworks = project.hash.project.objects.PBXFrameworksBuildPhase;
  const phaseRef = extension.target.buildPhases.find((phase) => frameworks[phase.value]);
  const buildFiles = project.hash.project.objects.PBXBuildFile;
  return (frameworks[phaseRef.value].files || [])
    .map((entry) => buildFiles[entry.value])
    .filter((file) => file && file.productRef)
    .map((file) => file.productRef_comment);
}

function phaseFiles(project, phaseUuid) {
  const phases = {
    ...project.hash.project.objects.PBXSourcesBuildPhase,
    ...project.hash.project.objects.PBXCopyFilesBuildPhase,
    ...project.hash.project.objects.PBXResourcesBuildPhase,
  };
  return phases[phaseUuid].files || [];
}

describe('withCaimKeyboard project transform', () => {
  it('adds the keyboard extension target, appex embed, and Swift sources', () => {
    const project = loadProject();
    const hostSourcesBefore = project.getFirstTarget().firstTarget.buildPhases.length;

    injectKeyboardExtension(project, {
      bundleIdentifier: 'com.caim.keyboard',
      swiftFileNames: ['GrokClient.swift', 'KeyboardView.swift', 'KeyboardViewController.swift'],
    });

    const serialized = project.writeSync();
    const reread = xcode.project('/tmp/unused-caim.pbxproj');
    reread.hash = require('xcode/lib/parser/pbxproj').parse(serialized);

    const extension = extensionTarget(reread);
    expect(extension).toBeTruthy();
    expect(extension.target.productType).toBe('"com.apple.product-type.app-extension"');

    const configs = reread.pbxXCBuildConfigurationSection();
    const extensionConfigs = Object.values(configs).filter(
      (entry) =>
        entry &&
        entry.buildSettings &&
        entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER ===
          `"${extensionBundleIdentifier('com.caim.keyboard')}"`,
    );
    expect(extensionConfigs).toHaveLength(2);
    for (const config of extensionConfigs) {
      expect(config.buildSettings.INFOPLIST_FILE).toBe(
        `"${EXTENSION_TARGET_NAME}/Info.plist"`,
      );
      expect(config.buildSettings.CODE_SIGN_ENTITLEMENTS).toBe(
        `"${EXTENSION_TARGET_NAME}/CAImKeyboardExtension.entitlements"`,
      );
      expect(config.buildSettings.APPLICATION_EXTENSION_API_ONLY).toBe('YES');
      expect(String(config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET)).toBe('16.4');
    }

    const sourcePhaseId = extension.target.buildPhases.find((phase) => phase.comment === 'Sources')
      .value;
    const sourceComments = phaseFiles(reread, sourcePhaseId).map((file) => file.comment);
    expect(sourceComments).toEqual(
      expect.arrayContaining([
        'KeyboardViewController.swift in Sources',
        'KeyboardView.swift in Sources',
        'GrokClient.swift in Sources',
      ]),
    );

    const host = reread.getFirstTarget();
    expect(host.firstTarget.buildPhases.length).toBe(hostSourcesBefore + 1);
    const copyPhaseRef = host.firstTarget.buildPhases.find(
      (phase) => phase.comment === 'Embed Foundation Extensions',
    );
    expect(copyPhaseRef).toBeTruthy();
    const phaseOrder = host.firstTarget.buildPhases.map((phase) => phase.comment);
    expect(phaseOrder.indexOf('Embed Foundation Extensions')).toBe(
      phaseOrder.indexOf('Resources') + 1,
    );
    const copyPhase = reread.hash.project.objects.PBXCopyFilesBuildPhase[copyPhaseRef.value];
    expect(Number(copyPhase.dstSubfolderSpec)).toBe(13);
    const embedded = (copyPhase.files || []).map((file) => file.comment).join(' ');
    expect(embedded).toContain(`${EXTENSION_TARGET_NAME}.appex`);
    expect(host.firstTarget.dependencies.length).toBeGreaterThan(0);
    expect(serialized).toContain('com.apple.product-type.app-extension');
    expect(serialized).not.toMatch(/\bundefined\b/);
  });

  it('does not add a second extension target when run twice', () => {
    const project = loadProject();
    const options = {
      bundleIdentifier: 'com.caim.keyboard',
      swiftFileNames: ['KeyboardViewController.swift'],
    };
    injectKeyboardExtension(project, options);
    injectKeyboardExtension(project, options);
    const matches = nativeTargets(project).filter(
      (entry) => String(entry.target.name).replace(/"/g, '') === EXTENSION_TARGET_NAME,
    );
    expect(matches).toHaveLength(1);
  });

  it('links a local Swift package product onto the extension target', () => {
    const project = loadProject();
    injectKeyboardExtension(project, {
      bundleIdentifier: 'com.caim.keyboard',
      swiftFileNames: ['KeyboardViewController.swift', 'CaimCoreLinkage.swift'],
      corePackages: [
        {
          relativePathFromIos: '../Packages/CaimKeyboardCore',
          products: ['CaimKeyboardCore'],
        },
      ],
    });
    const serialized = project.writeSync();
    expect(serialized).toContain('XCLocalSwiftPackageReference');
    expect(serialized).toContain('../Packages/CaimKeyboardCore');
    expect(serialized).toContain('XCSwiftPackageProductDependency');
    expect(serialized).toContain('CaimKeyboardCore');
    const parsed = require('xcode/lib/parser/pbxproj').parse(serialized);
    expect(parsed.project.objects.XCSwiftPackageProductDependency).toBeTruthy();
    expect(linkedProducts(project)).toEqual(['CaimKeyboardCore']);
  });

  it('re-running on an existing project keeps one package link and one embed phase', () => {
    const project = loadProject();
    const options = {
      bundleIdentifier: 'com.caim.keyboard',
      swiftFileNames: ['KeyboardViewController.swift', 'CaimCoreLinkage.swift'],
      corePackages: [
        { relativePathFromIos: '../Packages/CAImKeyboardCore', products: ['CAImKeyboardCore'] },
      ],
      marketingVersion: '0.2.0',
      buildNumber: '1',
    };
    injectKeyboardExtension(project, options);
    const first = project.writeSync();

    const reread = xcode.project('/tmp/unused-caim.pbxproj');
    reread.hash = require('xcode/lib/parser/pbxproj').parse(first);
    injectKeyboardExtension(reread, options);
    injectKeyboardExtension(reread, options);

    expect(reread.writeSync()).toBe(first);
    const objects = reread.hash.project.objects;
    const realKeys = (section) => Object.keys(section || {}).filter((key) => !key.endsWith('_comment'));
    expect(realKeys(objects.XCLocalSwiftPackageReference)).toHaveLength(1);
    expect(realKeys(objects.XCSwiftPackageProductDependency)).toHaveLength(1);
    expect(reread.getFirstProject().firstProject.packageReferences).toHaveLength(1);
    expect(linkedProducts(reread)).toEqual(['CAImKeyboardCore']);
    const embedPhases = reread
      .getFirstTarget()
      .firstTarget.buildPhases.filter((phase) => phase.comment === 'Embed Foundation Extensions');
    expect(embedPhases).toHaveLength(1);
  });

  it('matches the extension version and team to the host app', () => {
    const project = loadProject();
    injectKeyboardExtension(project, {
      bundleIdentifier: 'com.caim.keyboard',
      swiftFileNames: ['KeyboardViewController.swift'],
      marketingVersion: '0.2.0',
      buildNumber: '7',
      developmentTeam: 'ABCDE12345',
    });
    const extension = extensionTarget(project);
    const configs = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
      project,
      extension.target.buildConfigurationList,
    );
    expect(configs.length).toBe(2);
    for (const [, config] of configs) {
      expect(config.buildSettings.MARKETING_VERSION).toBe('"0.2.0"');
      expect(config.buildSettings.CURRENT_PROJECT_VERSION).toBe('"7"');
      expect(config.buildSettings.DEVELOPMENT_TEAM).toBe('ABCDE12345');
    }
  });
});

describe('withCaimKeyboard file transforms', () => {
  it('copies Swift sources and forces RequestsOpenAccess plus the App Group', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'caim-keyboard-'));
    const source = path.join(temp, 'src');
    const dest = path.join(temp, 'ios', EXTENSION_TARGET_NAME);
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'KeyboardViewController.swift'), 'import UIKit\n');
    fs.writeFileSync(
      path.join(source, 'Info.plist'),
      plist.build({
        CFBundleDisplayName: 'CAIm',
        NSExtension: {
          NSExtensionPointIdentifier: 'com.apple.keyboard-service',
          NSExtensionAttributes: { RequestsOpenAccess: false },
        },
      }),
    );

    copyKeyboardSources(source, dest, []);

    const info = plist.parse(fs.readFileSync(path.join(dest, 'Info.plist'), 'utf8'));
    expect(info.NSExtension.NSExtensionAttributes.RequestsOpenAccess).toBe(true);
    expect(info.NSExtension.NSExtensionPointIdentifier).toBe('com.apple.keyboard-service');
    expect(fs.existsSync(path.join(dest, 'KeyboardViewController.swift'))).toBe(true);

    const entitlements = plist.parse(
      fs.readFileSync(path.join(dest, 'CAImKeyboardExtension.entitlements'), 'utf8'),
    );
    expect(entitlements['com.apple.security.application-groups']).toContain(APP_GROUP_ID);
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it('preserves the repo keyboard Info.plist open-access flag', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'caim-keyboard-real-'));
    const dest = path.join(temp, EXTENSION_TARGET_NAME);
    copyKeyboardSources(REAL_SOURCES, dest, []);
    const info = plist.parse(fs.readFileSync(path.join(dest, 'Info.plist'), 'utf8'));
    expect(info.NSExtension.NSExtensionAttributes.RequestsOpenAccess).toBe(true);
    expect(info.NSExtension.NSExtensionPrincipalClass).toBe(
      '$(PRODUCT_MODULE_NAME).KeyboardViewController',
    );
    for (const name of [
      'KeyboardViewController.swift',
      'KeyboardView.swift',
      'KeyboardEngineAdapter.swift',
      'GrokClient.swift',
    ]) {
      expect(fs.existsSync(path.join(dest, name))).toBe(true);
    }
    expect(fs.existsSync(path.join(dest, 'README.md'))).toBe(false);
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it('writes a core import when a local package is present', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'caim-keyboard-core-'));
    const source = path.join(temp, 'src');
    const dest = path.join(temp, 'out');
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, 'KeyboardViewController.swift'), 'import UIKit\n');
    const copied = copyKeyboardSources(source, dest, [
      { relativePathFromIos: '../Packages/CaimKeyboardCore', products: ['CaimKeyboardCore'] },
    ]);
    expect(copied.swiftFileNames).toContain('CaimCoreLinkage.swift');
    expect(fs.readFileSync(path.join(dest, 'CaimCoreLinkage.swift'), 'utf8')).toContain(
      'import CaimKeyboardCore',
    );
    fs.rmSync(temp, { recursive: true, force: true });
  });
});

describe('keyboard package and entitlement helpers', () => {
  it('merges the App Group without duplicating it', () => {
    const once = mergeAppGroupEntitlement({
      'com.apple.security.application-groups': [APP_GROUP_ID],
    });
    expect(once['com.apple.security.application-groups']).toEqual([APP_GROUP_ID]);
    const added = mergeAppGroupEntitlement({});
    expect(added['com.apple.security.application-groups']).toEqual([APP_GROUP_ID]);
  });

  it('reads Swift package library product names', () => {
    const source = `
      let package = Package(
        name: "CaimKeyboardCore",
        products: [
          .library(name: "CaimKeyboardCore", targets: ["CaimKeyboardCore"]),
        ]
      )
    `;
    expect(readSwiftPackageProducts(source)).toEqual(['CaimKeyboardCore']);
  });

  it('discovers the repo CAImKeyboardCore package for the extension target', () => {
    expect(findCorePackages(path.join(__dirname, '..'))).toEqual([
      {
        relativePathFromIos: '../Packages/CAImKeyboardCore',
        products: ['CAImKeyboardCore'],
      },
    ]);
  });

  it('discovers a Packages/CaimKeyboardCore manifest', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'caim-pkg-'));
    const pkgDir = path.join(temp, 'Packages', 'CaimKeyboardCore');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'Package.swift'),
      'let package = Package(name: "CaimKeyboardCore", products: [.library(name: "CaimKeyboardCore", targets: ["CaimKeyboardCore"])])\n',
    );
    expect(findCorePackages(temp)).toEqual([
      {
        relativePathFromIos: '../Packages/CaimKeyboardCore',
        products: ['CaimKeyboardCore'],
      },
    ]);
    fs.rmSync(temp, { recursive: true, force: true });
  });
});
