import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type MethodProps = {
  number: string;
  icon: 'smartphone' | 'bluetooth' | 'radio' | 'search';
  title: string;
  body: string;
  status: string;
};

export default function CautionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.primary }]}>IMPORTANT · DSP RESEARCH</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>注意事項</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        本体DSPを調べる前に、収集できる情報とできない情報を確認してください。
      </Text>

      <View style={[styles.warningCard, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
        <View style={[styles.warningIcon, { backgroundColor: colors.primary }]}>
          <Feather name="alert-triangle" size={18} color={colors.primaryForeground} />
        </View>
        <View style={styles.warningCopy}>
          <Text style={[styles.warningTitle, { color: colors.foreground }]}>自動解析を保証するツールではありません</Text>
          <Text style={[styles.warningBody, { color: colors.mutedForeground }]}>
            現在のIPAはBLEワークベンチです。サービス・Characteristicの読み取り、notify監視、確認付きwriteはできますが、公式アプリのEQ通信を自動取得してpayloadを確定する機能はありません。
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>WHAT IS OBSERVED</Text>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>このアプリで収集できる情報</Text>
        {[
          'Crusher EVOの検出情報、BLEサービス、Characteristic、read/write/notify権限',
          '手動readで返る値とnotifyで受信した値',
          'ユーザーが入力して確認したpayloadのwrite結果、成功・失敗、read/notifyの変化',
        ].map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Feather name="check-circle" size={16} color={colors.primary} />
            <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>WHAT IS NOT GUARANTEED</Text>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>このアプリだけでは確定できない情報</Text>
        {[
          '公式アプリがEQ変更時に送信する正確なpayload',
          'payloadを送るCharacteristic、書き込み順序、初期化手順',
          'Bass Boostや各EQ帯域に対応するpayload内のバイト',
          '暗号化、チェックサム、セッション情報、本体DSPが実際に音を変えたかどうか',
        ].map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>REQUIRED EVIDENCE</Text>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>必要な取得方法</Text>
        <MethodCard
          number="01"
          icon="smartphone"
          title="公式アプリの変更前後を比較"
          body="EQを1項目だけ変更し、変更前後の通信または本体設定値を比較できる環境が必要です。"
          status="必要"
          colors={colors}
        />
        <MethodCard
          number="02"
          icon="bluetooth"
          title="Android版公式アプリの通信記録"
          body="Android版公式アプリなどでBluetooth通信を記録し、EQ変更時のCharacteristicとpayloadを確認します。"
          status="候補"
          colors={colors}
        />
        <MethodCard
          number="03"
          icon="radio"
          title="外部BLEスニッファ"
          body="nRF Snifferなどで、公式アプリとCrusher EVOの間のBLE通信を外部から記録します。"
          status="候補"
          colors={colors}
        />
        <MethodCard
          number="04"
          icon="search"
          title="このアプリでread / notify比較"
          body="公式アプリが変更した後に、このアプリで本体設定をread・notifyし、変更前後の値を比較します。"
          status="補助"
          colors={colors}
        />
      </View>

      <View style={[styles.processCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.processHeader}>
          <Feather name="shield" size={17} color={colors.primary} />
          <Text style={[styles.processTitle, { color: colors.foreground }]}>安全な検証手順</Text>
        </View>
        {[
          '公式アプリとこのアプリを同時に接続しない',
          '一度に変更するEQ項目は1つだけにする',
          '未確認payloadを自動送信しない',
          'write後はread/notifyと実際の音で反映を確認する',
        ].map((item, index) => (
          <View key={item} style={styles.processRow}>
            <Text style={[styles.processNumber, { color: colors.primary }]}>{index + 1}</Text>
            <Text style={[styles.processText, { color: colors.mutedForeground }]}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        本体DSPのpayloadが確認できるまでは、Apple Music・YouTubeなど他アプリの音声にEQが適用されるとは表示しません。
      </Text>
    </ScrollView>
  );
}

function MethodCard({
  number,
  icon,
  title,
  body,
  status,
  colors,
}: MethodProps & { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.methodCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.methodNumber, { color: colors.primary }]}>{number}</Text>
      <View style={[styles.methodIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={16} color={colors.foreground} />
      </View>
      <View style={styles.methodCopy}>
        <View style={styles.methodTitleRow}>
          <Text style={[styles.methodTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.methodStatus, { color: colors.mutedForeground }]}>{status}</Text>
        </View>
        <Text style={[styles.methodBody, { color: colors.mutedForeground }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1.2, marginTop: 2 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20, marginBottom: 7 },
  warningCard: { borderRadius: 20, borderWidth: 1, padding: 14, flexDirection: 'row', gap: 11 },
  warningIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  warningCopy: { flex: 1, gap: 5 },
  warningTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  warningBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  section: { gap: 9, marginTop: 3 },
  sectionEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 2 },
  bulletText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  methodCard: { borderRadius: 17, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  methodNumber: { fontFamily: 'Inter_700Bold', fontSize: 10, width: 20, paddingTop: 3 },
  methodIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  methodCopy: { flex: 1, gap: 4 },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  methodTitle: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  methodStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  methodBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15 },
  processCard: { borderRadius: 19, borderWidth: 1, padding: 14, gap: 10 },
  processHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  processTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  processRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  processNumber: { fontFamily: 'Inter_700Bold', fontSize: 11, width: 16 },
  processText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  footer: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 16, paddingHorizontal: 2 },
});