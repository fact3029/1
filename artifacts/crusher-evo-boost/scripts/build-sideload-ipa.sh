#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_ROOT="${APP_ROOT}/build/sideload"
DERIVED_DATA="${OUTPUT_ROOT}/DerivedData"
IPA_PATH="${OUTPUT_ROOT}/Crusher-EVO-Boost-Sideloadly.ipa"

fail() {
  echo "error: $*" >&2
  exit 1
}

report_error() {
  local exit_code=$?
  local line_number=$1
  local command=$2
  printf '::error title=IPA build script failed::Line %s exited with %s: %s\n' \
    "${line_number}" "${exit_code}" "${command}"
}

trap 'report_error "${LINENO}" "${BASH_COMMAND}"' ERR

[[ "$(uname -s)" == "Darwin" ]] || fail "iOS compilation requires macOS with Xcode."
command -v xcodebuild >/dev/null || fail "xcodebuild was not found. Install Xcode and select it with xcode-select."
command -v pod >/dev/null || fail "CocoaPods was not found. Install CocoaPods before building."
command -v pnpm >/dev/null || fail "pnpm was not found."
command -v zip >/dev/null || fail "zip was not found."
command -v unzip >/dev/null || fail "unzip was not found."

cd "${APP_ROOT}"
rm -rf ios "${OUTPUT_ROOT}"
mkdir -p "${OUTPUT_ROOT}"

export SIDELOAD_BUILD=1
export NODE_ENV=production

echo "==> Generating the sideload-only iOS project"
pnpm exec expo prebuild --platform ios --clean --no-install

if grep -Rqs "CrusherEVOAudioUnit" ios; then
  fail "Audio Unit extension was unexpectedly included in the sideload build."
fi

echo "==> Applying the Expo Modules JSI Xcode 26 compatibility patch"
EXPO_JSI_HEADER="$(
  find "${APP_ROOT}/../../node_modules/.pnpm" \
    -path '*/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h' \
    -print \
    -quit
)"
[[ -f "${EXPO_JSI_HEADER}" ]] ||
  fail "expo-modules-jsi RuntimeScheduler.h was not found."

EXPO_JSI_PACKAGE="$(
  find "${APP_ROOT}/../../node_modules/.pnpm" \
    -path '*/expo-modules-jsi/apple/Package.swift' \
    -print \
    -quit
)"
[[ -f "${EXPO_JSI_PACKAGE}" ]] ||
  fail "expo-modules-jsi Package.swift was not found."

node - "${EXPO_JSI_HEADER}" "${EXPO_JSI_PACKAGE}" <<'NODE'
const fs = require('node:fs');

const headerPath = process.argv[2];
const packagePath = process.argv[3];
const headerSource = fs.readFileSync(headerPath, 'utf8');
const constructors = [
  'SWIFT_RETURNS_RETAINED RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept',
  'SWIFT_RETURNS_RETAINED RuntimeScheduler() {}',
];

let patchedHeader = headerSource;
for (const constructor of constructors) {
  const occurrences = patchedHeader.split(constructor).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Expected one occurrence of "${constructor}" in ${headerPath}, found ${occurrences}.`
    );
  }
  patchedHeader = patchedHeader.replace(
    constructor,
    constructor.replace('SWIFT_RETURNS_RETAINED ', '')
  );
}

fs.writeFileSync(headerPath, patchedHeader);

const packageSource = fs.readFileSync(packagePath, 'utf8');
const swift6Mode = 'swiftLanguageModes: [.v6]';
const modeOccurrences = packageSource.split(swift6Mode).length - 1;
if (modeOccurrences !== 1) {
  throw new Error(
    `Expected one Swift 6 language mode declaration in ${packagePath}, found ${modeOccurrences}.`
  );
}

fs.writeFileSync(packagePath, packageSource.replace(swift6Mode, 'swiftLanguageModes: [.v5]'));
NODE

grep -q "SWIFT_RETURNS_RETAINED RuntimeScheduler" "${EXPO_JSI_HEADER}" &&
  fail "The incompatible RuntimeScheduler constructor attribute is still present."
grep -Fq "swiftLanguageModes: [.v5]" "${EXPO_JSI_PACKAGE}" ||
  fail "expo-modules-jsi was not switched to Swift 5 language mode."

echo "==> Installing iOS native dependencies"
(
  cd ios
  pod install --repo-update
)

grep -q "RNAudioAPI" ios/Podfile.lock ||
  fail "RNAudioAPI is missing from Podfile.lock; the native DSP module was not linked."

WORKSPACE="$(find ios -maxdepth 1 -name '*.xcworkspace' -print -quit)"
[[ -n "${WORKSPACE}" ]] || fail "No Xcode workspace was generated."
SCHEME="${SIDELOAD_SCHEME:-$(basename "${WORKSPACE}" .xcworkspace)}"

echo "==> Building unsigned Release app for a physical iPhone"
XCODEBUILD_LOG="${OUTPUT_ROOT}/xcodebuild.log"
trap - ERR
set +e
xcodebuild \
  -workspace "${WORKSPACE}" \
  -scheme "${SCHEME}" \
  -configuration Release \
  -sdk iphoneos \
  -destination "generic/platform=iOS" \
  -derivedDataPath "${DERIVED_DATA}" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  DEVELOPMENT_TEAM="" \
  build 2>&1 | tee "${XCODEBUILD_LOG}"
XCODEBUILD_STATUS=${PIPESTATUS[0]}
set -e
trap 'report_error "${LINENO}" "${BASH_COMMAND}"' ERR

if [[ ${XCODEBUILD_STATUS} -ne 0 ]]; then
  while IFS= read -r error_line; do
    error_line="${error_line//'%'/'%25'}"
    error_line="${error_line//$'\r'/'%0D'}"
    error_line="${error_line//$'\n'/'%0A'}"
    printf '::error title=Xcode build error::%s\n' "${error_line}"
  done < <(
    grep -Ei \
      '(^|[[:space:]])(error:|fatal error:|undefined symbols|duplicate symbol|ld:)|The following build commands failed' \
      "${XCODEBUILD_LOG}" |
      tail -n 30
  )
  exit "${XCODEBUILD_STATUS}"
fi

APP_PATH="$(find "${DERIVED_DATA}/Build/Products/Release-iphoneos" -maxdepth 1 -name '*.app' -type d -print -quit)"
[[ -n "${APP_PATH}" ]] || fail "The Release .app bundle was not produced."

APP_EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "${APP_PATH}/Info.plist")"
[[ -x "${APP_PATH}/${APP_EXECUTABLE}" ]] || fail "The app executable is missing or not executable."
[[ ! -d "${APP_PATH}/PlugIns" ]] || fail "The sideload IPA unexpectedly contains an app extension."

mkdir -p "${OUTPUT_ROOT}/Payload"
cp -R "${APP_PATH}" "${OUTPUT_ROOT}/Payload/"
(
  cd "${OUTPUT_ROOT}"
  zip -qry "$(basename "${IPA_PATH}")" Payload
)

unzip -tq "${IPA_PATH}" >/dev/null || fail "The generated IPA is not a valid ZIP archive."
unzip -l "${IPA_PATH}" | grep -q 'Payload/.*\.app/Info.plist' ||
  fail "The IPA does not contain the expected Payload application bundle."
unzip -l "${IPA_PATH}" | grep -q '\.appex/' &&
  fail "The IPA contains an Audio Unit extension and is not the sideload-only build."

rm -rf "${OUTPUT_ROOT}/Payload"
echo "==> IPA ready: ${IPA_PATH}"