import { AudioContext } from 'react-native-audio-api';
import { activateAudioSession } from '@/audio/outputRoute';

export type BassTestSettings = {
  bassBoost: number;
  subBass: number;
  bands: number[];
};

export type BuiltInTrack = {
  id: string;
  title: string;
  description: string;
};

export const BUILT_IN_TRACKS: BuiltInTrack[] = [
  { id: 'crusher-pulse', title: 'Crusher Pulse', description: '低音のパンチを確認' },
  { id: 'sub-sweep', title: 'Sub Sweep', description: 'サブベースの深さを確認' },
  { id: 'full-range', title: 'Full Range', description: '5バンド全体を確認' },
];

export type BassTestSession = {
  stop: () => void;
};

function createTrackBuffer(context: AudioContext, trackId: string) {
  const sampleRate = context.sampleRate;
  const duration = 12;
  const frameCount = Math.floor(sampleRate * duration);
  const buffer = context.createBuffer(2, frameCount, sampleRate);
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    const beat = (time * 96) % 4;
    const kickEnvelope = Math.exp(-((beat % 1) * 12));
    const kick = Math.sin(2 * Math.PI * (54 + 18 * kickEnvelope) * time) * kickEnvelope * 0.8;
    const bass =
      Math.sin(2 * Math.PI * 54 * time) * 0.2 +
      Math.sin(2 * Math.PI * 81 * time) * 0.08;
    const subSweep = Math.sin(2 * Math.PI * (38 + ((time * 1.8) % 1) * 52) * time) * 0.16;
    const mid = Math.sin(2 * Math.PI * 220 * time) * 0.08 + Math.sin(2 * Math.PI * 440 * time) * 0.05;
    const air = Math.sin(2 * Math.PI * 2200 * time) * ((Math.sin(time * 17) + 1) * 0.018);
    const pulse = trackId === 'sub-sweep' ? subSweep : trackId === 'full-range' ? mid + air : kick + bass;
    const sample = Math.max(-0.8, Math.min(0.8, pulse + bass + (trackId === 'full-range' ? mid + air : 0)));
    const pan = Math.sin(time * 0.7) * 0.06;
    left[frame] = sample * (1 - pan);
    right[frame] = sample * (1 + pan);
  }

  buffer.copyToChannel(left, 0);
  buffer.copyToChannel(right, 1);
  return buffer;
}

export async function startBassTest(
  settings: BassTestSettings,
  trackId: string = BUILT_IN_TRACKS[0].id,
): Promise<BassTestSession> {
  await activateAudioSession();
  const context = new AudioContext();
  const source = context.createBufferSource({ pitchCorrection: true });
  const lowShelf = context.createBiquadFilter();
  const bandFilters = [60, 150, 400, 1000, 4000].map(() => context.createBiquadFilter());
  const master = context.createGain();
  const buffer = createTrackBuffer(context, trackId);
  const now = context.currentTime;

  source.buffer = buffer;
  source.loop = true;
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 120;
  lowShelf.gain.value = Math.min(14, 2 + settings.bassBoost * 0.09 + settings.subBass * 0.4);
  bandFilters.forEach((filter, index) => {
    filter.type = 'peaking';
    filter.frequency.value = [60, 150, 400, 1000, 4000][index];
    filter.Q.value = 0.85;
    filter.gain.value = Math.max(-6, Math.min(6, settings.bands[index] ?? 0));
  });
  master.gain.value = 0.22;

  source.connect(lowShelf);
  let previous: typeof lowShelf = lowShelf;
  bandFilters.forEach((filter) => {
    previous.connect(filter);
    previous = filter;
  });
  previous.connect(master);
  master.connect(context.destination);
  source.start(now);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    source.stop();
    source.disconnect();
    void context.close();
  };

  return { stop };
}

export async function startAudioFile(
  uri: string,
  settings: BassTestSettings,
): Promise<BassTestSession> {
  await activateAudioSession();
  const context = new AudioContext();
  const sourceUri = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  const source = context.context.createFileSource({
    source: sourceUri,
    loop: false,
    volume: 1,
    playbackRate: 1,
    preservesPitch: true,
  });

  if (!source) {
    await context.close();
    throw new Error('この音声形式を再生できません。MP3、M4A、WAVのいずれかを選択してください。');
  }

  const lowShelf = context.context.createBiquadFilter({});
  const bandFilters = [60, 150, 400, 1000, 4000].map(() => context.context.createBiquadFilter({}));
  const master = context.context.createGain({ gain: 0.78 });
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 120;
  lowShelf.gain.value = Math.min(14, 2 + settings.bassBoost * 0.09 + settings.subBass * 0.4);
  bandFilters.forEach((filter, index) => {
    filter.type = 'peaking';
    filter.frequency.value = [60, 150, 400, 1000, 4000][index];
    filter.Q.value = 0.85;
    filter.gain.value = Math.max(-6, Math.min(6, settings.bands[index] ?? 0));
  });

  source.connect(lowShelf);
  let previous = lowShelf;
  bandFilters.forEach((filter) => {
    previous.connect(filter);
    previous = filter;
  });
  previous.connect(master);
  master.connect(context.context.destination);
  source.start(context.currentTime);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    source.stop(context.currentTime + 0.05);
    source.disconnect();
    void context.close();
  };

  return { stop };
}