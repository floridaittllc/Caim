const {
  createRunOncePlugin,
  withDangerousMod,
  withEntitlementsPlist,
  withXcodeProject,
  IOSConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('plist');
const pbxFile = require('xcode/lib/pbxFile');

const EXTENSION_TARGET_NAME = 'CAImKeyboardExtension';
const APP_GROUP_ID = 'group.com.caim.keyboard';
const APP_GROUP_ENTITLEMENT = 'com.apple.security.application-groups';
const EXTENSION_INFO_PLIST = 'Info.plist';
const EXTENSION_ENTITLEMENTS = 'CAImKeyboardExtension.entitlements';
const CORE_LINKAGE_SWIFT = 'CaimCoreLinkage.swift';
const SOURCE_DIR_NAME = path.join('targets', 'CAImKeyboardExtension');
const PACKAGE_SCAN_ROOTS = ['Packages', 'packages', 'native', 'swift'];
const EMBED_PHASE_NAME = 'Embed Foundation Extensions';

function extensionBundleIdentifier(hostBundleIdentifier) {
  return `${hostBundleIdentifier}.${EXTENSION_TARGET_NAME}`;
}

function mergeAppGroupEntitlement(entitlements) {
  const current = entitlements[APP_GROUP_ENTITLEMENT];
  const groups = Array.isArray(current) ? current.filter((entry) => typeof entry === 'string') : [];
  const next = groups.includes(APP_GROUP_ID) ? groups : [...groups, APP_GROUP_ID];
  return {
    ...entitlements,
    [APP_GROUP_ENTITLEMENT]: next,
  };
}

function readSwiftPackageProducts(packageSwiftSource) {
  const products = [];
  const libraryPattern = /\.library\s*\(\s*name:\s*"([^"]+)"/g;
  let match = libraryPattern.exec(packageSwiftSource);
  while (match) {
    products.push(match[1]);
    match = libraryPattern.exec(packageSwiftSource);
  }
  return products;
}

function findCorePackages(projectRoot) {
  const found = [];
  for (const rootName of PACKAGE_SCAN_ROOTS) {
    const rootDir = path.join(projectRoot, rootName);
    if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
      continue;
    }
    const packageDirs = [rootDir];
    for (const entry of fs.readdirSync(rootDir)) {
      const child = path.join(rootDir, entry);
      if (fs.existsSync(child) && fs.statSync(child).isDirectory()) {
        packageDirs.push(child);
      }
    }
    for (const packageDir of packageDirs) {
      const manifestPath = path.join(packageDir, 'Package.swift');
      if (!fs.existsSync(manifestPath)) {
        continue;
      }
      const products = readSwiftPackageProducts(fs.readFileSync(manifestPath, 'utf8'));
      if (products.length === 0) {
        console.warn(
          `[withCaimKeyboard] ${manifestPath} has no .library product; keyboard target will not link it.`,
        );
        continue;
      }
      const relativeFromRoot = path.relative(projectRoot, packageDir).split(path.sep).join('/');
      found.push({
        relativePathFromIos: path.posix.join('..', relativeFromRoot),
        products,
      });
    }
  }
  return found;
}

function listSwiftSources(sourceDir) {
  return fs
    .readdirSync(sourceDir)
    .filter((name) => name.endsWith('.swift'))
    .sort();
}

function ensureKeyboardInfoPlist(destinationPath, sourcePath) {
  const parsed = fs.existsSync(sourcePath)
    ? plist.parse(fs.readFileSync(sourcePath, 'utf8'))
    : {};
  const extension = parsed.NSExtension && typeof parsed.NSExtension === 'object' ? parsed.NSExtension : {};
  const attributes =
    extension.NSExtensionAttributes && typeof extension.NSExtensionAttributes === 'object'
      ? extension.NSExtensionAttributes
      : {};
  attributes.RequestsOpenAccess = true;
  if (!attributes.PrimaryLanguage) {
    attributes.PrimaryLanguage = 'en-US';
  }
  extension.NSExtensionAttributes = attributes;
  extension.NSExtensionPointIdentifier = 'com.apple.keyboard-service';
  if (!extension.NSExtensionPrincipalClass) {
    extension.NSExtensionPrincipalClass = '$(PRODUCT_MODULE_NAME).KeyboardViewController';
  }
  parsed.NSExtension = extension;
  parsed.CFBundleDisplayName = parsed.CFBundleDisplayName || 'CAIm';
  parsed.CFBundlePackageType = parsed.CFBundlePackageType || 'XPC!';
  parsed.CFBundleExecutable = parsed.CFBundleExecutable || '$(EXECUTABLE_NAME)';
  parsed.CFBundleIdentifier = parsed.CFBundleIdentifier || '$(PRODUCT_BUNDLE_IDENTIFIER)';
  parsed.CFBundleName = parsed.CFBundleName || '$(PRODUCT_NAME)';
  parsed.CFBundleShortVersionString = parsed.CFBundleShortVersionString || '$(MARKETING_VERSION)';
  parsed.CFBundleVersion = parsed.CFBundleVersion || '$(CURRENT_PROJECT_VERSION)';
  fs.writeFileSync(destinationPath, `${plist.build(parsed)}\n`);
}

