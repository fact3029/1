import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { BassTestSession, startAudioFile, startBassTest } from '@/audio/audioEngine';
import { useColors } from '@/hooks/useColors';

type BassTestCardProps = {
  bassBoost: number;
  bassEnabled: boolean;
  subBass: number;
  bands: number[];
};

type PlayerSource =
  | { kind: 'file'; uri: string; name: string }
  | { kind: 'builtIn'; id: string; name: string };

export function BassTestCard({ bassBoost, bassEnabled, subBass, bands }: BassTestCardProps) {
  const colors = useColors();
  const [playing, setPlaying] = useState(false);
  const [source, setSource] = useState<PlayerSource | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sessionRef = useRef<BassTestSession | null>(null);
  const startingRef = useRef(false);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    sessionRef.current?.update({ bassBoost, bassEnabled, subBass, bands });
  }, [bassBoost, bassEnabled, subBass, bands]);

  useEffect(() => {
    if (!playing) return;

    const timer = setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;

      const next = session.getPosition();
      setPosition(next.currentTime);
      setDuration(next.duration);

      if (next.duration > 0 && next.currentTime >= next.duration - 0.15) {
        session.stop();
        sessionRef.current = null;
        setPosition(next.duration);
        setPlaying(false);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [playing]);

  const stop = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setPlaying(false);
    setPosition(0);
  };

  const toggle = async () => {
    if (startingRef.current) return;

    if (playing) {
      stop();
      return;
    }

    if (!source) {
      Alert.alert('音源を選択してください', 'Filesの音源、または「内蔵テスト音源を使う」を選択してください。');
      return;
    }

    startingRef.current = true;
    setErrorMessage(null);
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      sessionRef.current?.stop();
      sessionRef.current = null;
      const session =
        source.kind === 'file'
          ? await startAudioFile(source.uri, { bassBoost, bassEnabled, subBass, bands })
          : await startBassTest({ bassBoost, bassEnabled, subBass, bands }, source.id);
      sessionRef.current = session;
      const initialPosition = session.getPosition();
      setPosition(initialPosition.currentTime);
      setDuration(initialPosition.duration);
      setPlaying(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '音声ファイルを再生できませんでした。';
      setErrorMessage(message);
      Alert.alert('再生できません', message);
    } finally {
      startingRef.current = false;
      setLoading(false);
    }
  };

  const chooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    if (playing) stop();
    setPosition(0);
    setDuration(0);
    setErrorMessage(null);
    setSource({ kind: 'file', uri: result.assets[0].uri, name: result.assets[0].name });
  };

  const chooseBuiltInTest = () => {
    if (playing) stop();
    setPosition(0);
    setDuration(0);
    setErrorMessage(null);
    setSource({ kind: 'builtIn', id: 'crusher-pulse', name: 'Crusher Pulse（内蔵テスト）' });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.accent }]}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Feather name="headphones" size={16} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>アプリ内プレイヤー</Text>
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Filesの曲や内蔵テスト音源を、このアプリ内でEQして再生します。Apple Music・YouTube・Crusher EVO本体DSPには適用されません。
        </Text>
        <Pressable
          testID="choose-audio-file"
          accessibilityRole="button"
          onPress={() => void chooseFile()}
          style={({ pressed }) => [
            styles.chooseButton,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="folder" size={14} color={colors.foreground} />
          <Text numberOfLines={1} style={[styles.chooseLabel, { color: colors.foreground }]}>
            {source?.name ?? 'Filesから曲を選ぶ'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={chooseBuiltInTest}
          style={({ pressed }) => [
            styles.testButton,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="activity" size={14} color={colors.foreground} />
          <Text style={[styles.testLabel, { color: colors.foreground }]}>内蔵テスト音源を使う</Text>
        </Pressable>
        {source ? (
          <View style={styles.playerControls}>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{formatTime(position)}</Text>
              <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{formatTime(duration)}</Text>
            </View>
            {duration > 0 ? (
              <ProgressScrubber
                position={position}
                duration={duration}
                onSeek={(nextPosition) => {
                  sessionRef.current?.seek(nextPosition);
                  setPosition(nextPosition);
                }}
                trackColor={colors.secondary}
                fillColor={colors.primary}
                thumbBorderColor={colors.card}
              />
            ) : (
              <View style={styles.scrubberTouch}>
                <View style={[styles.scrubberTrack, { backgroundColor: colors.secondary }]} />
              </View>
            )}
            <View style={styles.seekRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="10秒戻る"
                onPress={() => seekBy(-10)}
                style={({ pressed }) => [styles.seekButton, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
              >
                <Feather name="rotate-ccw" size={13} color={colors.foreground} />
                <Text style={[styles.seekLabel, { color: colors.foreground }]}>10秒</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="10秒進む"
                onPress={() => seekBy(10)}
                style={({ pressed }) => [styles.seekButton, { borderColor: colors.border, opacity: pressed ? 0.65 : 1 }]}
              >
                <Feather name="rotate-cw" size={13} color={colors.foreground} />
                <Text style={[styles.seekLabel, { color: colors.foreground }]}>10秒</Text>
              </Pressable>
            </View>
            <Text style={[styles.statusText, { color: errorMessage ? colors.destructive : colors.mutedForeground }]}>
              {errorMessage ?? (loading ? '音源を読み込んでいます…' : duration > 0 ? '再生位置をドラッグできます' : '再生時間を読み込んでいます…')}
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        testID="bass-test-toggle"
        onPress={() => void toggle()}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.primary, opacity: loading ? 0.65 : pressed ? 0.72 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Feather name={playing ? 'square' : 'play'} size={15} color={colors.primaryForeground} />
        )}
        <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>
          {loading ? '読み込み中…' : playing ? '停止' : '選択した曲を再生'}
        </Text>
      </Pressable>
    </View>
  );

  function seekBy(delta: number) {
    const nextPosition = Math.max(0, Math.min(duration, position + delta));
    sessionRef.current?.seek(nextPosition);
    setPosition(nextPosition);
  }
}

type ProgressScrubberProps = {
  position: number;
  duration: number;
  onSeek: (position: number) => void;
  trackColor: string;
  fillColor: string;
  thumbBorderColor: string;
};

function ProgressScrubber({
  position,
  duration,
  onSeek,
  trackColor,
  fillColor,
  thumbBorderColor,
}: ProgressScrubberProps) {
  const widthRef = useRef(1);
  const leftRef = useRef(0);
  const trackRef = useRef<View>(null);
  const ratio = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;

  const setFromPageX = (pageX: number) => {
    const nextRatio = Math.max(0, Math.min(1, (pageX - leftRef.current) / widthRef.current));
    onSeek(nextRatio * duration);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => setFromPageX(gestureState.moveX),
      onPanResponderMove: (_, gestureState) => setFromPageX(gestureState.moveX),
    }),
  ).current;

  return (
    <View
      ref={trackRef}
      onLayout={() => {
        trackRef.current?.measureInWindow((x, _y, width) => {
          if (width > 0) {
            widthRef.current = width;
            leftRef.current = x;
          }
        });
      }}
      hitSlop={{ top: 16, bottom: 16 }}
      accessibilityRole="adjustable"
      accessibilityLabel="再生位置"
      accessibilityValue={{ min: 0, max: duration, now: position }}
      style={styles.scrubberTouch}
      {...panResponder.panHandlers}
    >
      <View style={[styles.scrubberTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.scrubberFill, { backgroundColor: fillColor, width: `${ratio * 100}%` }]} />
        <View
          style={[
            styles.scrubberThumb,
            { backgroundColor: fillColor, borderColor: thumbBorderColor, left: `${ratio * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 15, gap: 12 },
  copy: { flex: 1, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  chooseButton: { minHeight: 36, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chooseLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10 },
  playerControls: { gap: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, fontVariant: ['tabular-nums'] },
  scrubberTouch: { height: 34, justifyContent: 'center' },
  scrubberTrack: { height: 6, borderRadius: 6, justifyContent: 'center' },
  scrubberFill: { height: 6, borderRadius: 6 },
  scrubberThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    borderWidth: 3,
  },
  seekRow: { flexDirection: 'row', gap: 8 },
  seekButton: { minHeight: 30, borderWidth: 1, borderRadius: 9, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  seekLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  testButton: { minHeight: 34, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  testLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  statusText: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  button: { alignSelf: 'stretch', minHeight: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  buttonLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});