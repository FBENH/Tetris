import "./style.css";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./core/board";
import { Game, type GameEvent } from "./core/game";
import { pauseMusic, playEffect, resumeMusic, setVolumes, startMusic, stopMusic } from "./ui/audio";
import { DEFAULT_CONTROLS, cloneControls, loadControls, saveControls, type Action } from "./ui/controls";
import { ControlsPanel } from "./ui/controlsPanel";
import { Demo } from "./ui/demo";
import { Input } from "./ui/input";
import { Renderer } from "./ui/renderer";
import {
  DEFAULT_SETTINGS,
  loadHighScores,
  loadSettings,
  saveSettings,
  submitHighScore,
  type Settings,
} from "./ui/settings";

const GAME_OVER_DELAY_MS = 1500;
const VIDEO_WAIT_MS = 4000; // start anyway if the background video is this slow
const COUNTDOWN = ["3", "2", "1", "GO!"];
const COUNTDOWN_STEP_MS = 600;
const RANKS = ["1ST", "2ND", "3RD", "4TH", "5TH"];
const MAX_FRAME_MS = 100; // avoid a burst of gravity after a long frame
const CLEAR_LABELS = ["", "SINGLE!", "DOUBLE!", "TRIPLE!", "TETRIS!"];

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  startScreen: $("start-screen"),
  play: $<HTMLButtonElement>("play"),
  countdown: $("countdown"),
  gameView: $("game-view"),
  modal: $("modal"),
  panels: document.querySelectorAll<HTMLElement>("[data-panel]"),
  highscores: $("highscores"),
  level: $("level"),
  lines: $("lines"),
  score: $("score"),
  fadeText: $("fade-text"),
  video: $<HTMLVideoElement>("background-video"),
  configForm: $<HTMLFormElement>("config-form"),
  gameOverTitle: $("gameover-title"),
  gameOverScore: $("gameover-score"),
};

let settings = loadSettings();
const highScores = loadHighScores();
setVolumes(settings.musicVolume, settings.sfxVolume);

let controls = loadControls();

const renderer = new Renderer({
  board: $<HTMLCanvasElement>("board-canvas"),
  hold: $<HTMLCanvasElement>("hold-canvas"),
  next: $<HTMLCanvasElement>("next-canvas"),
  colors: settings,
  boardWidth: BOARD_WIDTH,
  boardHeight: BOARD_HEIGHT,
});
const demo = new Demo($<HTMLCanvasElement>("demo-canvas"), settings);

let game: Game | null = null;
let paused = false;
let starting = false;
let countdownLeft = 0; // ms of "3, 2, 1, GO!" still to show
let lastFrame = 0;
let frameId = 0;
let hudKey = "";
let fadeTimer = 0;

// ---------------------------------------------------------------------------
// Game loop

function frame(time: number): void {
  if (!game) return;
  const dt = Math.min(time - lastFrame, MAX_FRAME_MS);
  lastFrame = time;

  if (!paused && countdownLeft > 0) {
    countdownLeft -= dt;
    updateCountdown();
  } else if (!paused && game.phase !== "over") {
    input.update(dt);
    game.update(dt);
  }
  renderer.render(game);
  updateHud(game);
  frameId = requestAnimationFrame(frame);
}

function updateHud(g: Game): void {
  const key = `${g.level}|${g.lines}|${g.score}`;
  if (key === hudKey) return;
  hudKey = key;
  ui.level.textContent = `LEVEL: ${g.level}`;
  ui.lines.textContent = `LINES: ${g.lines}`;
  ui.score.textContent = `SCORE: ${g.score}`;
}

function onGameEvent(event: GameEvent): void {
  switch (event.type) {
    case "move":
      playEffect("move");
      break;
    case "rotate":
      playEffect("rotate");
      break;
    case "hardDrop":
      playEffect("drop");
      break;
    case "clear":
      playEffect("clear");
      shake();
      showText(`${CLEAR_LABELS[event.lines]}\n${event.points}`);
      break;
    case "gameOver":
      void gameOver();
      break;
  }
}

