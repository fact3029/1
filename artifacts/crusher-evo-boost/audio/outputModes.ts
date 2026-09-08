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
    detail: 'Bluetooth接続はiPhoneの設定で行います。EQを確認するには「アプリ内テスト」を使います。',
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
    description: 'Bluetooth経由でEQを本体へ保存',
    status: '公式API待ち',
    detail: 'Crusher EVOの公式SDKまたは制御仕様が提供された後に有効化します。',
    available: true,
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
    title: 'アプリ内テスト',
    description: 'このアプリの実音声テストで確認',
    status: '利用可能',
    detail: 'アプリ内の音声テストにEQを適用します。Bluetooth接続確認にも使えます。',
    available: true,
  },
  {
    id: 'analysis',
    title: '解析モード',
    description: 'Bluetoothサービスと値を診断ログに記録',
    status: '調査用',
    detail: 'Crusher EVOのBLEサービスを読み取り専用で確認します。EQ書き込みは行いません。',
    available: true,
  },
];

export function getOutputMode(id: OutputModeId): OutputMode {
  return OUTPUT_MODES.find((mode) => mode.id === id) ?? OUTPUT_MODES[0];
}