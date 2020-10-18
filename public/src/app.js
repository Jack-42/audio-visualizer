const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const FFT_WINDOW_SIZE = 2048;

let audioElement;
let canvasCtx;

let analyser;
let fftBuffer;
let processIntervalInMs;
let timer;

function init() {
    audioElement = document.getElementById("test-audio");
    audioElement.addEventListener("ended", () => {
        clearInterval(timer);
    });

    const canvas = document.getElementById("spectrum-canvas");
    canvasCtx = canvas.getContext("2d");

    const ctx = new AudioContext();

    analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_WINDOW_SIZE;
    const bufferSize = analyser.frequencyBinCount;
    fftBuffer = new Float32Array(bufferSize);

    const source = ctx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    processIntervalInMs = (FFT_WINDOW_SIZE / ctx.sampleRate) * 1000;
}

function play() {
    audioElement.play();
    timer = setInterval(() => {
        process();
    }, processIntervalInMs);
}

function stop() {
    audioElement.pause();
    audioElement.currentTime = 0;
    clearInterval(timer);
}

function process() {
    analyser.getFloatFrequencyData(fftBuffer);
    console.log(fftBuffer);
}
