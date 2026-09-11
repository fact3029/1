import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoostSlider } from '@/components/BoostSlider';
import { OutputModeSelector } from '@/components/OutputModeSelector';
import { activateAudioSession, openBluetoothSettings, subscribeToOutputRoute, type OutputRoute } from '@/audio/outputRoute';
import { useProfiles } from '@/context/ProfileContext';
import { useColors } from '@/hooks/useColors';

const BAND_LABELS = ['60', '150', '400', '1K', '4K'];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeProfile, hydrated, setOutputMode, updateActive, saveProfiles } = useProfiles();
  const [saved, setSaved] = useState(false);
  const [outputRoute, setOutputRoute] = useState<OutputRoute>({
    connected: false,
    isBluetooth: false,
    name: '',
    type: 'unknown',
  });

  const refreshOutputRoute = useCallback(() => {
    void activateAudioSession().then(setOutputRoute);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    refreshOutputRoute();
    const routeSubscription = subscribeToOutputRoute(setOutputRoute);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshOutputRoute();
    });
    return () => {
      routeSubscription.remove();
      appStateSubscription.remove();
    };
  }, [hydrated, refreshOutputRoute]);

  const save = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveProfiles();
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const openBluetooth = async () => {
    const opened = await openBluetoothSettings();
    if (!opened) {
      Alert.alert('Bluetooth設定', 'iPhoneの「設定」からBluetoothを開き、S6EVWを接続してください。');
    }
  };

  if (!hydrated) return <View style={[styles.loading, { backgroundColor: colors.background }]} />;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>CRUSHER EVO · S6EVW</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Bass, saved right.</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>好みの低音を、いつでも同じに。</Text>
        </View>
        <View style={[styles.logoMark, { backgroundColor: colors.accent }]}>
          <Feather name="headphones" size={22} color={colors.primary} />
        </View>
      </View>

      <View style={[styles.connectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.connectionIcon, { backgroundColor: colors.accent }]}>
          <Feather name="bluetooth" size={20} color={colors.primary} />
        </View>
        <View style={styles.connectionCopy}>
          <View style={styles.connectionTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {outputRoute.isBluetooth && outputRoute.name
                ? outputRoute.name
                : outputRoute.isBluetooth
                  ? 'Bluetoothオーディオ'
                : outputRoute.connected
                  ? 'iPhoneスピーカー'
                  : 'Bluetooth出力を確認中'}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: outputRoute.isBluetooth ? colors.primary : colors.mutedForeground }]} />
            <Text style={[styles.statusText, { color: outputRoute.isBluetooth ? colors.primary : colors.mutedForeground }]}>
              {outputRoute.isBluetooth ? 'Bluetooth接続済み' : outputRoute.connected ? 'スピーカー' : '未接続'}
            </Text>
          </View>
          <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
            {outputRoute.isBluetooth
              ? '本体DSPの検証が完了すれば、Apple Music・YouTubeを含む音声全体をEQできます。'
              : outputRoute.connected
                ? 'iPhoneのBluetooth設定でCrusher EVOを接続すると、ここに表示されます。'
                : 'iPhoneのBluetooth設定でCrusher EVOを接続してください.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          testID="open-bluetooth"
          onPress={openBluetooth}
          style={({ pressed }) => [styles.iconButton, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="external-link" size={16} color={colors.foreground} />
        </Pressable>
      </View>

      <OutputModeSelector
        onChange={setOutputMode}
        route={outputRoute}
        onOpenAnalysis={() => router.push('/analyze')}
        onOpenPlayer={() => router.push('/player')}
      />

      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACTIVE PROFILE</Text>
          <Text style={[styles.profileTitle, { color: colors.foreground }]}>{activeProfile.name}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          testID="open-presets"
          onPress={() => router.push('/presets')}
          style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.textButtonLabel, { color: colors.primary }]}>プリセット</Text>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.controlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <BoostSlider
          label="低音ブースト"
          helper="Playerで再生する音源にだけ適用"
          value={activeProfile.bassBoost}
          enabled={activeProfile.bassEnabled !== false}
          onToggle={() => updateActive({ bassEnabled: activeProfile.bassEnabled === false })}
          onChange={(value) => updateActive({ bassBoost: value })}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <BoostSlider
          label="Sub-bass"
          helper="低域の深さを追加（Playerのみ）"
          value={Math.round(((activeProfile.subBass + 6) / 12) * 100)}
          onChange={(value) => updateActive({ subBass: Math.round((value / 100) * 12 - 6) })}
        />
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FINE TUNE</Text>
          <Text style={[styles.profileTitle, { color: colors.foreground }]}>5-band EQ</Text>
        </View>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>dB</Text>
      </View>

      <View style={[styles.eqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.bandRow}>
          {activeProfile.bands.map((value, index) => (
            <View key={BAND_LABELS[index]} style={styles.band}>
              <View style={styles.bandValueRow}>
                <Pressable
                  testID={`band-minus-${BAND_LABELS[index]}`}
                  accessibilityRole="button"
                  onPress={() => {
                    const next = [...activeProfile.bands];
                    next[index] = Math.max(-6, value - 1);
                    updateActive({ bands: next });
                  }}
                  style={({ pressed }) => [styles.smallButton, { borderColor: colors.border, opacity: pressed ? 0.5 : 1 }]}
                >
                  <Feather name="minus" size={13} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.bandValue, { color: value > 0 ? colors.primary : colors.foreground }]}>
                  {value > 0 ? '+' : ''}{value}
                </Text>
                <Pressable
                  testID={`band-plus-${BAND_LABELS[index]}`}
                  accessibilityRole="button"
                  onPress={() => {
                    const next = [...activeProfile.bands];
                    next[index] = Math.min(6, value + 1);
                    updateActive({ bands: next });
                  }}
                  style={({ pressed }) => [styles.smallButton, { borderColor: colors.border, opacity: pressed ? 0.5 : 1 }]}
                >
                  <Feather name="plus" size={13} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={[styles.bandLabel, { color: colors.mutedForeground }]}>{BAND_LABELS[index]}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.eqHint, { color: colors.mutedForeground }]}>低域は60–150Hzを中心に調整しています</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        testID="save-profile"
        onPress={save}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
        ]}
      >
        <Feather name={saved ? 'check' : 'save'} size={18} color={colors.primaryForeground} />
        <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>
          {saved ? '保存しました' : `${activeProfile.name}を保存`}
        </Text>
      </Pressable>

      <View style={styles.note}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
          現在のPlayerは検証用です。本命はCrusher EVO本体DSPを制御し、Apple Music・YouTubeを含むBluetooth音声全体へEQを適用することです。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -1.2, marginTop: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 6 },
  logoMark: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  connectionCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 22, padding: 14, gap: 12 },
  connectionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  connectionCopy: { flex: 1, gap: 5 },
  connectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  cardBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  iconButton: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  profileTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 21, marginTop: 4 },
  textButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  textButtonLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  controlCard: { borderWidth: 1, borderRadius: 24, padding: 18, gap: 18 },
  divider: { height: 1 },
  unit: { fontFamily: 'Inter_500Medium', fontSize: 12, paddingBottom: 3 },
  eqCard: { borderWidth: 1, borderRadius: 24, padding: 16, gap: 14 },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  band: { alignItems: 'center', gap: 9, flex: 1 },
  bandValueRow: { alignItems: 'center', gap: 6 },
  smallButton: { width: 25, height: 25, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bandValue: { fontFamily: 'Inter_700Bold', fontSize: 13, minWidth: 27, textAlign: 'center' },
  bandLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  eqHint: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  saveButton: { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveLabel: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  note: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});
