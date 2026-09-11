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
  source?: 'read' | 'notify';
  operation?: 'read' | 'write' | 'writeWithoutResponse';
  enabled?: boolean;
  capturedAt?: number;
};

const MAX_ANALYSIS_EVENTS = 250;

type CrusherAnalysisModule = {
  startBluetoothAnalysis: () => Promise<void>;
  stopBluetoothAnalysis: () => Promise<void>;
  connectAnalysisPeripheral: (identifier: string) => Promise<void>;
  readAnalysisCharacteristic: (
    identifier: string,
    serviceUuid: string,
    characteristicUuid: string,
  ) => Promise<void>;
  setAnalysisNotify: (
    identifier: string,
    serviceUuid: string,
    characteristicUuid: string,
    enabled: boolean,
  ) => Promise<void>;
  writeAnalysisCharacteristic: (
    identifier: string,
    serviceUuid: string,
    characteristicUuid: string,
    hex: string,
    withoutResponse: boolean,
  ) => Promise<void>;
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
    const capturedEvent = { ...event, capturedAt: Date.now() };
    analysisEvents = [...analysisEvents, capturedEvent].slice(-MAX_ANALYSIS_EVENTS);
    analysisListeners.forEach((listener) => listener(capturedEvent));
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

export async function readAnalysisCharacteristic(
  identifier: string,
  serviceUuid: string,
  characteristicUuid: string,
): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.readAnalysisCharacteristic(identifier, serviceUuid, characteristicUuid);
  return true;
}

export async function setAnalysisNotify(
  identifier: string,
  serviceUuid: string,
  characteristicUuid: string,
  enabled: boolean,
): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.setAnalysisNotify(identifier, serviceUuid, characteristicUuid, enabled);
  return true;
}

export async function writeAnalysisCharacteristic(
  identifier: string,
  serviceUuid: string,
  characteristicUuid: string,
  hex: string,
  withoutResponse: boolean,
): Promise<boolean> {
  const nativeModule = getNativeModule();
  if (!nativeModule) return false;
  await nativeModule.writeAnalysisCharacteristic(
    identifier,
    serviceUuid,
    characteristicUuid,
    hex,
    withoutResponse,
  );
  return true;
}