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

const MAX_ANALYSIS_EVENTS = 250;

type CrusherAnalysisModule = {
  startBluetoothAnalysis: () => Promise<void>;
  stopBluetoothAnalysis: () => Promise<void>;
  connectAnalysisPeripheral: (identifier: string) => Promise<void>;
  addListener: (
    eventName: 'analysisEvent',
    listener: (event: AnalysisEvent) => void,
  ) => { remove: () => void };
};

let analysisEvents: AnalysisEvent[] = [];
let analysisRunning = false;
let nativeSubscription: { remove: () => void } | null = null;
const analysisListeners = new Set<(event: AnalysisEvent) => void>();

function getNativeModule(): CrusherAnalysisModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return requireNativeModule<CrusherAnalysisModule>('CrusherAudioUnit');
  } catch {
    return null;
  }
}

function ensureNativeEventBridge() {
  if (nativeSubscription) return;
  const nativeModule = getNativeModule();
  if (!nativeModule) return;

  nativeSubscription = nativeModule.addListener('analysisEvent', (event) => {
    analysisEvents = [...analysisEvents, event].slice(-MAX_ANALYSIS_EVENTS);
    analysisListeners.forEach((listener) => listener(event));
  });
}

export function isBluetoothAnalysisAvailable(): boolean {
  return getNativeModule() !== null;
}

export function getAnalysisSnapshot(): { events: AnalysisEvent[]; running: boolean } {
  return {
    events: [...analysisEvents],
    running: analysisRunning,
  };
}

export function clearAnalysisEvents() {
  analysisEvents = [];
}

export function subscribeToAnalysis(listener: (event: AnalysisEvent) => void): { remove: () => void } {
  ensureNativeEventBridge();
  analysisListeners.add(listener);
  return {
    remove: () => {
      analysisListeners.delete(listener);
    },
  };
}

export async function startBluetoothAnalysis(): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  ensureNativeEventBridge();
  analysisRunning = true;
  await nativeModule.startBluetoothAnalysis();
  return true;
}

export async function stopBluetoothAnalysis(): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.stopBluetoothAnalysis();
  analysisRunning = false;
  return true;
}

export async function connectAnalysisPeripheral(identifier: string): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.connectAnalysisPeripheral(identifier);
  return true;
}