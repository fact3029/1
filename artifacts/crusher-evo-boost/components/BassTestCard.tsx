import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { BassTestSession, startAudioFile } from '@/audio/audioEngine';
import { useColors } from '@/hooks/useColors';

type BassTestCardProps = {
  bassBoost: number;
  subBass: number;
  bands: number[];
};

export function BassTestCard({ bassBoost, subBass, bands }: BassTestCardProps) {
  const colors = useColors();
  const [playing, setPlaying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const sessionRef = useRef<BassTestSession | null>(null);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    sessionRef.current?.update({ bassBoost, subBass, bands });
  }, [bassBoost, subBass, bands]);

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
    if (playing) {
      stop();
      return;
    }

    if (!selectedFile) {
      Alert.alert('曲を選択してください', '「曲を選ぶ」からFilesにある音声ファイルを選択してください。');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const session = await startAudioFile(selectedFile.uri, { bassBoost, subBass, bands });
      sessionRef.current = session;
      const initialPosition = session.getPosition();
      setPosition(initialPosition.currentTime);
      setDuration(initialPosition.duration);
      setPlaying(true);
    } catch (error) {
      Alert.alert('再生できません', error instanceof Error ? error.message : '音声ファイルを再生できませんでした。');
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
    setSelectedFile({ uri: result.assets[0].uri, name: result.assets[0].name });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.accent }]}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Feather name="headphones" size={16} color={colors.primaryForeground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>音楽プレイヤー + EQ</Text>
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Filesから曲を読み込み、このアプリの再生経路でEQしてBluetoothへ出力します。
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
            {selectedFile?.name ?? 'Filesから曲を選ぶ'}
          </Text>
        </Pressable>
        {duration > 0 ? (
          <View style={styles.playerControls}>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{formatTime(position)}</Text>
              <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>{formatTime(duration)}</Text>
            </View>
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
          </View>
        ) : null}
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
  button: { alignSelf: 'flex-end', minWidth: 66, height: 38, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});