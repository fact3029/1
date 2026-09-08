import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export default function InfoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const openBluetooth = () => {
    void Linking.openURL('App-Prefs:Bluetooth');
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

      <View style={[styles.noticeCard, { backgroundColor: colors.accent }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
          Apple MusicなどへEQをかけるには、接続したヘッドフォン本体がEQ制御を受け付ける必要があります。標準Bluetoothだけでは第三者アプリから本体DSPを操作できないため、メーカー公式SDK/APIに対応したアダプター方式で追加します。
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
  noticeCard: { borderRadius: 18, padding: 14, flexDirection: 'row', gap: 9 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  bluetoothButton: { minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  bluetoothLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
});