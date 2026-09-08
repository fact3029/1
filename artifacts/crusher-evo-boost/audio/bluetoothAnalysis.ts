import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export type AnalysisEvent = {
  type: string;
  id?: string;
  name?: string;
  rssi?: number;
  uuid?: string;
  serviceUuid?: string;
  peripheralId?: string;
  properties?: string;
  hex?: string;
  length?: number;
  message?: string;
};

type CrusherAnalysisModule = {
  startBluetoothAnalysis: () => Promise<void>;
  stopBluetoothAnalysis: () => Promise<void>;
  connectAnalysisPeripheral: (identifier: string) => Promise<void>;
  addListener: (
    eventName: 'analysisEvent',
    listener: (event: AnalysisEvent) => void,
  ) => { remove: () => void };
};

function getNativeModule(): CrusherAnalysisModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule<CrusherAnalysisModule>('CrusherAudioUnit');
  } catch {
    return null;
  }
}

export function isBluetoothAnalysisAvailable(): boolean {
  return getNativeModule() !== null;
}

export function subscribeToAnalysis(listener: (event: AnalysisEvent) => void): { remove: () => void } {
  const nativeModule = getNativeModule();
  if (!nativeModule) return { remove: () => undefined };
  return nativeModule.addListener('analysisEvent', listener);
}

export async function startBluetoothAnalysis(): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.startBluetoothAnalysis();
  return true;
}

export async function stopBluetoothAnalysis(): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.stopBluetoothAnalysis();
  return true;
}

export async function connectAnalysisPeripheral(identifier: string): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.connectAnalysisPeripheral(identifier);
  return true;
}