function ensureExtensionEntitlements(destinationPath, sourcePath) {
  const parsed =
    sourcePath && fs.existsSync(sourcePath) ? plist.parse(fs.readFileSync(sourcePath, 'utf8')) : {};
  fs.writeFileSync(destinationPath, `${plist.build(mergeAppGroupEntitlement(parsed))}\n`);
}

function writeCoreLinkageSwift(destinationDir, corePackages) {
  const imports = [];
  for (const corePackage of corePackages) {
    for (const product of corePackage.products) {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(product) && !imports.includes(product)) {
        imports.push(product);
      }
    }
  }
  if (imports.length === 0) {
    return false;
  }
  const lines = [
    '// Generated by plugins/withCaimKeyboard.js during expo prebuild.',
    '// Imports local Swift package products so the keyboard extension can call them.',
    ...imports.map((product) => `import ${product}`),
    '',
  ];
  fs.writeFileSync(path.join(destinationDir, CORE_LINKAGE_SWIFT), lines.join('\n'));
  return true;
}

function copyKeyboardSources(sourceDir, destinationDir, corePackages) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`[withCaimKeyboard] Missing keyboard sources at ${sourceDir}`);
  }
  fs.mkdirSync(destinationDir, { recursive: true });
  for (const name of listSwiftSources(sourceDir)) {
    fs.copyFileSync(path.join(sourceDir, name), path.join(destinationDir, name));
  }
  ensureKeyboardInfoPlist(
    path.join(destinationDir, EXTENSION_INFO_PLIST),
    path.join(sourceDir, EXTENSION_INFO_PLIST),
  );
  ensureExtensionEntitlements(
    path.join(destinationDir, EXTENSION_ENTITLEMENTS),
    path.join(sourceDir, EXTENSION_ENTITLEMENTS),
  );
  const wroteLinkage = writeCoreLinkageSwift(destinationDir, corePackages);
  return {
    swiftFileNames: [
      ...listSwiftSources(sourceDir),
      ...(wroteLinkage ? [CORE_LINKAGE_SWIFT] : []),
    ],
  };
}

function unquote(value) {
  return String(value).replace(/^"/, '').replace(/"$/, '');
}

function findNativeTargetByName(project, name) {
  const section = project.pbxNativeTargetSection();
  for (const key of Object.keys(section)) {
    if (key.endsWith('_comment')) {
      continue;
    }
    const target = section[key];
    if (unquote(target.name) === name) {
      return { uuid: key, target };
    }
  }
  return null;
}

function ensureObjectSection(project, sectionName) {
  if (!project.hash.project.objects[sectionName]) {
    project.hash.project.objects[sectionName] = {};
  }
  return project.hash.project.objects[sectionName];
}

function hostDeploymentSetting(project, key, fallback) {
  const host = project.getFirstTarget();
  if (!host) {
    return fallback;
  }
  const configs = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
    project,
    host.firstTarget.buildConfigurationList,
  );
  for (const [, config] of configs) {
    if (config.buildSettings && config.buildSettings[key] != null) {
      return config.buildSettings[key];
    }
  }
  return fallback;
}

function updateTargetBuildSettings(project, targetUuid, settings) {
  const nativeTarget = project.pbxNativeTargetSection()[targetUuid];
  const configs = IOSConfig.XcodeUtils.getBuildConfigurationsForListId(
    project,
    nativeTarget.buildConfigurationList,
  );
  for (const [, config] of configs) {
    config.buildSettings = {
      ...config.buildSettings,
      ...settings,
    };
  }
}

function ensureExtensionGroup(project) {
  const { firstProject } = project.getFirstProject();
  const mainGroup = project.getPBXGroupByKey(firstProject.mainGroup);
  const existing = (mainGroup.children || []).find((child) => child.comment === EXTENSION_TARGET_NAME);
  if (existing) {
    return existing.value;
  }
  const groupKey = project.pbxCreateGroup(EXTENSION_TARGET_NAME, `"${EXTENSION_TARGET_NAME}"`);
  mainGroup.children.push({ value: groupKey, comment: EXTENSION_TARGET_NAME });
  return groupKey;
}

