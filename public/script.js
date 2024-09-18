import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    BLOCK_SIZE,
    SAVED_PIECE_CONTAINER_SIZE,
    PIECE_BAG_CANVAS_HEIGHT,
    initialSpeed,
    COLORS,
    PIECES,
    CONTROLS,    
    HIGH_SCORE_KEY ,
    SOUNDS,
    DROP_ANIMATION_SPEED,
    CLEAR_ANIMATION_SPEED,
    PIECE_INITIAL_POSITION,
    SAVED_PB_INITIAL_POSITION
} from "./constants.js";
import { playSound, resumeSound, pauseSound, playSoundTrack, finishSoundTrack, volumes } from "./sounds.js";
import { videoBackground } from "./video.js";


document.addEventListener("DOMContentLoaded", () => {
//-----------------------------------------------------------------------------------------------------
// Global Variables
let speed = initialSpeed;
let lines = 0;
let score = 0;
let holding = false;
let gameOver = true;
let pause = false;
let isDropping = false;
// Array containing available pieces
let pieceBag = [];
// Playable piece
let piece = null;
let savedPiece = null;
// Init scores
let topScores = JSON.parse(localStorage.getItem(HIGH_SCORE_KEY)) || [5000, 4000, 3000, 2000, 1000];
let scoreElement = document.getElementById("score");
let levelElement = document.getElementById("level");
let linesElement = document.getElementById("lines");
//-----------------------------------------------------------------------------------------------------

// Add controls
async function handleKeyDown(event) {    
    if (gameOver) return;
    switch (event.key) {
        case CONTROLS.MOVE_LEFT:
            movePiece(-1, 0);
            playSound(SOUNDS.MOVE);
            break;
        case CONTROLS.MOVE_RIGHT:
            movePiece(1, 0);
            playSound(SOUNDS.MOVE);
            break;
        case CONTROLS.MOVE_DOWN:
            movePiece(0, 1);
            break;
        case CONTROLS.ROTATE_RIGHT:
            rotatePieceClockwise();
            playSound(SOUNDS.ROTATE);
            break;
        case CONTROLS.ROTATE_LEFT:
        case CONTROLS.ROTATE_LEFT.toLowerCase():
            rotatePieceCounterclockwise();
            playSound(SOUNDS.ROTATE);
            break;
        case " ":
            if (!isDropping) {
                playSound(SOUNDS.DROP);
                isDropping = true;
                dropPiece();
                await wait(DROP_ANIMATION_SPEED);
                isDropping = false;
            }            
            break;
        case CONTROLS.HOLD:
        case CONTROLS.HOLD.toLowerCase():
            holdPiece();
            break;
        case CONTROLS.PAUSE:
            pauseGame();
            break;
    }    
}

function movePiece(dx, dy) {
    piece.position.x += dx;
    piece.position.y += dy;
    if (checkCollision(piece)) {
        piece.position.x -= dx;
        piece.position.y -= dy;
        if (dy > 0) {
            solidifyPiece();
            clearRows();
        }
    }
}

function rotatePieceClockwise() {
    const rotated = rotateShapeClockwise(piece.shape);
    applyRotation(rotated);
} 

function rotateShapeClockwise(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    let rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            rotated[c][rows - 1 - r] = shape[r][c];
        }
    }

    return rotated;
}

function rotatePieceCounterclockwise() {
    const rotated = rotateShapeCounterclockwise(piece.shape);
    applyRotation(rotated);
}

function rotateShapeCounterclockwise(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    let rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            rotated[cols - 1 - c][r] = shape[r][c];
        }
    }

    return rotated;
}

function applyRotation(rotated) {
    let previousShape = piece.shape;
    let previousPosition = piece.position.x;
    piece.shape = rotated;
    if (checkCollision(piece)) {
        adjustPositionForRotation();
    }
    if (checkCollision(piece)) {
        piece.shape = previousShape;
        piece.position.x = previousPosition;
    }
}

