# Tetris

A browser Tetris built with TypeScript and the Canvas API, bundled with Vite.

👉 **[Play the game online here!](https://tetris-511d9.web.app/)** 👈

## Features

- Canvas rendering with the board, ghost piece, hold slot and a three-piece preview.
- Standard rotation system (SRS) with wall kicks, so pieces rotate next to walls and the stack the way players expect.
- 7-bag randomizer: every group of seven pieces contains each tetromino once.
- Lock delay (500 ms, up to 15 resets) to slide or rotate a piece after it lands.
- Levels every 10 lines, guideline scoring (100 / 300 / 500 / 800 × level, plus soft and hard drop points).
- Customizable board colors and volumes, saved in the browser along with the top 5 scores.

## Controls

| Action | Keys |
| --- | --- |
| Move | ← → |
| Soft drop | ↓ |
| Hard drop | Space |
| Rotate right | ↑ or X |
| Rotate left | Z |
| Hold | C or Shift |
| Pause | Esc or P |

![image](https://github.com/user-attachments/assets/c6f33e79-c724-4e26-870f-90471dd0aa76)



## Customizing Colors

![image](https://github.com/user-attachments/assets/86807efd-b0c8-4eac-a5e4-2c187330c421)

![image](https://github.com/user-attachments/assets/ce862a06-e6c0-46fd-9767-30a03b1ec01a)

## Development

Requires Node 22+.

```bash
npm install
npm run dev     # local server with hot reload
npm test        # game logic tests (Vitest)
npm run build   # type-check and build to dist/
```

The game logic in `src/core` has no DOM dependencies and is covered by the tests in `tests/`. `src/ui` holds rendering, input, audio and settings, and `src/main.ts` wires them together.

Deploy with `firebase deploy`; it builds the project first and publishes `dist/`.