function addFileReference(project, groupKey, filename, options) {
  const file = new pbxFile(filename, options);
  file.fileRef = project.generateUuid();
  file.uuid = project.generateUuid();
  project.addToPbxFileReferenceSection(file);
  const group = project.getPBXGroupByKey(groupKey);
  group.children.push({ value: file.fileRef, comment: file.basename });
  return file;
}

function addCompiledSwiftFile(project, groupKey, filename, targetUuid) {
  const file = addFileReference(project, groupKey, filename, {
    lastKnownFileType: 'sourcecode.swift',
    sourceTree: '"<group>"',
  });
  file.target = targetUuid;
  file.group = 'Sources';
  project.addToPbxBuildFileSection(file);
  project.addToPbxSourcesBuildPhase(file);
  return file;
}

function markAppexRemoveHeaders(project, productFileRef) {
  const buildFiles = project.pbxBuildFileSection();
  for (const key of Object.keys(buildFiles)) {
    if (key.endsWith('_comment')) {
      continue;
    }
    const entry = buildFiles[key];
    if (entry.fileRef === productFileRef) {
      entry.settings = { ATTRIBUTES: ['RemoveHeadersOnCopy'] };
    }
  }
}

function findTargetBuildPhase(project, nativeTarget, isa) {
  const phases = project.hash.project.objects[isa] || {};
  const ref = (nativeTarget.buildPhases || []).find((phase) => phases[phase.value]);
  return ref ? phases[ref.value] : null;
}

function linkCorePackages(project, extensionTargetUuid, corePackages) {
  if (!corePackages || corePackages.length === 0) {
    return;
  }
  const localRefs = ensureObjectSection(project, 'XCLocalSwiftPackageReference');
  const productDeps = ensureObjectSection(project, 'XCSwiftPackageProductDependency');
  const buildFiles = ensureObjectSection(project, 'PBXBuildFile');
  const projectSection = project.getFirstProject().firstProject;
  if (!projectSection.packageReferences) {
    projectSection.packageReferences = [];
  }
  const nativeTarget = project.pbxNativeTargetSection()[extensionTargetUuid];
  if (!nativeTarget.packageProductDependencies) {
    nativeTarget.packageProductDependencies = [];
  }
  const frameworksPhase = findTargetBuildPhase(project, nativeTarget, 'PBXFrameworksBuildPhase');
  if (frameworksPhase && !frameworksPhase.files) {
    frameworksPhase.files = [];
  }

  for (const corePackage of corePackages) {
    const quotedPath = `"${corePackage.relativePathFromIos}"`;
    const packageComment = `XCLocalSwiftPackageReference "${path.posix.basename(corePackage.relativePathFromIos)}"`;
    let packageRefId = Object.keys(localRefs).find(
      (key) =>
        !key.endsWith('_comment') &&
        unquote(localRefs[key].relativePath) === corePackage.relativePathFromIos,
    );
    if (!packageRefId) {
      packageRefId = project.generateUuid();
      localRefs[packageRefId] = {
        isa: 'XCLocalSwiftPackageReference',
        relativePath: quotedPath,
      };
      localRefs[`${packageRefId}_comment`] = packageComment;
    }
    if (!projectSection.packageReferences.some((entry) => entry.value === packageRefId)) {
      projectSection.packageReferences.push({ value: packageRefId, comment: packageComment });
    }

    for (const productName of corePackage.products) {
      const targetDeps = new Set(nativeTarget.packageProductDependencies.map((entry) => entry.value));
      let productId = Object.keys(productDeps).find(
        (key) =>
          !key.endsWith('_comment') &&
          targetDeps.has(key) &&
          productDeps[key].package === packageRefId &&
          unquote(productDeps[key].productName) === productName,
      );
      if (!productId) {
        productId = project.generateUuid();
        productDeps[productId] = {
          isa: 'XCSwiftPackageProductDependency',
          package: packageRefId,
          package_comment: packageComment,
          productName: `"${productName}"`,
        };
        productDeps[`${productId}_comment`] = productName;
        nativeTarget.packageProductDependencies.push({ value: productId, comment: productName });
      }

      // Xcode only links an SPM product when the target's Frameworks phase references it.
      if (frameworksPhase) {
        const alreadyLinked = frameworksPhase.files.some(
          (entry) => buildFiles[entry.value] && buildFiles[entry.value].productRef === productId,
        );
        if (!alreadyLinked) {
          const buildFileId = project.generateUuid();
          buildFiles[buildFileId] = {
            isa: 'PBXBuildFile',
            productRef: productId,
            productRef_comment: productName,
          };
          buildFiles[`${buildFileId}_comment`] = `${productName} in Frameworks`;
          frameworksPhase.files.push({ value: buildFileId, comment: `${productName} in Frameworks` });
        }
      }
    }
  }
}