function onAction(action: Action): void {
  if (!game) return;
  if (action === "pause") {
    if (paused) resume();
    else pause();
    return;
  }
  if (paused || countdownLeft > 0) return;

  switch (action) {
    case "left":
      game.moveLeft();
      break;
    case "right":
      game.moveRight();
      break;
    case "softDrop":
      game.softDrop();
      break;
    case "hardDrop":
      game.hardDrop();
      break;
    case "rotateRight":
      game.rotate(1);
      break;
    case "rotateLeft":
      game.rotate(-1);
      break;
    case "hold":
      game.holdPiece();
      break;
  }
}

const input = new Input(controls, onAction);

// ---------------------------------------------------------------------------
// Screens

async function start(): Promise<void> {
  if (starting) return;
  starting = true;
  closeModal();
  await waitForVideo();
  starting = false;

  game = new Game(undefined, onGameEvent);
  paused = false;
  hudKey = "";
  countdownLeft = COUNTDOWN.length * COUNTDOWN_STEP_MS;
  updateCountdown();
  demo.stop();
  document.body.classList.add("in-game");
  ui.startScreen.hidden = true;
  ui.gameView.hidden = false;
  void ui.video.play().catch(() => {});
  input.reset();
  input.enabled = true;
  startMusic();
  lastFrame = performance.now();
  cancelAnimationFrame(frameId); // restarting from the pause menu must not stack loops
  frameId = requestAnimationFrame(frame);
}

function backToMenu(): void {
  closeModal(); // quitting from the pause menu must not leave it open
  game = null;
  paused = false;
  input.enabled = false;
  stopMusic();
  ui.video.pause();
  document.body.classList.remove("in-game");
  ui.gameView.hidden = true;
  ui.startScreen.hidden = false;
  renderHighScores();
  demo.start();
}

// The game starts over the background video, so give it a moment to be ready
// instead of starting on a blank screen.
async function waitForVideo(): Promise<void> {
  const video = ui.video;
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA || video.error) return;
  const label = ui.play.textContent;
  ui.play.textContent = "LOADING...";
  ui.play.disabled = true;
  video.preload = "auto";
  await new Promise<void>((resolve) => {
    const done = () => {
      video.removeEventListener("canplay", done);
      video.removeEventListener("error", done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, VIDEO_WAIT_MS);
    video.addEventListener("canplay", done);
    video.addEventListener("error", done);
    video.load();
  });
  ui.play.textContent = label;
  ui.play.disabled = false;
}

function updateCountdown(): void {
  const step = COUNTDOWN.length - Math.ceil(countdownLeft / COUNTDOWN_STEP_MS);
  const text = countdownLeft > 0 ? COUNTDOWN[step] : "";
  if (ui.countdown.textContent !== text) ui.countdown.textContent = text;
}

async function gameOver(): Promise<void> {
  if (!game) return;
  const finalScore = game.score;
  input.enabled = false;
  stopMusic();
  playEffect("gameOver");
  await new Promise((resolve) => setTimeout(resolve, GAME_OVER_DELAY_MS));
  const isHighScore = submitHighScore(highScores, finalScore);
  backToMenu();
  ui.gameOverTitle.textContent = isHighScore ? "New High Score!" : "Game Over";
  ui.gameOverScore.textContent = `Score: ${finalScore}`;
  openModal("gameover");
}

function pause(): void {
  if (!game || paused || game.phase === "over") return;
  paused = true;
  input.reset();
  pauseMusic();
  openModal("pause");
}

function resume(): void {
  if (!paused) return;
  paused = false;
  closeModal();
  resumeMusic();
}

function renderHighScores(): void {
  ui.highscores.replaceChildren(
    ...highScores.map((score, i) => {
      const row = document.createElement("tr");
      const rank = document.createElement("td");
      rank.className = "rank";
      rank.textContent = RANKS[i] ?? "";
      const value = document.createElement("td");
      value.textContent = String(score);
      row.append(rank, value);
      return row;
    }),
  );
}

// ---------------------------------------------------------------------------
// Modal