function adjustPositionForRotation() {
    const offset = piece.shape[0]?.length === 4 ? piece.shape[0]?.length - 3 : piece.shape[0]?.length - 2;
    piece.position.x = piece.position.x <= BOARD_WIDTH / 2 ? piece.position.x + offset : piece.position.x - offset;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function dropPiece() {
    removeAllKeyDownListeners(); 
    await animateDropPiece();    
    while (!checkCollision(piece)) {           
        piece.position.y++;             
    }    
    piece.position.y--;
    solidifyPiece();
    clearRows();
    document.addEventListener("keydown", handleKeyDown);
}

function holdPiece() {
    if (!holding) {
        if (!savedPiece) {
            savePiece();
        } else {
            swapPieces();
        }
    }
}

function savePiece() {    
    piece.position.x = 2;
    piece.position.y = 2;
    savedPiece = piece;
    piece = pieceBag.pop();    
    piece.position.x = 5;
    piece.position.y = 0;
    addRandomPieceToBag();
    holding = true;
}

function swapPieces() {    
    [piece, savedPiece] = [savedPiece, piece];
    savedPiece.position.x = 2;
    savedPiece.position.y = 2;
    piece.position.x = 5;
    piece.position.y = 0;
    holding = true;
}

function addRandomPieceToBag() {
    let randomIndex = Math.floor(Math.random() * PIECES.length);
    pieceBag.unshift({
        shape: PIECES[randomIndex].shape,
        position: { x: 5, y: 0 },
        color: PIECES[randomIndex].color,
        drawingShape: PIECES[randomIndex].drawingShape
    });
}

function pauseGame() {
    speed = 0;
    pause = true;
    removeAllKeyDownListeners();
    pauseScreen();
}

function removeAllKeyDownListeners() {
    document.removeEventListener("keydown", handleKeyDown);   
}

//---------------------------------------------------------------------------------------------------------------
// Menu
const playButton = document.getElementById("play");
const game = document.getElementById("game-view");
const menu = document.getElementById("menu");

// Modal
const modal = document.getElementById("controlsDialog");
const controlsButton = document.getElementById("controls");
const closeButton = document.getElementsByClassName("close")[0];
const configButton = document.getElementById("configuration");

function start() {
    playSoundTrack(SOUNDS.SOUNDTRACK);
    document.querySelector("body").style.backgroundImage = "none";
    document.querySelector(".title").style.display = "none";
    gameOver = false;
    menu.style.display = "none";
    game.style.display = "grid";    
    document.body.style.backgroundColor = "#282828";
    videoBackground();
    document.addEventListener("keydown", handleKeyDown);
    initializeGame();
    update();
}

async function finish(quit) {
    gameOver = true;
    pause = false;
    finishSoundTrack(SOUNDS.SOUNDTRACK);
    if(!quit){
        playSound(SOUNDS.GAMEOVER);
        await wait(1500);
    }
    if (quit){
        closeModal();
    }
    removeAllKeyDownListeners();        
    menu.style.display = "block";
    game.style.display = "none";
    document.getElementById("myVideo").style.display = "none";
    document.body.style.backgroundColor = "#000";   
    document.querySelector("body").style.backgroundImage = "url(images/wallpaperflare.com_wallpaper.jpg)";
    document.querySelector("body").style.backgroundSize = "contain";

    document.querySelector(".title").style.display = "block";
}

playButton.addEventListener("click", start);

    
function showControls() {
    modal.style.display = "block";
    updateModalContentControls();        
}


// Function to update modal content for controls
function updateModalContentControls() {
    const modalContent = document.querySelector(".modal-content");
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <div>            
            <table>            
                <tbody>
                    <tr>
                        <td>MOVE LEFT</td>
                        <td><span class="control-key">←</span></td>
                    </tr>
                    <tr>
                        <td>MOVE RIGHT</td>
                        <td><span class="control-key">→</span></p></td>
                    </tr>
                    <tr>
                        <td>ROTATE RIGHT</td>
                        <td><span class="control-key">↑</span></td>
                    </tr>
                    <tr>
                        <td>ROTATE LEFT</td>
                        <td><span class="control-key">Z</span></td>
                    </tr>
                    <tr>
                        <td>SOFT DROP</td>
                        <td><span class="control-key">↓</span></td>
                    </tr>
                    <tr>
                        <td>HARD DROP</td>
                        <td><span class="control-key">Space</span></td>
                    </tr>
                    <tr>
                        <td>HOLD PIECE</td>
                        <td><span class="control-key">C</span></td>
                    </tr>
                    <tr>
                        <td>PAUSE</td>
                        <td><span class="control-key">Escape</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    const newCloseButton = modalContent.querySelector(".close");
    newCloseButton.onclick = closeModal;
}

// CONFIGURATION
function showConfig() {    
    modal.style.display = "block";
    updateModalContentConfig();
}

function updateModalContentConfig() {
    const modalContent = document.querySelector(".modal-content");
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <div>
            <table>            
                <tbody>
                    <tr>
                        <td>BACKGROUND COLOR</td>
                        <td><input type="color" id="background-color" name="background-color" value="${COLORS.BACKGROUND}"></td>
                    </tr>
                    <tr>
                        <td>GRID COLOR</td>
                        <td><input type="color" id="grid-color" name="grid-color" value="${COLORS.GRID}"></td>
                    </tr>
                    <tr>
                        <td>BORDER COLOR</td>
                        <td><input type="color" id="border-color" name="border-color" value="${COLORS.BORDER}"></td>
                    </tr>
                    <tr>
                        <td>MUSIC VOLUME</td>
                        <td><input type="range" id="music-volume" name="music-volume" min="0" max="1" step="0.1" value="${volumes.music}"></td>
                    </tr>
                    <tr>
                        <td>SFX VOLUME</td>
                        <td><input type="range" id="sfx-volume" name="sfx-volume" min="0" max="1" step="0.1" value="${volumes.sfx}"></td>
                    </tr>
                    <tr>
                        <td colspan="2" class="confirmContainer">
                            <button id="confirm-button" class="menuButton">SAVE</button>
                        </td>                        
                    </tr>               
                </tbody>
            </table>            
        </div>
    `;

    const newCloseButton = modalContent.querySelector(".close");
    newCloseButton.onclick = closeModal;

    // Actualizar los valores del slider en tiempo real
    let musicVolumeSlider = modalContent.querySelector("#music-volume");
    let musicVolumeValue = modalContent.querySelector("#music-volume-value");    
    let sfxVolumeSlider = modalContent.querySelector("#sfx-volume");
    let sfxVolumeValue = modalContent.querySelector("#sfx-volume-value");    

    // Agregar funcionalidad al botón de confirmar
    const confirmButton = modalContent.querySelector("#confirm-button");
    confirmButton.onclick = () => {
        COLORS.BACKGROUND = document.querySelector("#background-color").value;
        COLORS.GRID = document.querySelector("#grid-color").value;
        COLORS.BORDER = document.querySelector("#border-color").value;
        volumes.music = parseFloat(document.querySelector("#music-volume").value);
        volumes.sfx = parseFloat(document.querySelector("#sfx-volume").value);
        closeModal();
    };
}

// Function to close the modal
function closeModal() {
    modal.style.display = "none";
}
// Function to resume the game
function resume() {
    closeModal();
    pause = false;
    resumeSound(SOUNDS.SOUNDTRACK);
    document.addEventListener("keydown", handleKeyDown);
    speed = lines > 10 ? Math.floor(lines / 10) : 1;
}

// Function to reboot the game
function rebootGame() {
    playSoundTrack(SOUNDS.SOUNDTRACK);
    closeModal();
    initializeGame();
    resume();
}

// Event listeners for modal
controlsButton.onclick = showControls;
closeButton.onclick = closeModal;
configButton.onclick = showConfig;

// Close the modal when clicking outside of it
window.onclick = function(event) {
    if (event.target === modal) {
        closeModal();
    }
    if (pause) {
        resume();
    }
}

function gameOverScreen (highScore) {    
    modal.style.display = "block";
    let modalContent = document.querySelector(".modal-content");
    modalContent.innerHTML = "";    
    let localCloseButton = document.createElement("span");
    localCloseButton.className = "close";
    localCloseButton.textContent = "\u00D7";
    modalContent.append(localCloseButton);    
    localCloseButton.onclick = closeModal;
    let message = highScore ? "New High Score!" : "Game Over";
    let h2 = document.createElement("h2");
    h2.innerText = message;
    modalContent.append(h2);
    let p = document.createElement("p");
    p.innerText = "Score: " + score.toString();
    modalContent.append(p);
}
    


// Function to show pause screen
function pauseScreen() {
    pauseSound(SOUNDS.SOUNDTRACK);
    modal.style.display = "block";
    const modalContent = document.querySelector(".modal-content");
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <h2>Paused</h2>
        <div id="wrapper">
            <button class="menuButton play" onclick="resume()">RESUME</button>
            <button class="menuButton" onclick="rebootGame()">RESTART</button>                   
            <button class="menuButton" onclick="finish(true)">QUIT</button>
        </div>
    `;
    const newCloseButton = modalContent.querySelector(".close");
    newCloseButton.onclick = () => {
        closeModal();
        resume();
    };    
}    

// Make the functions available globally
window.rebootGame = rebootGame;
window.finish = finish;
window.resume = resume;
//---------------------------------------------------------------------------------------------------------------
// Game Context
// Canvas Context Initialization
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const savedPieceCanvas = document.getElementById("saved-piece");
const contextSavedPiece = savedPieceCanvas.getContext("2d");
const pieceBagCanvas = document.getElementById("piece-bag");
const contextPieceBag = pieceBagCanvas.getContext("2d");

// Constants
canvas.width = BOARD_WIDTH * BLOCK_SIZE;
canvas.height = BOARD_HEIGHT * BLOCK_SIZE;
savedPieceCanvas.width = SAVED_PIECE_CONTAINER_SIZE * BLOCK_SIZE;
savedPieceCanvas.height = SAVED_PIECE_CONTAINER_SIZE * BLOCK_SIZE;
pieceBagCanvas.width = SAVED_PIECE_CONTAINER_SIZE * BLOCK_SIZE;
pieceBagCanvas.height = PIECE_BAG_CANVAS_HEIGHT * BLOCK_SIZE;

// Apply scaling
context.scale(BLOCK_SIZE, BLOCK_SIZE);
contextSavedPiece.scale(BLOCK_SIZE, BLOCK_SIZE);
contextPieceBag.scale(BLOCK_SIZE, BLOCK_SIZE);


let board = Array.from({ length: BOARD_HEIGHT }, () => 
    Array.from({ length:  BOARD_WIDTH}, () => ({val:0,color:""}))
);

//---------------------------------------------------------------------------------------------------------------
// Drawing functions and GameLoop (update function)

function draw() {    
    drawBackground(context, BOARD_WIDTH, BOARD_HEIGHT, true);
    drawBackground(contextSavedPiece, savedPieceCanvas.width, savedPieceCanvas.height, false);    
    drawBackground(contextPieceBag, pieceBagCanvas.width, pieceBagCanvas.height, false);
    
    drawBoard();
    drawShadow();
    
    if (piece) drawPiece(piece, context);    
    if (savedPiece) drawStaticPiece(savedPiece, contextSavedPiece);
    if (animatedPiece) drawPiece(animatedPiece, context);
    drawPieceBag(pieceBag, contextPieceBag);    
}

function drawBackground(ctx, width, height, grid) {
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = COLORS.GRID;
    if (grid)
        drawGrid(ctx, width, height);
}

function drawGrid(ctx, width, height) {
    for (let i = 0; i < width; i++) {
        ctx.fillRect(i, 0, 0.05, height);
    }
    for (let i = 0; i < height; i++) {
        ctx.fillRect(0, i, width, 0.05);
    }
}

let dropCounter = 0
let lastTime = 0

function update(time = 0){
    if (gameOver)
        return;
    
    const deltaTime = time - lastTime
    lastTime = time

    dropCounter += deltaTime * speed    

    if(dropCounter > 1000){
        piece.position.y++;
        dropCounter = 0;

        if (checkCollision(piece)){
            piece.position.y--
            solidifyPiece()
            clearRows()
        }

    }

    window.requestAnimationFrame(update);     
    draw();
      
}

function drawPiece(piece, ctx) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const posX = x + piece.position.x;
                const posY = y + piece.position.y;
                drawBlock(ctx, posX, posY, piece.color);
                drawBorders(ctx, piece, COLORS.BORDER, posX, posY, x, y, row, false);
            }
        });
    });
}

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
}

