import { Linking, Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export type OutputRoute = {
  connected: boolean;
  isBluetooth: boolean;
  name: string;
  type: string;
};

type CrusherAudioOutputModule = {
  activateAudioSession: () => Promise<OutputRoute>;
  getCurrentOutput: () => Promise<OutputRoute>;
  addListener: (
    eventName: 'outputRouteChanged',
    listener: (route: OutputRoute) => void,
  ) => { remove: () => void };
};

function getNativeOutputModule(): CrusherAudioOutputModule | null {
  if (Platform.OS !== 'ios') return null;

  try {
    return requireNativeModule<CrusherAudioOutputModule>('CrusherAudioUnit');
  } catch {
    return null;
  }
}

export async function getCurrentOutputRoute(): Promise<OutputRoute> {
  const nativeModule = getNativeOutputModule();
  if (!nativeModule) {
    return { connected: false, isBluetooth: false, name: '', type: 'unavailable' };
  }

  try {
    return await nativeModule.getCurrentOutput();
  } catch {
    return { connected: false, isBluetooth: false, name: '', type: 'unknown' };
  }
}

export async function activateAudioSession(): Promise<OutputRoute> {
  const nativeModule = getNativeOutputModule();
  if (!nativeModule) return getCurrentOutputRoute();
  try {
    return await nativeModule.activateAudioSession();
  } catch {
    return getCurrentOutputRoute();
  }
}

export function subscribeToOutputRoute(listener: (route: OutputRoute) => void): { remove: () => void } {
  const nativeModule = getNativeOutputModule();
  if (!nativeModule) return { remove: () => undefined };
  return nativeModule.addListener('outputRouteChanged', listener);
}

export function describeOutputRoute(route: OutputRoute): string {
  if (route.isBluetooth && route.name) return `Bluetooth · ${route.name}`;
  if (route.connected) return route.name || 'iPhoneスピーカー';
  return '出力先を確認できません';
}

export async function openBluetoothSettings(): Promise<boolean> {
  const bluetoothSettingsUrls = ['App-Prefs:root=Bluetooth', 'App-Prefs:Bluetooth'];
  for (const url of bluetoothSettingsUrls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // Try the next iOS Settings URL format.
    }
  }

  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}