function findAppexEmbedPhase(project, hostTarget, productFileRef) {
  const copyPhases = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
  const buildFiles = project.pbxBuildFileSection();
  for (const ref of hostTarget.buildPhases || []) {
    const phase = copyPhases[ref.value];
    if (
      phase &&
      (phase.files || []).some(
        (entry) => buildFiles[entry.value] && buildFiles[entry.value].fileRef === productFileRef,
      )
    ) {
      return { ref, phase };
    }
  }
  return null;
}

// Xcode 15+ reports a dependency cycle when the appex embed phase runs after the
// React Native / CocoaPods script phases, so keep it directly after Resources.
function ensureEmbedPhaseOrder(project, extensionTargetUuid) {
  const host = project.getFirstTarget();
  const extensionTarget = project.pbxNativeTargetSection()[extensionTargetUuid];
  if (!host || !extensionTarget) {
    return;
  }
  const hostTarget = host.firstTarget;
  const found = findAppexEmbedPhase(project, hostTarget, extensionTarget.productReference);
  if (!found) {
    return;
  }
  found.phase.name = `"${EMBED_PHASE_NAME}"`;
  found.ref.comment = EMBED_PHASE_NAME;
  const copyPhases = project.hash.project.objects.PBXCopyFilesBuildPhase;
  copyPhases[`${found.ref.value}_comment`] = EMBED_PHASE_NAME;

  const phases = hostTarget.buildPhases;
  phases.splice(phases.indexOf(found.ref), 1);
  const resources = project.hash.project.objects.PBXResourcesBuildPhase || {};
  const resourcesIndex = phases.findIndex((phase) => resources[phase.value]);
  phases.splice(resourcesIndex === -1 ? phases.length : resourcesIndex + 1, 0, found.ref);
}

function ensureExtensionVersionSettings(project, extensionTargetUuid, options) {
  const settings = {};
  if (options.marketingVersion) {
    settings.MARKETING_VERSION = `"${options.marketingVersion}"`;
  }
  if (options.buildNumber) {
    settings.CURRENT_PROJECT_VERSION = `"${options.buildNumber}"`;
  }
  const developmentTeam =
    options.developmentTeam || hostDeploymentSetting(project, 'DEVELOPMENT_TEAM', null);
  if (developmentTeam) {
    settings.DEVELOPMENT_TEAM = developmentTeam;
  }
  if (Object.keys(settings).length > 0) {
    updateTargetBuildSettings(project, extensionTargetUuid, settings);
  }
}

/**
 * Add the CAIm keyboard extension target, embed phase, entitlements, and sources.
 * Idempotent when the target name is already present.
 */
