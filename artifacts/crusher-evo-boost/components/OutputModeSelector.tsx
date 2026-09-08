import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OutputModeId } from '@/audio/outputModes';
import { getOutputMode, OUTPUT_MODES } from '@/audio/outputModes';
import type { OutputRoute } from '@/audio/outputRoute';
import { describeOutputRoute } from '@/audio/outputRoute';
import { useColors } from '@/hooks/useColors';

type OutputModeSelectorProps = {
  selectedMode: OutputModeId;
  onChange: (mode: OutputModeId) => void;
  route: OutputRoute;
  onOpenAnalysis: () => void;
};

export function OutputModeSelector({ selectedMode, onChange, route, onOpenAnalysis }: OutputModeSelectorProps) {
  const colors = useColors();
  const selected = getOutputMode(selectedMode);

  return (
    <View style={styles.wrapper}>
      <View style={styles.heading}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>OUTPUT ROUTING</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>EQのかけ方</Text>
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

      <View style={styles.list}>
        {OUTPUT_MODES.map((mode) => {
          const active = mode.id === selectedMode;
          return (
            <Pressable
              key={mode.id}
              testID={`output-mode-${mode.id}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: !mode.available }}
              disabled={!mode.available}
              onPress={() => {
                onChange(mode.id);
                if (mode.id === 'analysis') onOpenAnalysis();
              }}
              style={({ pressed }) => [
                styles.modeCard,
                {
                  backgroundColor: active ? colors.secondary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: !mode.available ? 0.5 : pressed ? 0.72 : 1,
                },
              ]}
            >
              <View style={[styles.radio, { borderColor: active ? colors.primary : colors.border }]}>
                {active ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
              </View>
              <View style={styles.modeCopy}>
                <View style={styles.modeTitleRow}>
                  <Text style={[styles.modeTitle, { color: colors.foreground }]}>{mode.title}</Text>
                  <Text style={[styles.modeStatus, { color: active ? colors.primary : colors.mutedForeground }]}>
                    {mode.status}
                  </Text>
                </View>
                <Text style={[styles.modeDescription, { color: colors.mutedForeground }]}>{mode.description}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.detail, { backgroundColor: colors.accent }]}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={[styles.detailText, { color: colors.mutedForeground }]}>{selected.detail}</Text>
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
  list: { gap: 8 },
  modeCard: { minHeight: 65, borderRadius: 17, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 9, height: 9, borderRadius: 4.5 },
  modeCopy: { flex: 1, gap: 4 },
  modeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modeTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  modeStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  modeDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  detail: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 8 },
  detailText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});