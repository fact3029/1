import { AudioContext } from 'react-native-audio-api';
import { activateAudioSession } from '@/audio/outputRoute';

export type BassTestSettings = {
  bassBoost: number;
  subBass: number;
};

export type BassTestSession = {
  stop: () => void;
};

export async function startBassTest(settings: BassTestSettings): Promise<BassTestSession> {
  await activateAudioSession();
  const context = new AudioContext();
  const lowShelf = context.createBiquadFilter();
  const master = context.createGain();
  const low = context.createOscillator();
  const body = context.createOscillator();
  const air = context.createOscillator();
  const lowGain = context.createGain();
  const bodyGain = context.createGain();
  const airGain = context.createGain();
  const now = context.currentTime;
  const duration = 8;

  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 120;
  lowShelf.gain.value = Math.min(14, 2 + settings.bassBoost * 0.09 + settings.subBass * 0.4);

  master.gain.value = 0.16;
  low.frequency.value = 54;
  body.frequency.value = 180;
  air.frequency.value = 860;
  low.type = 'sine';
  body.type = 'triangle';
  air.type = 'sine';
  lowGain.gain.value = 0.92;
  bodyGain.gain.value = 0.16;
  airGain.gain.value = 0.045;

  low.connect(lowGain);
  body.connect(bodyGain);
  air.connect(airGain);
  lowGain.connect(lowShelf);
  bodyGain.connect(lowShelf);
  airGain.connect(lowShelf);
  lowShelf.connect(master);
  master.connect(context.destination);

  low.start(now);
  body.start(now);
  air.start(now);
  low.stop(now + duration);
  body.stop(now + duration);
  air.stop(now + duration);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    void context.close();
  };

  return { stop };
}