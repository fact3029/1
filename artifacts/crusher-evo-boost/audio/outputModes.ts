import Constants from 'expo-constants';

export type OutputModeId = 'auto' | 'audio-unit' | 'headphone-dsp' | 'generic-bluetooth' | 'app-test' | 'analysis';

export type OutputMode = {
  id: OutputModeId;
  title: string;
  description: string;
  status: string;
  detail: string;
  available: boolean;
};

export const DEFAULT_OUTPUT_MODE: OutputModeId = 'app-test';
export const IS_SIDELOAD_BUILD = Constants.expoConfig?.extra?.distribution === 'sideloadly';

export const OUTPUT_MODES: OutputMode[] = [
  {
    id: 'auto',
    title: '接続中のヘッドフォン',
    description: '現在の出力先を確認',
    status: '確認',
    detail: '接続先の名前と音声ルートを確認します。ヘッドホン本体のDSP設定は変更しません。',
    available: true,
  },
  {
    id: 'audio-unit',
    title: 'Audio Unit',
    description: IS_SIDELOAD_BUILD ? 'Sideloadly版では拡張機能を除外' : '対応ホストのエフェクトとして使用',
    status: IS_SIDELOAD_BUILD ? 'IPAでは利用不可' : '開発ビルド',
    detail: IS_SIDELOAD_BUILD
      ? '無料署名との互換性を優先し、このIPAにはAudio Unit拡張を含めていません。アプリ内テストを使用してください。'
      : 'Audio Unit対応アプリのエフェクト一覧からCrusher EVO EQを追加します。',
    available: !IS_SIDELOAD_BUILD,
  },
  {
    id: 'headphone-dsp',
    title: 'ヘッドフォン本体DSP',
    description: 'Crusher EVO本体のEQを変更',
    status: 'プロトコル検証中',
    detail: '正しいBLE Characteristicとpayloadを特定できれば、iPhoneからCrusher EVO本体へEQを書き込めます。未確認payloadは自動送信しません。',
    available: false,
  },
  {
    id: 'generic-bluetooth',
    title: '一般Bluetooth',
    description: '標準Bluetooth出力を表示',
    status: '制御対象外',
    detail: '標準Bluetooth音声プロファイルには、第三者アプリがEQを送る共通仕様はありません。',
    available: true,
  },
  {
    id: 'app-test',
    title: 'アプリ内プレイヤー（検証用）',
    description: '本体DSPが未確認の間の音声テスト',
    status: '検証用',
    detail: 'Filesから選んだ音源をアプリ内でEQし、音声処理の値を確認します。本番目標はCrusher EVO本体DSPでの処理です。',
    available: true,
  },
  {
    id: 'analysis',
    title: '解析モード',
    description: 'Bluetooth構成を確認し、GATT操作を試験',
    status: '調査用',
    detail: 'Crusher EVOのBLEサービス、Characteristic、read/notifyを確認し、payloadを明示して試験書き込みできます。EQ用と未確認のpayloadは自動送信しません。',
    available: true,
  },
];

export function getOutputMode(id: OutputModeId): OutputMode {
  return OUTPUT_MODES.find((mode) => mode.id === id) ?? OUTPUT_MODES[0];
}