function drawBorders(context, piece, style, posX, posY, x, y, row, drawingShape) {
    context.fillStyle = style;              
    const shape = drawingShape? piece.drawingShape : piece.shape;

    // Borde inferior
    if (y === shape.length - 1 || !shape[y + 1] || !shape[y + 1][x]) {
        context.fillRect(posX, posY + 1, 1, 0.05);
    }

    // Borde derecho
    if (x === row.length - 1 || !shape[y][x + 1]) {
        context.fillRect(posX + 1, posY, 0.05, 1);
    }

    // Borde izquierdo
    if (x === 0 || !shape[y][x - 1]) {
        context.fillRect(posX, posY, 0.05, 1);
    }

    // Borde superior
    if (y === 0 || !shape[y - 1] || !shape[y - 1][x]) {
        context.fillRect(posX, posY, 1, 0.05);
    }

    // Bordes internos
    context.fillRect(posX, posY, 0.05, 1);      
    context.fillRect(posX, posY, 1, 0.05);   
}

function drawPieceBag(pieces, context) {    
    let sum = 3;    
    for (let i = pieces.length - 1; i >= pieces.length / 2; i--){        
        pieces[i].position.x = 2;
        pieces[i].position.y = sum;
        sum += 4.5;
        drawStaticPiece(pieces[i],context)
    }

}
function drawStaticPiece(piece, ctx) {    
    piece.drawingShape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                let posX = x + piece.position.x;
                let posY = y + piece.position.y;
                // Ajuste basado en el tamaño de la pieza
                if (piece.drawingShape[0].length > 3) {
                    posX -= 1;
                    posY += 0.5;                    
                } else if (piece.drawingShape[0].length === 2) {
                    // No se necesitan ajustes adicionales
                } else {
                    posX -= 0.25;
                }
                drawBlock(ctx, posX, posY, piece.color);                
                drawBorders(ctx, piece, COLORS.BORDER, posX, posY, x, y, row,true);
            }
        });
    });
}

