let ctx;
let audioElement;
let playing;

function init() {
    audioElement = document.getElementById("test-audio");
    audioElement.addEventListener("ended", () => {
        console.log("Audio ended");
    });

    const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers
    ctx = new AudioContext();
    const track = ctx.createMediaElementSource(audioElement);
    track.connect(ctx.destination);
}

function play() {
    audioElement.play();
}

function stop() {
    audioElement.pause();
    audioElement.currentTime = 0;
}
