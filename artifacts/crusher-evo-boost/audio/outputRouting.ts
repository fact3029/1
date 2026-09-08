import type { EqProfile } from '@/context/ProfileContext';
import { syncProfileToAudioUnit } from '@/audio/audioUnit';
import { IS_SIDELOAD_BUILD, type OutputModeId } from '@/audio/outputModes';

export type OutputSyncResult = {
  mode: OutputModeId;
  available: boolean;
  applied: boolean;
  message?: string;
};

export async function syncProfileToOutput(
  profile: EqProfile,
  mode: OutputModeId,
): Promise<OutputSyncResult> {
  if (mode === 'audio-unit') {
    if (IS_SIDELOAD_BUILD) {
      return {
        mode,
        available: false,
        applied: false,
        message: 'Sideloadly用IPAにはAudio Unit拡張が含まれていません。アプリ内テストを使用してください。',
      };
    }
    const result = await syncProfileToAudioUnit(profile);
    return { mode, available: result.available, applied: result.available && !result.error, message: result.error };
  }

  if (mode === 'headphone-dsp') {
    return {
      mode,
      available: false,
      applied: false,
      message: 'Crusher EVO本体DSPの公式SDK/APIが必要です。',
    };
  }

  if (mode === 'generic-bluetooth') {
    return {
      mode,
      available: true,
      applied: false,
      message: '標準Bluetooth音声には第三者アプリからEQを送る共通仕様がありません。',
    };
  }

  if (mode === 'analysis') {
    return {
      mode,
      available: true,
      applied: false,
      message: '解析モードではBluetoothサービスを読み取り、EQ書き込みは行いません。',
    };
  }

  if (mode === 'auto') {
    return {
      mode,
      available: false,
      applied: false,
      message: '出力先に応じた公式ヘッドフォンアダプターが必要です。',
    };
  }

  return { mode, available: true, applied: true };
}