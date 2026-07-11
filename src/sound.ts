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
  const gain = context.createGain();
  const oscillator = context.createOscillator();
  const popGain = context.createGain();
  const pop = context.createOscillator();

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(720, now);
  oscillator.frequency.exponentialRampToValueAtTime(1560, now + 0.16);

  popGain.gain.setValueAtTime(0.0001, now + 0.08);
  popGain.gain.exponentialRampToValueAtTime(0.18, now + 0.1);
  popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  pop.type = "triangle";
  pop.frequency.setValueAtTime(1180, now + 0.08);
  pop.frequency.exponentialRampToValueAtTime(520, now + 0.22);

  oscillator.connect(gain);
  gain.connect(context.destination);
  pop.connect(popGain);
  popGain.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.28);
  pop.start(now + 0.08);
  pop.stop(now + 0.26);

  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };

  pop.onended = () => {
    pop.disconnect();
    popGain.disconnect();
  };
}