function drawShadow() {
    const shadowY = findShadowY();
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const posX = x + piece.position.x;
                const posY = y + shadowY;                    
                drawShadowBorders(posX, posY, x, y, row);
            }
        });
    });
}
    
function findShadowY() {
    const boardWidth = board[0].length;
    const boardHeight = board.length;
    let shadowY = 0;
    for (let y = piece.position.y; y < boardHeight; y++) {
        if (canPlaceAt(piece.position.x, y)) {
            shadowY = y;
        } else {
            break;
        }
    }
    return shadowY;
}
    
function canPlaceAt(x, y) {
    return piece.shape.every((row, py) => 
        row.every((value, px) => {
            if (value) {
                const boardX = x + px;
                const boardY = y + py;
                return boardX >= 0 && boardX < BOARD_WIDTH && boardY < BOARD_HEIGHT && board[boardY][boardX].val === 0;
            }
            return true;
        })
    );
}
    
function drawShadowBorders(posX, posY, x, y, row) {
    context.fillStyle = piece.color;
    if (y === 0 || !piece.shape[y - 1][x]) {
        context.fillRect(posX, posY, 1, 0.05);
    }
    if (y === piece.shape.length - 1 || !piece.shape[y + 1][x]) {
        context.fillRect(posX, posY + 1, 1, 0.05);
    }
    if (x === 0 || !piece.shape[y][x - 1]) {
        context.fillRect(posX, posY, 0.05, 1);
    }
    if (x === row.length - 1 || !piece.shape[y][x + 1]) {
        context.fillRect(posX + 1, posY, 0.05, 1);
    }
    context.fillRect(posX, posY, 0.05, 1);      
    context.fillRect(posX, posY, 1, 0.05);
}
function drawBoard(){
    board.forEach((row,y) => {
        row.forEach((value,x)=>{
            if (value.val){
                context.fillStyle = value.color;
                context.fillRect(x,y,1,1);
                context.fillStyle = COLORS.BACKGROUND;
                //borde superior
                context.fillRect(x, y, 1, 0.05);
                //borde inferior
                context.fillRect(x, y + 1, 1, 0.05);
                //borde derecho
                context.fillRect(x, y, 0.05, 1);
                //borde izquierdo
                context.fillRect(x + 1, y, 0.05, 1);                
            }                       
        })
    });
}

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Game initialization and useful functions

