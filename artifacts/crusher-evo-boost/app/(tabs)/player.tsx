import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BassTestCard } from '@/components/BassTestCard';
import { activateAudioSession, subscribeToOutputRoute, type OutputRoute } from '@/audio/outputRoute';
import { useProfiles } from '@/context/ProfileContext';
import { useColors } from '@/hooks/useColors';

const BAND_LABELS = ['60', '150', '400', '1K', '4K'];

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeProfile } = useProfiles();
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
    refreshOutputRoute();
    const routeSubscription = subscribeToOutputRoute(setOutputRoute);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshOutputRoute();
    });
    return () => {
      routeSubscription.remove();
      appStateSubscription.remove();
    };
  }, [refreshOutputRoute]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>PLAYER · EQ ACTIVE</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>音楽を再生</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          このタブで再生した音源だけに、現在のEQ設定がかかります。
        </Text>
      </View>

      <View style={[styles.scopeCard, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
        <View style={[styles.scopeIcon, { backgroundColor: colors.primary }]}>
          <Feather name="sliders" size={17} color={colors.primaryForeground} />
        </View>
        <View style={styles.scopeCopy}>
          <Text style={[styles.scopeTitle, { color: colors.foreground }]}>適用中: {activeProfile.name}</Text>
          <Text style={[styles.scopeBody, { color: colors.mutedForeground }]}>
            低音ブースト {activeProfile.bassEnabled !== false ? 'ON' : 'OFF'} · {activeProfile.bassBoost}% ／ Sub-bass {activeProfile.subBass > 0 ? '+' : ''}{activeProfile.subBass} dB
          </Text>
        </View>
        <View style={[styles.livePill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.liveText, { color: colors.primaryForeground }]}>LIVE</Text>
        </View>
      </View>

      <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name={outputRoute.isBluetooth ? 'bluetooth' : 'volume-2'} size={17} color={colors.primary} />
        <View style={styles.routeCopy}>
          <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>再生出力</Text>
          <Text style={[styles.routeName, { color: colors.foreground }]}>
            {outputRoute.isBluetooth && outputRoute.name
              ? outputRoute.name
              : outputRoute.isBluetooth
                ? 'Bluetoothオーディオ'
                : outputRoute.connected
                  ? 'iPhoneスピーカー'
                  : '出力先を確認中'}
          </Text>
        </View>
        <View style={[styles.routeDot, { backgroundColor: outputRoute.isBluetooth ? colors.primary : colors.mutedForeground }]} />
      </View>

      <BassTestCard
        bassBoost={activeProfile.bassBoost}
        bassEnabled={activeProfile.bassEnabled !== false}
        subBass={activeProfile.subBass}
        bands={activeProfile.bands}
      />

      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EFFECTIVE EQ</Text>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>再生中に使う設定</Text>
        </View>
        <Text style={[styles.unit, { color: colors.mutedForeground }]}>dB</Text>
      </View>

      <View style={[styles.eqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.bandRow}>
          {activeProfile.bands.map((value, index) => (
            <View key={BAND_LABELS[index]} style={styles.band}>
              <Text style={[styles.bandValue, { color: value > 0 ? colors.primary : colors.foreground }]}>
                {value > 0 ? '+' : ''}{value}
              </Text>
              <Text style={[styles.bandLabel, { color: colors.mutedForeground }]}>{BAND_LABELS[index]}Hz</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Homeで変更した値は、再生中の音源にも反映されます。Playerを停止すると、アプリの音声処理も停止します。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  header: { gap: 6, marginBottom: 2 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -1.1, marginTop: 3 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  scopeCard: { minHeight: 76, borderRadius: 19, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scopeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scopeCopy: { flex: 1, gap: 4 },
  scopeTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  scopeBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  livePill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  liveText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.7 },
  routeCard: { minHeight: 58, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeCopy: { flex: 1, gap: 2 },
  routeLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  routeName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 3 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20, marginTop: 4 },
  unit: { fontFamily: 'Inter_500Medium', fontSize: 12, paddingBottom: 3 },
  eqCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 14 },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  band: { alignItems: 'center', gap: 6, flex: 1 },
  bandValue: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  bandLabel: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});