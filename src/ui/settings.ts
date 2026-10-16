export interface Settings {
  background: string;
  grid: string;
  border: string;
  musicVolume: number;
  sfxVolume: number;
}

const SETTINGS_KEY = "settings";
const HIGH_SCORE_KEY = "topScores";
const DEFAULT_HIGH_SCORES = [5000, 4000, 3000, 2000, 1000];

export const DEFAULT_SETTINGS: Settings = {
  background: "#000000",
  grid: "#808080",
  border: "#ffffff",
  musicVolume: 0.1,
  sfxVolume: 0.2,
};

// localStorage can throw (private mode, blocked storage); the game must still work.
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY) };
}

export function saveSettings(settings: Settings): void {
  write(SETTINGS_KEY, settings);
}

export function loadHighScores(): number[] {
  const scores = read<unknown>(HIGH_SCORE_KEY);
  return Array.isArray(scores) && scores.every((s) => typeof s === "number") ? scores : [...DEFAULT_HIGH_SCORES];
}

// Inserts the score if it makes the top five. Returns true when it did.
export function submitHighScore(scores: number[], score: number): boolean {
  if (score <= scores[scores.length - 1]) return false;
  scores.push(score);
  scores.sort((a, b) => b - a);
  scores.length = Math.min(scores.length, 5);
  write(HIGH_SCORE_KEY, scores);
  return true;
}
