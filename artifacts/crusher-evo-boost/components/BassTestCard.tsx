import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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

    if (!selectedFile) {
      Alert.alert('曲を選択してください', '「曲を選ぶ」からFilesにある音声ファイルを選択してください。');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      sessionRef.current = await startAudioFile(selectedFile.uri, { bassBoost, subBass, bands });
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
  chooseButton: { minHeight: 36, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chooseLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 10 },
  button: { minWidth: 66, height: 38, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  buttonLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});