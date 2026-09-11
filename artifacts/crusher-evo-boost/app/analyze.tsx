import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  clearAnalysisEvents,
  connectAnalysisPeripheral,
  getAnalysisSnapshot,
  isBluetoothAnalysisAvailable,
  readAnalysisCharacteristic,
  setAnalysisNotify,
  startBluetoothAnalysis,
  stopBluetoothAnalysis,
  subscribeToAnalysis,
  writeAnalysisCharacteristic,
  type AnalysisEvent,
} from '@/audio/bluetoothAnalysis';
import { useColors } from '@/hooks/useColors';

export default function AnalysisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const initialSnapshot = getAnalysisSnapshot();
  const [events, setEvents] = useState<AnalysisEvent[]>(initialSnapshot.events);
  const [running, setRunning] = useState(initialSnapshot.running);
  const [payloads, setPayloads] = useState<Record<string, string>>({});
  const [notifyStates, setNotifyStates] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const available = isBluetoothAnalysisAvailable();

  useEffect(() => {
    const subscription = subscribeToAnalysis((event) => {
      setEvents(getAnalysisSnapshot().events);
      setRunning(getAnalysisSnapshot().running);
    });
    return () => subscription.remove();
  }, []);

  const peripherals = useMemo(
    () => events.filter((event) => event.type === 'peripheral' && event.id).filter((event, index, all) => all.findIndex((item) => item.id === event.id) === index),
    [events],
  );
  const connectedDeviceId = useMemo(
    () => [...events].reverse().find((event) => event.type === 'connected' && event.id)?.id ?? peripherals[0]?.id ?? '',
    [events, peripherals],
  );
  const services = useMemo(
    () =>
      events
        .filter((event) => event.type === 'service' && event.uuid)
        .filter((event, index, all) => all.findIndex((item) => item.uuid === event.uuid && item.peripheralId === event.peripheralId) === index),
    [events],
  );
  const characteristics = useMemo(() => {
    const rows = events.filter((event) => event.type === 'characteristic' && event.uuid && event.serviceUuid);
    return rows
      .filter(
        (event, index, all) =>
          all.findIndex(
            (item) =>
              item.uuid === event.uuid &&
              item.serviceUuid === event.serviceUuid &&
              item.peripheralId === event.peripheralId,
          ) === index,
      )
      .map((event) => {
        const value = [...events]
          .reverse()
          .find(
            (item) =>
              item.type === 'value' &&
              item.uuid === event.uuid &&
              item.serviceUuid === event.serviceUuid &&
              item.peripheralId === event.peripheralId,
          );
        return { ...event, value };
      });
  }, [events]);
  const summary = useMemo(
    () => ({
      devices: peripherals.length,
      connected: new Set(events.filter((event) => event.type === 'connected').map((event) => event.id)).size,
      services: services.length,
      characteristics: characteristics.length,
      values: events.filter((event) => event.type === 'value').length,
      writable: characteristics.filter((event) => event.properties?.includes('write')).length,
    }),
    [events, peripherals.length, services.length, characteristics],
  );

  const start = async () => {
    if (!available) {
      Alert.alert(
        'Bluetoothモジュールを利用できません',
        'このアプリのネイティブモジュールが読み込まれていません。最新のSideloadly IPAを再インストールして、Expo Goや古いIPAではなくこのアプリを起動してください。',
      );
      return;
    }
    clearAnalysisEvents();
    setEvents([]);
    setRunning(true);
    try {
      const started = await startBluetoothAnalysis();
      if (!started) {
        setRunning(false);
        Alert.alert('解析を開始できません', 'Bluetooth解析用のネイティブモジュールが利用できません。Sideloadly版IPAを確認してください。');
      }
    } catch (error) {
      setRunning(false);
      Alert.alert('解析を開始できません', error instanceof Error ? error.message : 'Bluetooth解析を開始できませんでした。');
    }
  };

  const stop = async () => {
    try {
      await stopBluetoothAnalysis();
    } finally {
      setRunning(false);
    }
  };

  const shareLog = async () => {
    if (!events.length) {
      Alert.alert('ログがありません', '先にBluetoothスキャンを実行してください。');
      return;
    }
    await Share.share({
      title: 'Crusher EVO Bluetooth analysis',
      message: JSON.stringify({ capturedAt: new Date().toISOString(), events }, null, 2),
    });
  };

  const readCharacteristic = async (serviceUuid: string, characteristicUuid: string, peripheralId?: string) => {
    const identifier = peripheralId || connectedDeviceId;
    if (!identifier) {
      Alert.alert('接続先がありません', 'Crusher EVOを接続してから実行してください。');
      return;
    }
    const key = `${serviceUuid}:${characteristicUuid}`;
    setBusyKey(key);
    try {
      const ok = await readAnalysisCharacteristic(identifier, serviceUuid, characteristicUuid);
      if (!ok) Alert.alert('実行できません', 'ネイティブBluetoothモジュールが利用できません。');
    } finally {
      setBusyKey(null);
    }
  };

  const toggleNotify = async (serviceUuid: string, characteristicUuid: string, peripheralId?: string) => {
    const identifier = peripheralId || connectedDeviceId;
    if (!identifier) {
      Alert.alert('接続先がありません', 'Crusher EVOを接続してから実行してください。');
      return;
    }
    const key = `${serviceUuid}:${characteristicUuid}`;
    const enabled = !notifyStates[key];
    setBusyKey(key);
    try {
      const ok = await setAnalysisNotify(identifier, serviceUuid, characteristicUuid, enabled);
      if (ok) setNotifyStates((current) => ({ ...current, [key]: enabled }));
    } finally {
      setBusyKey(null);
    }
  };

  const writeCharacteristic = async (serviceUuid: string, characteristicUuid: string, peripheralId?: string) => {
    const identifier = peripheralId || connectedDeviceId;
    const key = `${serviceUuid}:${characteristicUuid}`;
    const hex = payloads[key]?.trim() || '';
    if (!identifier) {
      Alert.alert('接続先がありません', 'Crusher EVOを接続してから実行してください。');
      return;
    }
    if (!/^(?:[0-9a-fA-F]{2})(?:[\s:-]*[0-9a-fA-F]{2})*$/.test(hex)) {
      Alert.alert('payloadを確認してください', 'スペース区切りの16進数を入力してください。例: 01 00 FF');
      return;
    }
    const characteristic = characteristics.find(
      (event) => event.serviceUuid === serviceUuid && event.uuid === characteristicUuid,
    );
    const properties = characteristic?.properties?.split(',') ?? [];
    const withoutResponse = properties.includes('writeWithoutResponse') && !properties.includes('write');
    Alert.alert(
      'BLE書き込みを実行します',
      `${serviceUuid} / ${characteristicUuid}\n${hex}\n\n本体動作が変わる可能性があります。送信しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '送信',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusyKey(key);
              try {
                await writeAnalysisCharacteristic(
                  identifier,
                  serviceUuid,
                  characteristicUuid,
                  hex,
                  Boolean(withoutResponse),
                );
              } finally {
                setBusyKey(null);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: '解析モード', headerBackTitle: 'Home' }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 40 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Feather name="chevron-left" size={18} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>戻る</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>BLUETOOTH LAB</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Crusher EVOを解析</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          公式アプリと切断した状態で、Bluetooth LEの構成を確認し、接続中のCharacteristicを実際に操作します。
        </Text>

        <View style={[styles.warning, { backgroundColor: colors.accent }]}>
          <Feather name="shield" size={16} color={colors.primary} />
          <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
            スキャンとreadは自動で行います。writeは自動送信せず、GATTワークベンチでpayloadを入力して確認後に実行します。公式アプリの通信は盗聴しません。
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={running ? stop : start}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name={running ? 'square' : 'bluetooth'} size={17} color={colors.primaryForeground} />
            <Text style={[styles.primaryLabel, { color: colors.primaryForeground }]}>
              {running ? '解析を停止' : 'Bluetoothスキャン開始'}
            </Text>
          </Pressable>
          <Pressable
            onPress={shareLog}
            style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="share-2" size={16} color={colors.foreground} />
            <Text style={[styles.secondaryLabel, { color: colors.foreground }]}>ログを共有</Text>
          </Pressable>
        </View>

        {events.length > 0 ? (
          <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.logHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>今回の収集結果</Text>
              <Text style={[styles.count, { color: colors.mutedForeground }]}>解釈ではなく観測値</Text>
            </View>
            <View style={styles.summaryGrid}>
              <SummaryItem label="機器" value={summary.devices} colors={colors} />
              <SummaryItem label="接続" value={summary.connected} colors={colors} />
              <SummaryItem label="サービス" value={summary.services} colors={colors} />
              <SummaryItem label="Characteristic" value={summary.characteristics} colors={colors} />
              <SummaryItem label="読み取り値" value={summary.values} colors={colors} />
              <SummaryItem label="書き込み候補" value={summary.writable} colors={colors} />
            </View>
            <Text style={[styles.summaryNote, { color: colors.mutedForeground }]}>
              「書き込み候補」はwrite権限が見えるだけで、EQ設定用とは判定できません。
            </Text>
          </View>
        ) : null}

        {characteristics.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.logHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>GATTワークベンチ</Text>
              <Text style={[styles.count, { color: colors.mutedForeground }]}>実機操作</Text>
            </View>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              read・notify・writeをCharacteristic単位で実行できます。payloadは自動送信せず、入力した値だけを送ります。
            </Text>
            {characteristics.map((characteristic) => {
              const serviceUuid = characteristic.serviceUuid || '';
              const uuid = characteristic.uuid || '';
              const key = `${serviceUuid}:${uuid}`;
              const properties = characteristic.properties?.split(',') ?? [];
              const canRead = properties.includes('read');
              const canNotify = properties.includes('notify') || properties.includes('indicate');
              const canWrite = properties.includes('write') || properties.includes('writeWithoutResponse');
              return (
                <View key={key} style={[styles.characteristicCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.characteristicTitle, { color: colors.foreground }]}>{uuid}</Text>
                  <Text style={[styles.characteristicMeta, { color: colors.mutedForeground }]}>
                    {serviceUuid} · {characteristic.properties || '—'}
                  </Text>
                  {characteristic.value ? (
                    <Text style={[styles.valueText, { color: colors.foreground }]} numberOfLines={2}>
                      {characteristic.value.hex || '(empty)'} · {characteristic.value.length ?? 0} bytes · {characteristic.value.source || 'read'}
                    </Text>
                  ) : null}
                  <View style={styles.operationRow}>
                    {canRead ? (
                      <Pressable
                        onPress={() => void readCharacteristic(serviceUuid, uuid, characteristic.peripheralId)}
                        disabled={busyKey === key}
                        style={[styles.operationButton, { borderColor: colors.border, opacity: busyKey === key ? 0.5 : 1 }]}
                      >
                        <Text style={[styles.operationLabel, { color: colors.foreground }]}>READ</Text>
                      </Pressable>
                    ) : null}
                    {canNotify ? (
                      <Pressable
                        onPress={() => void toggleNotify(serviceUuid, uuid, characteristic.peripheralId)}
                        disabled={busyKey === key}
                        style={[styles.operationButton, { borderColor: colors.border, opacity: busyKey === key ? 0.5 : 1 }]}
                      >
                        <Text style={[styles.operationLabel, { color: colors.foreground }]}>
                          {notifyStates[key] ? 'STOP NOTIFY' : 'NOTIFY'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {canWrite ? (
                    <View style={styles.writeRow}>
                      <TextInput
                        value={payloads[key] || ''}
                        onChangeText={(value) => setPayloads((current) => ({ ...current, [key]: value }))}
                        placeholder="例: 01 00 FF"
                        placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="characters"
                        style={[styles.payloadInput, { color: colors.foreground, borderColor: colors.border }]}
                      />
                      <Pressable
                        onPress={() => void writeCharacteristic(serviceUuid, uuid, characteristic.peripheralId)}
                        disabled={busyKey === key}
                        style={[styles.writeButton, { backgroundColor: colors.primary, opacity: busyKey === key ? 0.5 : 1 }]}
                      >
                        <Text style={[styles.writeLabel, { color: colors.primaryForeground }]}>WRITE</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {peripherals.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>検出した機器</Text>
            {peripherals.map((peripheral) => (
              <Pressable
                key={peripheral.id}
                onPress={() => peripheral.id && void connectAnalysisPeripheral(peripheral.id)}
                style={[styles.peripheral, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.peripheralIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="headphones" size={16} color={colors.foreground} />
                </View>
                <View style={styles.peripheralCopy}>
                  <Text style={[styles.peripheralName, { color: colors.foreground }]}>{peripheral.name || 'Unknown'}</Text>
                  <Text style={[styles.peripheralMeta, { color: colors.mutedForeground }]}>
                    {peripheral.id} · RSSI {peripheral.rssi ?? '—'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.logHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>解析ログ</Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>{events.length} events</Text>
          </View>
          <View style={[styles.log, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {events.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>スキャンを開始すると、ここにサービス情報が表示されます。</Text>
            ) : (
              events.slice(-40).map((event, index) => (
                <Text key={`${event.type}-${index}`} style={[styles.logLine, { color: colors.mutedForeground }]}>
                  {formatEvent(event)}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function formatEvent(event: AnalysisEvent): string {
  if (event.type === 'peripheral') return `[device] ${event.name || 'Unknown'} (${event.id || '—'})`;
  if (event.type === 'connected') return `[connected] ${event.name || 'Unknown'} (${event.id || '—'})`;
  if (event.type === 'service') return `[service] ${event.uuid}`;
  if (event.type === 'characteristic') {
    return `[characteristic] ${event.serviceUuid || '—'} / ${event.uuid} · ${event.properties || '—'}`;
  }
  if (event.type === 'value') return `[${event.source || 'read'}] ${event.uuid} · ${event.hex || '(empty)'} (${event.length ?? 0} bytes)`;
  if (event.type === 'operation') return `[${event.operation || 'operation'}] ${event.uuid || ''} · ${event.message || ''}`;
  if (event.type === 'writeAck') return `[write ack] ${event.uuid || ''} · ${event.message || ''}`;
  if (event.type === 'writeError') return `[write error] ${event.uuid || ''} · ${event.message || ''}`;
  if (event.type === 'notifyState') return `[notify] ${event.uuid || ''} · ${event.enabled ? 'on' : 'off'}`;
  const timestamp = event.capturedAt ? ` ${formatTimestamp(event.capturedAt)}` : '';
  return `[${event.type}]${timestamp} ${event.message || event.name || ''}`;
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function SummaryItem({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.summaryItem, { backgroundColor: colors.background }]}>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  backText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -1.1, marginTop: 2 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 2 },
  warning: { borderRadius: 17, padding: 13, flexDirection: 'row', gap: 9 },
  warningText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  actions: { gap: 9 },
  primaryButton: { minHeight: 50, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  primaryLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  secondaryButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  secondaryLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  summaryItem: { width: '31%', minHeight: 53, borderRadius: 11, padding: 8, justifyContent: 'center', gap: 2 },
  summaryValue: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  summaryLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  summaryNote: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  section: { gap: 8, marginTop: 4 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  characteristicCard: { borderRadius: 15, borderWidth: 1, padding: 11, gap: 7 },
  characteristicTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  characteristicMeta: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14 },
  valueText: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15 },
  operationRow: { flexDirection: 'row', gap: 7 },
  operationButton: { minHeight: 31, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
  operationLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  writeRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  payloadInput: { flex: 1, minHeight: 38, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, fontFamily: 'Inter_500Medium', fontSize: 11 },
  writeButton: { minHeight: 38, borderRadius: 9, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  writeLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  logHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  peripheral: { minHeight: 63, borderRadius: 16, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  peripheralIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  peripheralCopy: { flex: 1, gap: 3 },
  peripheralName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  peripheralMeta: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  log: { minHeight: 170, borderRadius: 16, borderWidth: 1, padding: 12 },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  logLine: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 15 },
});