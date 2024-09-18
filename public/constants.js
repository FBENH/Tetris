// Board Dimensions
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BLOCK_SIZE = window.innerHeight / 30;
export const DROP_ANIMATION_SPEED = 8;
export const CLEAR_ANIMATION_SPEED = 8;
export const PIECE_INITIAL_POSITION = {x: 5, y: 0};
export const SAVED_PB_INITIAL_POSITION = {x: 2, y: 2};

// Saved Piece Dimensions
export const SAVED_PIECE_CONTAINER_SIZE = 6;

// Piece Bag Dimensions
export const PIECE_BAG_CANVAS_HEIGHT = 18;

// Game Speed
export let initialSpeed = 1;

// Colors
export const COLORS = {
    BACKGROUND: "#000000",
    GRID: "#808080",
    BORDER: "#ffffff"
};

// Piece Shapes
export const PIECES = [
    {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: "#e3e100",
        drawingShape: [
            [1, 1],
            [1, 1]
        ],
    },
    {
        shape: [
            [1, 1, 1, 1]
        ],
        color: "#008986",
        drawingShape: [
            [1, 1, 1, 1]
        ],        
    },
    {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: "#FF6633",
        drawingShape: [
            [1, 1, 0],
            [0, 1, 1]
        ],   
    },
    {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: "#66CC33",
        drawingShape: [
            [0, 1, 1],
            [1, 1, 0]
        ],  
    },
    {
        shape: [
            [0, 0, 1],
            [1, 1, 1]            
        ],
        color: "#FF9933",
        drawingShape: [
            [0, 0, 1],
            [1, 1, 1]
        ],  
    },
    {
        shape: [
            [1, 0, 0],
            [1, 1, 1] 
        ],
        color: "#2745b9",
        drawingShape: [
            [1, 0, 0],
            [1, 1, 1]
        ],  
    },
    {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: "#9933FF",
        drawingShape: [
            [0, 1, 0],
            [1, 1, 1]
        ], 
    }
];

export const CONTROLS = {
    MOVE_LEFT: 'ArrowLeft',
    MOVE_RIGHT: 'ArrowRight',
    MOVE_DOWN: 'ArrowDown',
    ROTATE_RIGHT: 'ArrowUp',
    ROTATE_LEFT: "Z",    
    HOLD: 'C',
    PAUSE: 'Escape'
};

export const SOUNDS = {
    MOVE: "moveSound",
    DROP:  "dropSound",
    CLEAR: "clearSound",
    ROTATE: "rotateSound",
    SOUNDTRACK: "soundTrack",
    GAMEOVER: "gameOver"
};

// High Score
export const HIGH_SCORE_KEY = 'topScores';