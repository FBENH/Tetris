export const volumes = {
    music: 0.1,
    sfx: 0.2
}

export function playSound(soundId) {
    const sound = document.getElementById(soundId);
    sound.volume = volumes.sfx;
    if (sound) {        
        sound.pause();
        sound.currentTime = 0;
        sound.play();
    } 
}

export function playSoundTrack(soundId) {
    const sound = document.getElementById(soundId);
    sound.volume = volumes.music;
    if (sound) {        
        sound.pause();
        sound.currentTime = 0;
        sound.play();
    } 
}

export function pauseSound(soundId) {
    const sound = document.getElementById(soundId);
    sound.pause();
}

export function resumeSound(soundId) {
    const sound = document.getElementById(soundId);
    sound.play();
}

export function finishSoundTrack(soundId) {
    const sound = document.getElementById(soundId);
    sound.pause();
    sound.currentTime = 0;
}