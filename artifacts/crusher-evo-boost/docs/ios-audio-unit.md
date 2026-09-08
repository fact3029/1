# iOS Audio Unit / App Store checklist

## What is included

The iOS prebuild plugin in `plugins/withAudioUnitExtension.js` creates an
embedded AUv3 effect extension named **Crusher EVO: S6EVW EQ**. The extension
has the same controls as the app:

- Low bass boost: `0–100%`
- Sub-bass: `-6–+6 dB`
- Five peaking bands: `60, 150, 400, 1 kHz, 4 kHz`, each `-6–+6 dB`

When the iOS development build contains the local Expo module, the current
profile is written to the App Group whenever it changes. A host that creates a
new Audio Unit instance reads that profile as its initial parameter state.

## Important iOS limitation

An Audio Unit is a plug-in hosted by an Audio Unit-compatible app. iOS does not
allow a third-party app to insert an effect into YouTube, Apple Music, or every
other app's audio session. Those apps must explicitly support Audio Unit
hosting. The extension is therefore real and distributable, but it is not a
system-wide audio filter. The app's built-in test remains the reliable way to
check the sound while using Bluetooth.

## Output routing modes

The app keeps output routing separate from the EQ profile so a future
headphone integration does not require replacing the current Audio Unit path.

- **Connected headphone**: detects the current iOS audio output and selects a
  model-specific adapter when an official SDK/API is available.
- **Audio Unit**: uses the embedded AUv3 extension in an Audio Unit-compatible
  host.
- **Generic Bluetooth**: detects the standard Bluetooth route, but does not
  claim to control the headphone DSP. Standard Bluetooth audio does not define a
  cross-vendor EQ-control channel.
- **In-app test**: applies the profile to the app's own audio test.

Crusher EVO's official app exposes custom EQ, but no public third-party SDK or
EQ-control protocol is currently included in this project. The headphone DSP
adapter must remain disabled until Skullcandy provides an official integration
contract.

## Bluetooth analysis mode

The app includes a read-only Bluetooth Lab for an iOS development build. It
scans for nearby BLE peripherals, connects to a selected device, discovers
services and characteristics, reads values that advertise the read property,
and lets the user share the captured event log.

This mode does not sniff the Skullcandy App and does not write any
characteristics or notification descriptors. Disconnect the official
Skullcandy App before starting the scan. The resulting UUIDs and hexadecimal
values can be used to build a model-specific adapter later, but the app must not
guess an EQ write packet.

## Development build verification

1. Run the iOS native prebuild/build flow from a macOS machine with Xcode.
2. Install the development build on an iPhone and connect S6EVW in Settings.
3. Open Crusher EVO Boost, choose a profile, change a band, and tap Save.
4. Use an AUv3-compatible host (for example, an Audio Unit test host) and add
   **Crusher EVO: S6EVW EQ**. Confirm that audio is audible through S6EVW and
   that the host exposes all seven parameters.
5. Re-open the AU instance after changing the profile and confirm the new
   profile is loaded from the App Group.

Expo Go cannot load the extension or its native module.

## Signing and App Store setup

Use Replit's **Publish** flow (Expo Launch) to create and submit the iOS build.
After App Store Connect finishes processing the uploaded build, enable it for
internal or external testers from the TestFlight tab.

During the first Publish flow, enter the Bundle ID that was used for any
previous TestFlight version. If this is the first version, choose a unique
reverse-domain Bundle ID. Do not invent a new ID when updating an existing App
Store Connect app.

Before distribution, confirm these identifiers and capabilities in the Apple
Developer account:

1. The app's existing App ID.
2. A separate extension App ID ending in `.audiounit` (the plugin derives this
   from the app target's bundle identifier).
3. The App Group `group.com.crusherevo.boost.audio` on both App IDs.
4. An App Store distribution profile for the app and a matching profile for the
   Audio Unit extension.
5. Enable the Audio Unit extension capability for the extension target and
   keep the generated `Embed App Extensions` copy phase.

Do not change the app bundle identifier after it has been registered. The
extension identifier is derived from it during prebuild.

The app and extension use the same marketing version and build number. Increase
`expo.version` for a user-visible release and `expo.ios.buildNumber` for every
new TestFlight upload. The current initial values are `1.0.0` and `1`.

This project declares that it does not use non-exempt encryption. Revisit that
declaration before publishing if cryptographic functionality is added later.

Do not use Expo Go to validate the TestFlight build: Expo Go cannot contain this
project's local Bluetooth module or Audio Unit extension. Use the installed
TestFlight app on an iPhone.