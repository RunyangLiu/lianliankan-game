let audioContext: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let nextNoteTime = 0;
let noteIndex = 0;

const musicBeatSeconds = 0.28;
const melodySections = [
  [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 659.25, 783.99, 987.77, 783.99, 698.46, 659.25, 587.33, 523.25],
  [587.33, 698.46, 880, 783.99, 659.25, 783.99, 987.77, 880, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 880, 698.46],
  [659.25, 783.99, 1046.5, 987.77, 880, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 880, 987.77, 880, 783.99, 659.25],
  [523.25, 587.33, 659.25, 783.99, 880, 987.77, 880, 783.99, 698.46, 783.99, 880, 698.46, 659.25, 587.33, 659.25, 523.25],
  [698.46, 880, 1046.5, 880, 783.99, 987.77, 1174.66, 987.77, 880, 783.99, 698.46, 659.25, 698.46, 783.99, 880, 783.99],
  [659.25, 698.46, 783.99, 659.25, 587.33, 659.25, 698.46, 587.33, 523.25, 587.33, 659.25, 783.99, 698.46, 659.25, 587.33, 523.25],
  [783.99, 987.77, 1174.66, 987.77, 880, 783.99, 698.46, 783.99, 880, 987.77, 1046.5, 987.77, 880, 783.99, 698.46, 659.25],
  [587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 587.33, 698.46, 783.99, 698.46, 659.25, 587.33, 523.25, 523.25],
  [523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33, 659.25, 783.99, 880, 1046.5, 987.77, 880, 783.99, 698.46],
  [659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 698.46, 659.25, 587.33, 523.25, 523.25],
];
const melody = melodySections.flat();
const bass = [261.63, 329.63, 349.23, 392, 293.66, 349.23, 440, 392, 329.63, 293.66];
const fullMusicVolume = 0.18;
const quietMusicVolume = 0.06;

function getAudioContext(): AudioContext | null {
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

async function ensureRunningContext(): Promise<AudioContext | null> {
  const context = getAudioContext();

  if (!context) {
    return null;
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  return context;
}

function scheduleTone(context: AudioContext, frequency: number, start: number, duration: number, volume: number, type: OscillatorType) {
  const gain = context.createGain();
  const oscillator = context.createOscillator();

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.connect(gain);
  gain.connect(musicGain || context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);

  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

function scheduleMusicAhead(context: AudioContext) {
  while (nextNoteTime < context.currentTime + 0.75) {
    const melodyFrequency = melody[noteIndex % melody.length];
    scheduleTone(context, melodyFrequency, nextNoteTime, musicBeatSeconds * 0.82, 0.12, "triangle");

    if (noteIndex % 4 === 0) {
      scheduleTone(context, bass[Math.floor(noteIndex / 4) % bass.length], nextNoteTime, musicBeatSeconds * 1.8, 0.035, "sine");
    }

    noteIndex += 1;
    nextNoteTime += musicBeatSeconds;
  }
}

export async function startBackgroundMusic(volume = fullMusicVolume): Promise<void> {
  const context = await ensureRunningContext();

  if (!context) {
    return;
  }

  if (!musicGain) {
    musicGain = context.createGain();
    musicGain.connect(context.destination);
  }

  musicGain.gain.setTargetAtTime(volume, context.currentTime, 0.18);

  if (musicTimer) {
    return;
  }

  nextNoteTime = context.currentTime + 0.05;
  scheduleMusicAhead(context);
  musicTimer = window.setInterval(() => scheduleMusicAhead(context), 140);
}

export async function setBackgroundMusicQuiet(isQuiet: boolean): Promise<void> {
  const context = await ensureRunningContext();

  if (!context) {
    return;
  }

  if (!musicGain) {
    await startBackgroundMusic(isQuiet ? quietMusicVolume : fullMusicVolume);
    return;
  }

  musicGain.gain.setTargetAtTime(isQuiet ? quietMusicVolume : fullMusicVolume, context.currentTime, 0.25);
}

export async function stopBackgroundMusic(): Promise<void> {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (musicTimer) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }

  if (musicGain) {
    musicGain.gain.cancelScheduledValues(context.currentTime);
    musicGain.gain.setTargetAtTime(0.0001, context.currentTime, 0.05);
  }

  nextNoteTime = 0;
}

export async function playMatchSound(): Promise<void> {
  const context = await ensureRunningContext();

  if (!context) {
    return;
  }

  const now = context.currentTime;
  const duration = 0.22;
  const sampleCount = Math.floor(context.sampleRate * duration);
  const noiseBuffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    const decay = 1 - index / sampleCount;
    noiseData[index] = (Math.random() * 2 - 1) * decay;
  }

  const noise = context.createBufferSource();
  const noiseFilter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  const zap = context.createOscillator();
  const zapGain = context.createGain();
  const spark = context.createOscillator();
  const sparkGain = context.createGain();

  noise.buffer = noiseBuffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(2300, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(7600, now + duration);
  noiseFilter.Q.setValueAtTime(8, now);

  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.24, now + 0.012);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  zap.type = "sawtooth";
  zap.frequency.setValueAtTime(1300, now);
  zap.frequency.exponentialRampToValueAtTime(4200, now + 0.08);
  zap.frequency.exponentialRampToValueAtTime(880, now + duration);

  zapGain.gain.setValueAtTime(0.0001, now);
  zapGain.gain.exponentialRampToValueAtTime(0.16, now + 0.018);
  zapGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  spark.type = "square";
  spark.frequency.setValueAtTime(2800, now + 0.035);
  spark.frequency.exponentialRampToValueAtTime(6200, now + 0.13);

  sparkGain.gain.setValueAtTime(0.0001, now + 0.035);
  sparkGain.gain.exponentialRampToValueAtTime(0.11, now + 0.05);
  sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(context.destination);
  zap.connect(zapGain);
  zapGain.connect(context.destination);
  spark.connect(sparkGain);
  sparkGain.connect(context.destination);

  noise.start(now);
  noise.stop(now + duration);
  zap.start(now);
  zap.stop(now + duration + 0.02);
  spark.start(now + 0.035);
  spark.stop(now + 0.17);

  noise.onended = () => {
    noise.disconnect();
    noiseFilter.disconnect();
    noiseGain.disconnect();
  };

  zap.onended = () => {
    zap.disconnect();
    zapGain.disconnect();
  };

  spark.onended = () => {
    spark.disconnect();
    sparkGain.disconnect();
  };
}
