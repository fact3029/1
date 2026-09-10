import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openBluetoothSettings } from '@/audio/outputRoute';
import { useColors } from '@/hooks/useColors';

export default function InfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const openBluetooth = async () => {
    const opened = await openBluetoothSettings();
    if (!opened) {
      void Linking.openSettings();
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.primary }]}>QUICK GUIDE</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Make it hit.</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Crusher EVO S6EVWのための、シンプルな使い方。
      </Text>

      <View style={styles.steps}>
        {[
          ['01', 'S6EVWを接続', 'iPhoneの設定 > Bluetoothからヘッドホンを接続します。', 'bluetooth'],
          ['02', '低音を調整', 'HomeでBassとSub-bassを好みの位置まで上げます。', 'sliders'],
          ['03', 'プリセットを保存', 'Saveを押すと、このiPhoneに設定が残ります。', 'save'],
        ].map(([number, title, body, icon]) => (
          <View key={number} style={[styles.step, { borderBottomColor: colors.border }]}>
            <Text style={[styles.number, { color: colors.primary }]}>{number}</Text>
            <View style={[styles.stepIcon, { backgroundColor: colors.secondary }]}>
              <Feather name={icon as 'bluetooth' | 'sliders' | 'save'} size={17} color={colors.foreground} />
            </View>
            <View style={styles.stepCopy}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text>
              <Text style={[styles.stepBody, { color: colors.mutedForeground }]}>{body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.limitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.limitIcon, { backgroundColor: colors.accent }]}>
          <Feather name="sliders" size={18} color={colors.primary} />
        </View>
        <View style={styles.limitCopy}>
          <Text style={[styles.limitTitle, { color: colors.foreground }]}>出力方式を切り替え</Text>
          <Text style={[styles.limitBody, { color: colors.mutedForeground }]}>
            Homeの「EQのかけ方」から、Audio Unit、接続中のヘッドフォン、一般Bluetooth、アプリ内テストを切り替えられます。Crusher EVO本体DSPへの送信は公式SDK/APIが提供された機種から有効化します。
          </Text>
        </View>
      </View>

      <View style={styles.scopeSection}>
        <View>
          <Text style={[styles.scopeEyebrow, { color: colors.mutedForeground }]}>CURRENT SCOPE</Text>
          <Text style={[styles.scopeTitle, { color: colors.foreground }]}>現在の対応範囲</Text>
        </View>
        {([
          ['利用可能', 'アプリ内プレイヤー', 'FilesのMP3・M4A・WAVを再生し、Bass/Sub-bass/5バンドEQを適用', 'check-circle', true],
          ['利用可能', 'Bluetooth出力検出', 'Crusher EVOの接続名と音声出力ルートを表示', 'bluetooth', true],
          ['制限あり', 'Crusher EVO本体DSP', '標準Bluetooth経由で本体のEQ値を書き込む公開APIがないため未対応', 'slash', false],
          ['対象外', 'Apple Music・YouTube', '他アプリの音声ストリームを取得して、このアプリのEQへ通すことは不可', 'x-circle', false],
        ] as const).map(([status, title, body, icon, supported]) => (
          <View key={title} style={[styles.scopeRow, { borderColor: colors.border }]}>
            <Feather
              name={icon as 'check-circle' | 'bluetooth' | 'slash' | 'x-circle'}
              size={17}
              color={supported ? colors.primary : colors.mutedForeground}
            />
            <View style={styles.scopeCopy}>
              <View style={styles.scopeTitleRow}>
                <Text style={[styles.scopeItemTitle, { color: colors.foreground }]}>{title}</Text>
                <Text style={[styles.scopeStatus, { color: supported ? colors.primary : colors.mutedForeground }]}>{status}</Text>
              </View>
              <Text style={[styles.scopeBody, { color: colors.mutedForeground }]}>{body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.noticeCard, { backgroundColor: colors.accent }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          ヘッドホン本体のEQを実装するには、SkullcandyがCrusher EVO向けの制御仕様またはSDKを公開している必要があります。現在のBluetooth解析は読み取り専用で、書き込みは行いません。
        </Text>
      </View>

      <Pressable
        testID="guide-open-bluetooth"
        accessibilityRole="button"
        onPress={openBluetooth}
        style={({ pressed }) => [styles.bluetoothButton, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="bluetooth" size={17} color={colors.foreground} />
        <Text style={[styles.bluetoothLabel, { color: colors.foreground }]}>Bluetooth設定を開く</Text>
        <Feather name="arrow-up-right" size={16} color={colors.mutedForeground} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.5, marginTop: 2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1.2, marginTop: 3 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  steps: { gap: 0 },
  step: { minHeight: 84, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { fontFamily: 'Inter_700Bold', fontSize: 11, width: 23 },
  stepIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepCopy: { flex: 1, gap: 4 },
  stepTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  stepBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  limitCard: { marginTop: 15, borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12 },
  limitIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  limitCopy: { flex: 1, gap: 6 },
  limitTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  limitBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  scopeSection: { gap: 9, marginTop: 5 },
  scopeEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  scopeTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4, marginBottom: 2 },
  scopeRow: { borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  scopeCopy: { flex: 1, gap: 4 },
  scopeTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  scopeItemTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  scopeStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  scopeBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  noticeCard: { borderRadius: 18, padding: 14, flexDirection: 'row', gap: 9 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  bluetoothButton: { minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  bluetoothLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
});