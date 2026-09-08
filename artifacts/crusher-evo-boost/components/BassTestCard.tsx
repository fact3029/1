import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BassTestSession, startBassTest } from '@/audio/audioEngine';
import { useColors } from '@/hooks/useColors';

type BassTestCardProps = {
  bassBoost: number;
  subBass: number;
};

export function BassTestCard({ bassBoost, subBass }: BassTestCardProps) {
  const colors = useColors();
  const [playing, setPlaying] = useState(false);
  const sessionRef = useRef<BassTestSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sessionRef.current?.stop();
    };
  }, []);

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sessionRef.current?.stop();
    sessionRef.current = null;
    setPlaying(false);
  };

  const toggle = async () => {
    if (playing) {
      stop();
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sessionRef.current = await startBassTest({ bassBoost, subBass });
    setPlaying(true);
    timerRef.current = setTimeout(stop, 8200);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.accent }]}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Feather name="volume-2" size={16} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>実音声テスト</Text>
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          低音フィルターを通した8秒のテスト音で、今の設定を確認できます。
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        testID="bass-test-toggle"
        onPress={() => void toggle()}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: pressed ? 0.72 : 1 },
        ]}
      >
        <Feather name={playing ? 'square' : 'play'} size={15} color={colors.primaryForeground} />
        <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>
          {playing ? '停止' : '再生'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  button: { minWidth: 66, height: 38, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});