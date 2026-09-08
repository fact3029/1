import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BUILT_IN_TRACKS, BassTestSession, startBassTest } from '@/audio/audioEngine';
import { useColors } from '@/hooks/useColors';

type BassTestCardProps = {
  bassBoost: number;
  subBass: number;
  bands: number[];
};

export function BassTestCard({ bassBoost, subBass, bands }: BassTestCardProps) {
  const colors = useColors();
  const [playing, setPlaying] = useState(false);
  const [trackId, setTrackId] = useState(BUILT_IN_TRACKS[0].id);
  const sessionRef = useRef<BassTestSession | null>(null);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  const stop = () => {
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
    sessionRef.current = await startBassTest({ bassBoost, subBass, bands }, trackId);
    setPlaying(true);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.accent }]}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Feather name="music" size={16} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>アプリ内音源プレイヤー</Text>
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          このアプリの音源をEQして、Bluetooth出力で確認できます。Apple MusicやYouTubeの音声は対象外です。
        </Text>
        <View style={styles.trackList}>
          {BUILT_IN_TRACKS.map((track) => {
            const selected = track.id === trackId;
            return (
              <Pressable
                key={track.id}
                testID={`built-in-track-${track.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (playing) stop();
                  setTrackId(track.id);
                }}
                style={({ pressed }) => [
                  styles.trackButton,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.trackTitle, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                  {track.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  copy: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  trackList: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  trackButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  trackTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  button: { minWidth: 66, height: 38, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});