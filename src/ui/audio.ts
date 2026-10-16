const base = import.meta.env.BASE_URL;

function load(file: string, loop = false): HTMLAudioElement {
  const audio = new Audio(`${base}sounds/${file}`);
  audio.preload = "auto";
  audio.loop = loop;
  return audio;
}

const effects = {
  move: load("move.mp3"),
  rotate: load("rotate.mp3"),
  drop: load("drop.mp3"),
  clear: load("bonus-points-190035.mp3"),
  gameOver: load("game-over.mp3"),
};

export type Effect = keyof typeof effects;

const music = load("Soundtrack.mp3", true);
let sfxVolume = 0.2;

// Browsers reject play() until the user has interacted with the page; that's fine to ignore.
const play = (audio: HTMLAudioElement) => void audio.play().catch(() => {});

export function setVolumes(musicVolume: number, effectsVolume: number): void {
  music.volume = musicVolume;
  sfxVolume = effectsVolume;
}

export function playEffect(name: Effect): void {
  const audio = effects[name];
  audio.volume = sfxVolume;
  audio.currentTime = 0;
  play(audio);
}

export function startMusic(): void {
  music.currentTime = 0;
  play(music);
}

export function pauseMusic(): void {
  music.pause();
}

export function resumeMusic(): void {
  play(music);
}

export function stopMusic(): void {
  music.pause();
  music.currentTime = 0;
}
