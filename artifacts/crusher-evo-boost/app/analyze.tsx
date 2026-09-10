import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  clearAnalysisEvents,
  connectAnalysisPeripheral,
  getAnalysisSnapshot,
  isBluetoothAnalysisAvailable,
  startBluetoothAnalysis,
  stopBluetoothAnalysis,
  subscribeToAnalysis,
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
  const summary = useMemo(
    () => ({
      devices: peripherals.length,
      connected: events.filter((event) => event.type === 'connected').length,
      services: events.filter((event) => event.type === 'service').length,
      characteristics: events.filter((event) => event.type === 'characteristic').length,
      values: events.filter((event) => event.type === 'value').length,
      writable: events.filter((event) => event.type === 'characteristic' && event.properties?.includes('write')).length,
    }),
    [events, peripherals.length],
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
          公式アプリと切断した状態で、公開されているBluetooth LEサービスと読み取り可能な値を確認します。
        </Text>

        <View style={[styles.warning, { backgroundColor: colors.accent }]}>
          <Feather name="shield" size={16} color={colors.primary} />
          <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
            読み取り専用です。検出・接続・サービス・Characteristic・読み取り値を記録します。EQ値の書き込みや、公式アプリの通信の盗聴は行いません。
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
  if (event.type === 'value') return `[read] ${event.uuid} · ${event.hex || '(empty)'} (${event.length ?? 0} bytes)`;
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