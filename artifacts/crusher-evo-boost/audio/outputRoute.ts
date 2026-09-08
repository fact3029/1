import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export type OutputRoute = {
  connected: boolean;
  name: string;
  type: string;
};

type CrusherAudioOutputModule = {
  getCurrentOutput: () => Promise<OutputRoute>;
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
    return { connected: false, name: '', type: 'unavailable' };
  }

  try {
    return await nativeModule.getCurrentOutput();
  } catch {
    return { connected: false, name: '', type: 'unknown' };
  }
}

export function describeOutputRoute(route: OutputRoute): string {
  if (!route.connected || !route.name) return '出力先を確認できません';
  return route.name;
}