function checkCollision(piece){
    return piece.shape.some((row,y)=>{
        return row.some((value,x)=>{            
            return (                
                value != 0 &&                
                board[y + piece.position.y]?.[x + piece.position.x]?.val != 0
            )
        })
    });    
}


function solidifyPiece(){        
        piece.shape.forEach((row, y)=> {
        row.forEach((value,x) =>{
            if (value === 1){
                board[y + piece.position.y][x + piece.position.x].val = 1;
                board[y + piece.position.y][x + piece.position.x].color = piece.color;
            }
        })
    })
    //get new piece
    //agrego pieza que saqué
    let randomIndex = Math.floor(Math.random() * PIECES.length);
    pieceBag.unshift({
        shape: PIECES[randomIndex].shape,
        position: {
            x: 5,
            y:0
        },
        color: PIECES[randomIndex].color,
        drawingShape: PIECES[randomIndex].drawingShape 
    }); 
    piece = pieceBag.pop();    
    holding = false;
    
    //reset position
    piece.position.y = 0;
    piece.position.x = 5;
    //game over
    if (checkCollision(piece)){                 
        finish();
        updateHighScores();
    }
   
}

function clearRows(){

    const rowsToRemove = [];

    board.forEach((row,y)=>{
        if (row.every( value => value.val === 1)){
            rowsToRemove.push(y);
        }
    });  

    //remove row, update score
    if (rowsToRemove.length > 0) {
        playSound(SOUNDS.CLEAR);
    }
    updateScore(rowsToRemove);
    rowsToRemove.forEach(async y => {
        await animateRowClear(rowsToRemove);
        board.splice(y,1)
        const newRow = Array.from({ length: BOARD_WIDTH }, () => ({ val: 0, color: "" }));
        board.unshift(newRow);            
    });
}