function injectKeyboardExtension(project, options) {
  const bundleIdentifier = options.bundleIdentifier || 'com.caim.keyboard';
  const swiftFileNames = options.swiftFileNames || [];
  const corePackages = options.corePackages || [];

  const existing = findNativeTargetByName(project, EXTENSION_TARGET_NAME);
  if (existing) {
    linkCorePackages(project, existing.uuid, corePackages);
    ensureEmbedPhaseOrder(project, existing.uuid);
    ensureExtensionVersionSettings(project, existing.uuid, options);
    stripUndefined(project.hash);
    return project;
  }

  const host = project.getFirstTarget();
  if (!host) {
    throw new Error('[withCaimKeyboard] Host iOS application target was not found.');
  }
  if (!host.firstTarget.dependencies) {
    host.firstTarget.dependencies = [];
  }
  ensureObjectSection(project, 'PBXTargetDependency');
  ensureObjectSection(project, 'PBXContainerItemProxy');

  const created = project.addTarget(
    EXTENSION_TARGET_NAME,
    'app_extension',
    EXTENSION_TARGET_NAME,
    extensionBundleIdentifier(bundleIdentifier),
  );

  project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', created.uuid);
  project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', created.uuid);
  project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', created.uuid);

  const deploymentTarget = hostDeploymentSetting(project, 'IPHONEOS_DEPLOYMENT_TARGET', '16.4');
  const swiftVersion = hostDeploymentSetting(project, 'SWIFT_VERSION', '5.0');
  updateTargetBuildSettings(project, created.uuid, {
    APPLICATION_EXTENSION_API_ONLY: 'YES',
    CODE_SIGN_ENTITLEMENTS: `"${EXTENSION_TARGET_NAME}/${EXTENSION_ENTITLEMENTS}"`,
    CODE_SIGN_STYLE: 'Automatic',
    CURRENT_PROJECT_VERSION: '1',
    GENERATE_INFOPLIST_FILE: 'NO',
    INFOPLIST_FILE: `"${EXTENSION_TARGET_NAME}/${EXTENSION_INFO_PLIST}"`,
    IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
    LD_RUNPATH_SEARCH_PATHS:
      '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    MARKETING_VERSION: '1.0',
    PRODUCT_BUNDLE_IDENTIFIER: `"${extensionBundleIdentifier(bundleIdentifier)}"`,
    PRODUCT_NAME: `"${EXTENSION_TARGET_NAME}"`,
    SKIP_INSTALL: 'YES',
    SWIFT_VERSION: swiftVersion,
    TARGETED_DEVICE_FAMILY: '"1,2"',
  });

  project.addTargetAttribute('ProvisioningStyle', 'Automatic', created);

  const nativeTarget = project.pbxNativeTargetSection()[created.uuid];
  markAppexRemoveHeaders(project, nativeTarget.productReference);

  const groupKey = ensureExtensionGroup(project);
  for (const filename of swiftFileNames) {
    addCompiledSwiftFile(project, groupKey, filename, created.uuid);
  }
  addFileReference(project, groupKey, EXTENSION_INFO_PLIST, {
    lastKnownFileType: 'text.plist.xml',
  });
  addFileReference(project, groupKey, EXTENSION_ENTITLEMENTS, {
    lastKnownFileType: 'text.plist.entitlements',
  });

  linkCorePackages(project, created.uuid, corePackages);
  ensureEmbedPhaseOrder(project, created.uuid);
  ensureExtensionVersionSettings(project, created.uuid, options);
  stripUndefined(project.hash);
  return project;
}

function stripUndefined(value) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      stripUndefined(entry);
    }
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
      continue;
    }
    stripUndefined(value[key]);
  }
}

function withHostAppGroup(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults = mergeAppGroupEntitlement(cfg.modResults || {});
    return cfg;
  });
}

function withKeyboardFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const sourceDir = path.join(projectRoot, SOURCE_DIR_NAME);
      const destinationDir = path.join(cfg.modRequest.platformProjectRoot, EXTENSION_TARGET_NAME);
      const corePackages = findCorePackages(projectRoot);
      copyKeyboardSources(sourceDir, destinationDir, corePackages);
      return cfg;
    },
  ]);
}

function withKeyboardXcodeTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const sourceDir = path.join(projectRoot, SOURCE_DIR_NAME);
    const corePackages = findCorePackages(projectRoot);
    const swiftFileNames = fs.existsSync(sourceDir) ? listSwiftSources(sourceDir) : [];
    if (corePackages.length > 0) {
      swiftFileNames.push(CORE_LINKAGE_SWIFT);
    }
    const bundleIdentifier =
      IOSConfig.BundleIdentifier.getBundleIdentifier(cfg) || cfg.ios?.bundleIdentifier || 'com.caim.keyboard';
    injectKeyboardExtension(cfg.modResults, {
      bundleIdentifier,
      swiftFileNames,
      corePackages,
      marketingVersion: cfg.version,
      buildNumber: cfg.ios?.buildNumber || '1',
      developmentTeam: cfg.ios?.appleTeamId,
    });
    return cfg;
  });
}

function withCaimKeyboard(config) {
  config = withHostAppGroup(config);
  config = withKeyboardFiles(config);
  config = withKeyboardXcodeTarget(config);
  return config;
}

const plugin = createRunOncePlugin(withCaimKeyboard, 'with-caim-keyboard', '1.0.0');

module.exports = plugin;
module.exports.APP_GROUP_ID = APP_GROUP_ID;
module.exports.EXTENSION_TARGET_NAME = EXTENSION_TARGET_NAME;
module.exports.extensionBundleIdentifier = extensionBundleIdentifier;
module.exports.mergeAppGroupEntitlement = mergeAppGroupEntitlement;
module.exports.readSwiftPackageProducts = readSwiftPackageProducts;
module.exports.findCorePackages = findCorePackages;
module.exports.copyKeyboardSources = copyKeyboardSources;
module.exports.injectKeyboardExtension = injectKeyboardExtension;
module.exports.ensureKeyboardInfoPlist = ensureKeyboardInfoPlist;
