import { AudioContext } from 'react-native-audio-api';
import { activateAudioSession } from '@/audio/outputRoute';

export type BassTestSettings = {
  bassBoost: number;
  bassEnabled?: boolean;
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
  update: (settings: BassTestSettings) => void;
  seek: (seconds: number) => void;
  getPosition: () => { currentTime: number; duration: number };
};

const EQ_FREQUENCIES = [60, 150, 400, 1000, 4000];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeAudioFilePath(uri: string) {
  if (!uri.startsWith('file://')) return uri;

  const path = uri.replace(/^file:\/\//, '');
  const withoutLocalhost = path.startsWith('localhost/') ? path.slice('localhost'.length) : path;
  try {
    return decodeURIComponent(withoutLocalhost);
  } catch {
    return withoutLocalhost;
  }
}

function createSoftClipCurve() {
  const curve = new Float32Array(4096);
  const drive = 1.25;
  const normalization = Math.tanh(drive);

  for (let index = 0; index < curve.length; index += 1) {
    const input = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(input * drive) / normalization;
  }

  return curve;
}

function createEqChain(context: AudioContext, masterGain: number) {
  const graph = context;
  const lowShelf = graph.createBiquadFilter();
  const bandFilters = EQ_FREQUENCIES.map(() => graph.createBiquadFilter());
  const master = graph.createGain();
  const safety = graph.createWaveShaper();

  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 120;
  master.gain.value = masterGain;
  safety.curve = createSoftClipCurve();
  safety.oversample = '4x';

  const update = (settings: BassTestSettings) => {
    const bassBoost = settings.bassEnabled === false ? 0 : settings.bassBoost;
    lowShelf.gain.value = clamp(bassBoost * 0.12 + settings.subBass * 0.55, -2, 12);
    bandFilters.forEach((filter, index) => {
      filter.type = 'peaking';
      filter.frequency.value = EQ_FREQUENCIES[index];
      filter.Q.value = 0.85;
      filter.gain.value = clamp(settings.bands[index] ?? 0, -6, 6);
    });
  };

  let previous: typeof lowShelf = lowShelf;
  bandFilters.forEach((filter) => {
    previous.connect(filter);
    previous = filter;
  });
  previous.connect(master);
  master.connect(safety);
  safety.connect(graph.destination);

  return {
    input: lowShelf,
    update,
    disconnect: () => {
      lowShelf.disconnect();
      bandFilters.forEach((filter) => filter.disconnect());
      master.disconnect();
      safety.disconnect();
    },
  };
}

function createRawEqChain(context: AudioContext, masterGain: number) {
  const graph = context.context;
  const lowShelf = graph.createBiquadFilter({});
  const bandFilters = EQ_FREQUENCIES.map(() => graph.createBiquadFilter({}));
  const master = graph.createGain({});
  const safety = graph.createWaveShaper({});

  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 120;
  master.gain.value = masterGain;
  safety.setCurve(createSoftClipCurve());
  safety.oversample = '4x';

  const update = (settings: BassTestSettings) => {
    const bassBoost = settings.bassEnabled === false ? 0 : settings.bassBoost;
    lowShelf.gain.value = clamp(bassBoost * 0.12 + settings.subBass * 0.55, -2, 12);
    bandFilters.forEach((filter, index) => {
      filter.type = 'peaking';
      filter.frequency.value = EQ_FREQUENCIES[index];
      filter.Q.value = 0.85;
      filter.gain.value = clamp(settings.bands[index] ?? 0, -6, 6);
    });
  };

  let previous = lowShelf;
  bandFilters.forEach((filter) => {
    previous.connect(filter);
    previous = filter;
  });
  previous.connect(master);
  master.connect(safety);
  safety.connect(graph.destination);

  return {
    input: lowShelf,
    update,
    disconnect: () => {
      lowShelf.disconnect();
      bandFilters.forEach((filter) => filter.disconnect());
      master.disconnect();
      safety.disconnect();
    },
  };
}

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
  await context.resume();
  const eq = createEqChain(context, 0.26);
  const buffer = createTrackBuffer(context, trackId);
  const duration = 12;
  let startedAt = context.currentTime;
  let source = context.createBufferSource({ pitchCorrection: true });

  source.buffer = buffer;
  source.loop = false;
  eq.update(settings);
  source.connect(eq.input);
  source.start(startedAt);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      source.stop(context.currentTime);
    } catch {
      // The source may have ended between the timer tick and cleanup.
    }
    source.disconnect();
    eq.disconnect();
    void context.close();
  };

  return {
    stop,
    update: eq.update,
    seek: (seconds: number) => {
      if (stopped) return;
      const nextPosition = clamp(seconds, 0, duration);
      try {
        source.stop();
      } catch {
        return;
      }
      source.disconnect();
      source = context.createBufferSource({ pitchCorrection: true });
      source.buffer = buffer;
      source.loop = false;
      source.connect(eq.input);
      startedAt = context.currentTime - nextPosition;
      source.start(context.currentTime + 0.02, nextPosition);
    },
    getPosition: () => ({
      currentTime: clamp(context.currentTime - startedAt, 0, duration),
      duration,
    }),
  };
}

export async function startAudioFile(
  uri: string,
  settings: BassTestSettings,
): Promise<BassTestSession> {
  await activateAudioSession();
  const context = new AudioContext();
  await context.resume();
  const source = context.context.createFileSource({
    source: normalizeAudioFilePath(uri),
    loop: false,
    volume: 0.82,
    playbackRate: 1,
    preservesPitch: true,
  });

  if (!source) {
    await context.close();
    throw new Error('この音声形式を再生できません。MP3、M4A、WAVのいずれかを選択してください。');
  }
  if (!Number.isFinite(source.duration) || source.duration <= 0) {
    await context.close();
    throw new Error('音声をデコードできませんでした。このIPAで再生できるMP3、M4A、またはWAVを選択してください。');
  }

  const eq = createRawEqChain(context, 0.56);
  eq.update(settings);
  source.connect(eq.input);
  source.start(context.currentTime + 0.02);

  const getPosition = () => ({
    currentTime: Math.max(0, source.currentTime),
    duration: Math.max(0, source.duration),
  });

  const seek = (seconds: number) => {
    const { duration } = getPosition();
    source.seekToTime(clamp(seconds, 0, duration));
  };

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      source.stop(context.currentTime);
    } catch {
      // The source may have ended between the timer tick and cleanup.
    }
    source.disconnect();
    eq.disconnect();
    void context.close();
  };

  return { stop, update: eq.update, seek, getPosition };
}