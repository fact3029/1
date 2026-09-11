import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OutputModeId } from '@/audio/outputModes';
import { getOutputMode } from '@/audio/outputModes';
import type { OutputRoute } from '@/audio/outputRoute';
import { describeOutputRoute } from '@/audio/outputRoute';
import { useColors } from '@/hooks/useColors';

type OutputModeSelectorProps = {
  onChange: (mode: OutputModeId) => void;
  route: OutputRoute;
  onOpenAnalysis: () => void;
  onOpenPlayer: () => void;
};

export function OutputModeSelector({ onChange, route, onOpenAnalysis, onOpenPlayer }: OutputModeSelectorProps) {
  const colors = useColors();
  const appliedMode = getOutputMode('app-test');

  return (
    <View style={styles.wrapper}>
      <View style={styles.heading}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>EQ SCOPE</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>EQが効く場所</Text>
        </View>
        <Feather name="sliders" size={18} color={colors.primary} />
      </View>

      <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.routeIcon, { backgroundColor: colors.accent }]}>
          <Feather name="headphones" size={16} color={colors.primary} />
        </View>
        <View style={styles.routeCopy}>
          <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>現在の出力先</Text>
          <Text style={[styles.routeName, { color: colors.foreground }]}>{describeOutputRoute(route)}</Text>
        </View>
        <View style={[styles.routeDot, { backgroundColor: route.connected ? colors.primary : colors.border }]} />
      </View>

      <View style={[styles.appliedCard, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
        <View style={[styles.appliedIcon, { backgroundColor: colors.primary }]}>
          <Feather name="check" size={16} color={colors.primaryForeground} />
        </View>
        <View style={styles.modeCopy}>
          <View style={styles.modeTitleRow}>
            <Text style={[styles.modeTitle, { color: colors.foreground }]}>{appliedMode.title}</Text>
            <Text style={[styles.modeStatus, { color: colors.primary }]}>実際に適用</Text>
          </View>
          <Text style={[styles.modeDescription, { color: colors.mutedForeground }]}>
            Filesの曲・内蔵テスト音源を、このアプリの再生中だけEQします。
          </Text>
        </View>
      </View>

      <View style={[styles.notAppliedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="slash" size={15} color={colors.mutedForeground} />
        <Text style={[styles.notAppliedText, { color: colors.mutedForeground }]}>
          Apple Music・YouTube・Crusher EVO本体DSPには適用しません。
        </Text>
      </View>

      <View style={[styles.detail, { backgroundColor: colors.accent }]}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={[styles.detailText, { color: colors.mutedForeground }]}>
          「低音ブースト」と5バンドEQは、Playerタブで再生する音源に反映されます。
        </Text>
      </View>
      <View style={styles.actionRow}>
        <Pressable
          testID="open-player"
          accessibilityRole="button"
          onPress={() => {
            onChange('app-test');
            onOpenPlayer();
          }}
          style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name="play" size={14} color={colors.primaryForeground} />
          <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>Playerを開く</Text>
        </Pressable>
        <Pressable
          testID="open-analysis"
          accessibilityRole="button"
          onPress={() => {
            onChange('analysis');
            onOpenAnalysis();
          }}
          style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="bluetooth" size={14} color={colors.foreground} />
          <Text style={[styles.secondaryActionLabel, { color: colors.foreground }]}>BLE Lab</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4, marginTop: 2 },
  routeCard: { minHeight: 58, borderRadius: 17, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  routeCopy: { flex: 1, gap: 2 },
  routeLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  routeName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  appliedCard: { minHeight: 78, borderRadius: 17, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  appliedIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  notAppliedCard: { minHeight: 48, borderRadius: 15, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  notAppliedText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  modeCopy: { flex: 1, gap: 4 },
  modeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modeTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  modeStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  modeDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  detail: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 8 },
  detailText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { minHeight: 42, flex: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  secondaryAction: { minHeight: 42, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});