function updateScore (rowsToRemove){
    score += rowsToRemove.length * (speed * 100);
    lines += rowsToRemove.length;
    if (lines > 10){
        speed = Math.floor(lines / 10);
    }
    

    scoreElement.innerText = `SCORE: ${score}`;
    linesElement.innerText = `LINES: ${lines}`;
    levelElement.innerText = `LEVEL: ${speed}`;
}



function initializeGame () {
    dropCounter = 0;
    lastTime = 0;      
    //reset player piece
    piece = null;
    //Init scores and level
    speed = 1;
    lines = 0;
    score = 0;

    scoreElement.innerText = "SCORE: 0";
    levelElement.innerText = "LEVEL: 1";
    linesElement.innerText = "LINES: 0";

    //Value of holded piece
    holding = false;
    savedPiece = null;

    //Fill piece bag
    pieceBag = [];
    for (let i = 0; i < 7; i++){
        let randomIndex = Math.floor(Math.random() * PIECES.length);        
        pieceBag.push({
            shape: PIECES[randomIndex].shape,
            position: {
                x: 5,
                y:0
            },
            color: PIECES[randomIndex].color,
            drawingShape: PIECES[randomIndex].drawingShape
    });
    }

    //reset board
    board = board.map(row => row.map(() => ({val:0,color:""})));    
    
    //Get the first piece
    piece = pieceBag.pop();    
}