function openModal(panel: string): void {
  ui.panels.forEach((p) => (p.hidden = p.dataset.panel !== panel));
  ui.modal.hidden = false;
}

function closeModal(): void {
  ui.modal.hidden = true;
  controlsPanel.cancel();
}

// Closing the modal while paused (× or clicking outside) resumes the game.
function dismissModal(): void {
  if (paused) resume();
  else closeModal();
}

function fillConfigForm(values: Settings): void {
  const form = ui.configForm.elements;
  (form.namedItem("background") as HTMLInputElement).value = values.background;
  (form.namedItem("grid") as HTMLInputElement).value = values.grid;
  (form.namedItem("border") as HTMLInputElement).value = values.border;
  (form.namedItem("musicVolume") as HTMLInputElement).value = String(values.musicVolume);
  (form.namedItem("sfxVolume") as HTMLInputElement).value = String(values.sfxVolume);
}

function readConfigForm(): Settings {
  const data = new FormData(ui.configForm);
  return {
    background: String(data.get("background")),
    grid: String(data.get("grid")),
    border: String(data.get("border")),
    musicVolume: Number(data.get("musicVolume")),
    sfxVolume: Number(data.get("sfxVolume")),
  };
}

// ---------------------------------------------------------------------------
// Effects

function shake(): void {
  document.body.classList.remove("shake");
  void document.body.offsetWidth; // restart the CSS animation
  document.body.classList.add("shake");
}

function showText(text: string): void {
  ui.fadeText.textContent = text;
  ui.fadeText.style.opacity = "1";
  clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(() => (ui.fadeText.style.opacity = "0"), 2000);
}

// ---------------------------------------------------------------------------
// Wiring

const controlsPanel = new ControlsPanel($("controls-body"), controls, (updated) => {
  controls = updated;
  saveControls(controls);
  input.setControls(controls);
});

ui.play.addEventListener("click", () => void start());
$("controls").addEventListener("click", () => openModal("controls"));
$("configuration").addEventListener("click", () => {
  fillConfigForm(settings);
  openModal("config");
});
$("modal-close").addEventListener("click", dismissModal);
ui.modal.addEventListener("click", (e) => {
  if (e.target === ui.modal) dismissModal();
});
$("resume").addEventListener("click", resume);
$("restart").addEventListener("click", () => void start());
$("controls-reset").addEventListener("click", () => {
  controls = cloneControls(DEFAULT_CONTROLS);
  saveControls(controls);
  input.setControls(controls);
  controlsPanel.set(controls);
});
$("quit").addEventListener("click", backToMenu);
$("cfg-reset").addEventListener("click", () => fillConfigForm(DEFAULT_SETTINGS));

ui.configForm.addEventListener("submit", (e) => {
  e.preventDefault();
  settings = readConfigForm();
  saveSettings(settings);
  setVolumes(settings.musicVolume, settings.sfxVolume);
  renderer.setColors(settings);
  demo.setColors(settings);
  closeModal();
});

window.addEventListener("resize", () => {
  renderer.resize();
  demo.resize();
});
// Enter starts a game from the main menu.
window.addEventListener("keydown", (e) => {
  if (e.code === "Enter" && !game && !starting && ui.modal.hidden && document.activeElement === document.body) {
    e.preventDefault();
    void start();
  }
});
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
document.body.addEventListener("animationend", () => document.body.classList.remove("shake"));

renderHighScores();

demo.start();

// Show the title and menu only once the background image is ready, so the
// buttons don't appear over an empty screen first. Then start fetching the
// in-game video so it is usually ready by the time the player presses PLAY.
const wallpaper = new Image();
wallpaper.src = `${import.meta.env.BASE_URL}images/wallpaper.webp`;
let menuShown = false;
const showMenu = () => {
  if (menuShown) return;
  menuShown = true;
  document.body.classList.remove("loading");
  ui.video.preload = "auto";
  ui.video.load();
};
wallpaper.decode().then(showMenu, showMenu);
setTimeout(showMenu, 3000); // don't hide the menu forever on a slow connection
