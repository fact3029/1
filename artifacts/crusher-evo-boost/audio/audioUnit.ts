import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type { EqProfile } from '@/context/ProfileContext';

type CrusherAudioUnitModule = {
  syncProfile: (bassBoost: number, subBass: number, bands: number[]) => Promise<void>;
};

export type AudioUnitSyncResult = {
  available: boolean;
  error?: string;
};

function getNativeAudioUnit(): CrusherAudioUnitModule | null {
  if (Platform.OS !== 'ios') return null;

  try {
    return requireNativeModule<CrusherAudioUnitModule>('CrusherAudioUnit');
  } catch {
    // Expo Go and older builds do not contain the AUv3 companion module.
    return null;
  }
}

export async function syncProfileToAudioUnit(profile: EqProfile): Promise<AudioUnitSyncResult> {
  const nativeAudioUnit = getNativeAudioUnit();
  if (!nativeAudioUnit) return { available: false };

  try {
    await nativeAudioUnit.syncProfile(profile.bassBoost, profile.subBass, profile.bands);
    return { available: true };
  } catch (error) {
    return {
      available: true,
      error: error instanceof Error ? error.message : 'Audio Unit設定を同期できませんでした。',
    };
  }
}