function updateHighScores() {
    if (score > topScores[topScores.length - 1]){
        // Add the new score
        topScores.push(score);

        // Sort scores in descending order
        topScores.sort((a, b) => b - a);

        // Keep only the top 5 scores
        if (topScores.length > 5) {
            topScores.pop();
        }

        // Save the updated list back to LocalStorage
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(topScores));
        
        gameOverScreen(true);

    }
    else{
        gameOverScreen(false);
    }
    renderScores();   
}

function renderScores() {
    let tbody = document.getElementById("highscores");
        tbody.innerHTML = "";        

        topScores.forEach(score => {            
            const tr = document.createElement('tr');         
            const td = document.createElement('td');
            td.textContent = score;            
            tr.appendChild(td);            
            tbody.appendChild(tr);
        });

        let scoreTable = document.getElementById("scoreTable");        
        scoreTable.appendChild(tbody);
}
renderScores();

// ANIMATIONS ------------------------------------------------------------------------------------------------------
let animatedPiece = null;

async function animateDropPiece() {
    animatedPiece = {
        position: {
            x: piece.position.x,
            y: piece.position.y
        },
        color: piece.color,
        shape: piece.shape        
    }
    while (!checkCollision(animatedPiece)) {
        await wait(DROP_ANIMATION_SPEED);
        animatedPiece.position.y++;             
    }
    animatedPiece = null;
}

async function animateRowClear(rowsToRemove) {
    shakeWindow();    
    switch(rowsToRemove.length){
        case 1:
            showText("SINGLE!\n" + (rowsToRemove.length * (speed * 100)).toString())
            break;
        case 2:
            showText("DOUBLE!\n" + (rowsToRemove.length * (speed * 100)).toString())
            break;
        case 3:
            showText("TRIPLE!\n" + (rowsToRemove.length * (speed * 100)).toString())
            break;
        case 4:
            showText("TETRIS!\n" + (rowsToRemove.length * (speed * 100)).toString())
            break;
    }
    
    for (const y of rowsToRemove) {
        // Animar el cambio de color de la fila
        for (let x = 0; x < BOARD_WIDTH; x++) {
            board[y][x].color = "gray";            
            await wait(CLEAR_ANIMATION_SPEED); // Espera antes de cambiar el siguiente celda
        }
    }
}

function shakeWindow() {
    // Get the body element or any other element you want to shake
    const body = document.body;
  
    // Add the 'shake' class to the element
    body.classList.add('shake');
  
    // Remove the class after the animation ends
    // This ensures the animation can be triggered again later
    setTimeout(() => {
      body.classList.remove('shake');
    }, 500); // Match the duration of the CSS animation
  }

function showText(text) {
    const fadeText = document.getElementById('fadeText');
    fadeText.innerText = text;
    // Show the text
    fadeText.style.opacity = 1;
  
    // Hide the text after 2 seconds (adjust as needed)
    setTimeout(() => {
      fadeText.style.opacity = 0;
    }, 2000); // 2000 milliseconds = 2 seconds
  }
// ---------------------------------------------------------------------------------------------------------------------
});