const fs = require('fs');
const path = require('path');
const { withDangerousMod, withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');

const EXTENSION_NAME = 'CrusherEVOAudioUnit';
const APP_GROUP = 'group.com.crusherevo.boost.audio';
const EXTENSION_BUNDLE_SUFFIX = '.audiounit';

function extensionFiles() {
  return {
    'CrusherEVOAudioUnit.swift': 'native/audio-unit/CrusherEVOAudioUnit.swift',
    'Info.plist': 'native/audio-unit/Info.plist',
    'CrusherEVOAudioUnit.entitlements': 'native/audio-unit/CrusherEVOAudioUnit.entitlements',
  };
}

function copyExtensionFiles(projectRoot, iosRoot) {
  const destination = path.join(iosRoot, EXTENSION_NAME);
  fs.mkdirSync(destination, { recursive: true });

  for (const [destinationName, sourceName] of Object.entries(extensionFiles())) {
    const source = path.join(projectRoot, sourceName);
    if (!fs.existsSync(source)) {
      throw new Error(`Crusher EVO Audio Unit source file is missing: ${source}`);
    }
    fs.copyFileSync(source, path.join(destination, destinationName));
  }
}

function findApplicationTarget(project) {
  const targets = project.pbxNativeTargetSection();
  return Object.keys(targets)
    .filter((key) => !key.endsWith('_comment'))
    .map((key) => ({ ...targets[key], uuid: key }))
    .find((target) => target && target.productType === '"com.apple.product-type.application"');
}

function targetBuildProperty(project, target, property) {
  const configurationList = project.pbxXCConfigurationList()[target.buildConfigurationList];
  if (!configurationList) return undefined;

  for (const configuration of configurationList.buildConfigurations) {
    const settings = project.pbxXCBuildConfigurationSection()[configuration.value]?.buildSettings;
    if (settings?.[property]) return String(settings[property]).replace(/^"|"$/g, '');
  }
  return undefined;
}

function updateTargetBuildProperty(project, targetUuid, property, value) {
  const target = project.pbxNativeTargetSection()[targetUuid];
  const configurationList = target && project.pbxXCConfigurationList()[target.buildConfigurationList];
  if (!configurationList) throw new Error(`Crusher EVO could not find build settings for target ${targetUuid}.`);

  for (const configuration of configurationList.buildConfigurations) {
    const settings = project.pbxXCBuildConfigurationSection()[configuration.value].buildSettings;
    settings[property] = value;
  }
}

function ensureExtensionEmbedded(project, appTargetUuid, extensionTargetUuid) {
  const objects = project.hash.project.objects;
  const nativeTargets = project.pbxNativeTargetSection();
  const appTarget = nativeTargets[appTargetUuid];
  const extensionTarget = nativeTargets[extensionTargetUuid];
  const productReference = extensionTarget?.productReference;
  if (!appTarget || !productReference) {
    throw new Error('Crusher EVO could not resolve the app or Audio Unit product reference.');
  }

  const buildFiles = project.pbxBuildFileSection();
  const productBuildFileUuid = Object.keys(buildFiles).find(
    (key) => !key.endsWith('_comment') && buildFiles[key]?.fileRef === productReference,
  );
  const copyPhases = objects.PBXCopyFilesBuildPhase || {};
  const embedPhaseRef = appTarget.buildPhases.find((phaseRef) => {
    const phase = copyPhases[phaseRef.value];
    return (
      phase &&
      Number(phase.dstSubfolderSpec) === 13 &&
      phase.files?.some((file) => file.value === productBuildFileUuid)
    );
  });
  if (!embedPhaseRef) {
    throw new Error('Crusher EVO Audio Unit was not added to the app embed phase.');
  }

  const embedPhase = copyPhases[embedPhaseRef.value];
  embedPhase.name = '"Embed App Extensions"';
  copyPhases[`${embedPhaseRef.value}_comment`] = 'Embed App Extensions';
  embedPhaseRef.comment = 'Embed App Extensions';

  objects.PBXTargetDependency ||= {};
  objects.PBXContainerItemProxy ||= {};
  const hasDependency = Object.keys(objects.PBXTargetDependency).some(
    (key) =>
      !key.endsWith('_comment') &&
      objects.PBXTargetDependency[key]?.target === extensionTargetUuid,
  );
  if (!hasDependency) project.addTargetDependency(appTargetUuid, [extensionTargetUuid]);
}

function addExtensionTarget(project, config) {
  const existingTarget = project.pbxTargetByName(EXTENSION_NAME);
  if (existingTarget) return;

  const appTarget = findApplicationTarget(project);
  if (!appTarget) throw new Error('Crusher EVO could not find the iOS application target.');

  const appBundleIdentifier =
    targetBuildProperty(project, appTarget, 'PRODUCT_BUNDLE_IDENTIFIER') ||
    config.ios?.bundleIdentifier ||
    `com.crusherevo.${config.slug}`;
  const extensionBundleIdentifier = `${appBundleIdentifier}${EXTENSION_BUNDLE_SUFFIX}`;
  const marketingVersion =
    config.version || targetBuildProperty(project, appTarget, 'MARKETING_VERSION') || '1.0.0';
  const buildNumber =
    config.ios?.buildNumber ||
    targetBuildProperty(project, appTarget, 'CURRENT_PROJECT_VERSION') ||
    '1';
  const developmentTeam = targetBuildProperty(project, appTarget, 'DEVELOPMENT_TEAM');
  const extensionTarget = project.addTarget(
    EXTENSION_NAME,
    'app_extension',
    EXTENSION_NAME,
    extensionBundleIdentifier,
  );

  project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', extensionTarget.uuid);
  project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', extensionTarget.uuid);
  const extensionGroup = project.addPbxGroup([], EXTENSION_NAME, EXTENSION_NAME);
  const sourcePath = `${EXTENSION_NAME}/CrusherEVOAudioUnit.swift`;
  project.addSourceFile(sourcePath, { target: extensionTarget.uuid }, extensionGroup.uuid);

  updateTargetBuildProperty(project, extensionTarget.uuid, 'SWIFT_VERSION', '5.0');
  updateTargetBuildProperty(project, extensionTarget.uuid, 'PRODUCT_BUNDLE_IDENTIFIER', extensionBundleIdentifier);
  updateTargetBuildProperty(project, extensionTarget.uuid, 'MARKETING_VERSION', marketingVersion);
  updateTargetBuildProperty(project, extensionTarget.uuid, 'CURRENT_PROJECT_VERSION', buildNumber);
  updateTargetBuildProperty(project, extensionTarget.uuid, 'INFOPLIST_FILE', `${EXTENSION_NAME}/Info.plist`);
  updateTargetBuildProperty(
    project,
    extensionTarget.uuid,
    'CODE_SIGN_ENTITLEMENTS',
    `${EXTENSION_NAME}/CrusherEVOAudioUnit.entitlements`,
  );
  updateTargetBuildProperty(project, extensionTarget.uuid, 'APPLICATION_EXTENSION_API_ONLY', 'YES');
  updateTargetBuildProperty(project, extensionTarget.uuid, 'CODE_SIGN_STYLE', 'Automatic');
  updateTargetBuildProperty(project, extensionTarget.uuid, 'SKIP_INSTALL', 'YES');
  updateTargetBuildProperty(project, extensionTarget.uuid, 'TARGETED_DEVICE_FAMILY', '1');
  if (developmentTeam) {
    updateTargetBuildProperty(project, extensionTarget.uuid, 'DEVELOPMENT_TEAM', developmentTeam);
  }
  project.addFramework('AudioToolbox.framework', { target: extensionTarget.uuid });
  project.addFramework('AVFoundation.framework', { target: extensionTarget.uuid });
  ensureExtensionEmbedded(project, appTarget.uuid, extensionTarget.uuid);
}

module.exports = function withAudioUnitExtension(config) {
  config = withEntitlementsPlist(config, (config) => {
    const groups = config.modResults['com.apple.security.application-groups'] || [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    config.modResults['com.apple.security.application-groups'] = groups;
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      copyExtensionFiles(config.modRequest.projectRoot, config.modRequest.platformProjectRoot);
      return config;
    },
  ]);

  return withXcodeProject(config, (config) => {
    addExtensionTarget(config.modResults, config);
    return config;
  });
};

module.exports.APP_GROUP = APP_GROUP;