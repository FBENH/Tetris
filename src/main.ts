import "./style.css";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./core/board";
import { Game, type GameEvent } from "./core/game";
import { pauseMusic, playEffect, resumeMusic, setVolumes, startMusic, stopMusic } from "./ui/audio";
import { Input, type Action } from "./ui/input";
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
const MAX_FRAME_MS = 100; // avoid a burst of gravity after a long frame
const CLEAR_LABELS = ["", "SINGLE!", "DOUBLE!", "TRIPLE!", "TETRIS!"];

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
  menu: $("menu"),
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

const renderer = new Renderer(
  $<HTMLCanvasElement>("board-canvas"),
  $<HTMLCanvasElement>("hold-canvas"),
  $<HTMLCanvasElement>("next-canvas"),
  settings,
  BOARD_WIDTH,
  BOARD_HEIGHT,
);

let game: Game | null = null;
let paused = false;
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

  if (!paused && game.phase !== "over") {
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
  if (paused) return;

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

const input = new Input(onAction);

// ---------------------------------------------------------------------------
// Screens

function start(): void {
  closeModal();
  game = new Game(undefined, onGameEvent);
  paused = false;
  hudKey = "";
  document.body.classList.add("in-game");
  ui.menu.hidden = true;
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
  game = null;
  paused = false;
  input.enabled = false;
  stopMusic();
  ui.video.pause();
  document.body.classList.remove("in-game");
  ui.gameView.hidden = true;
  ui.menu.hidden = false;
  renderHighScores();
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
    ...highScores.map((score) => {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.textContent = String(score);
      row.append(cell);
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

$("play").addEventListener("click", start);
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
$("restart").addEventListener("click", start);
$("quit").addEventListener("click", backToMenu);
$("cfg-reset").addEventListener("click", () => fillConfigForm(DEFAULT_SETTINGS));

ui.configForm.addEventListener("submit", (e) => {
  e.preventDefault();
  settings = readConfigForm();
  saveSettings(settings);
  setVolumes(settings.musicVolume, settings.sfxVolume);
  renderer.setColors(settings);
  closeModal();
});

window.addEventListener("resize", () => renderer.resize());
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
document.body.addEventListener("animationend", () => document.body.classList.remove("shake"));

renderHighScores();
