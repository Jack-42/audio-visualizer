const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const FFT_WINDOW_SIZE = 2048;

let audioElement;
let canvasCtx;
let canvasWidth;
let canvasHeight;

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
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    canvasCtx = canvas.getContext("2d");
    clearCanvas();

    const ctx = new AudioContext();

    analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_WINDOW_SIZE;
    const bufferSize = analyser.frequencyBinCount;
    fftBuffer = new Uint8Array(bufferSize);

    const source = ctx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    processIntervalInMs = (FFT_WINDOW_SIZE / ctx.sampleRate) * 1000;
}

function start() {
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
    analyser.getByteFrequencyData(fftBuffer);
    clearCanvas();
    drawSpectrum();
}

function clearCanvas() {
    canvasCtx.fillStyle = "gray";
    canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function drawSpectrum() {
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = "red";
    canvasCtx.beginPath();

    const segmentWidth = canvasWidth / fftBuffer.length;
    let x = 0.0;

    // iterate through buffer and add line segments
    for (let i = 0; i < fftBuffer.length; i++) {
        const value = fftBuffer[i] / 256.0;
        const y = canvasHeight - value * canvasHeight;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += segmentWidth;
    }

    // draw the line
    canvasCtx.stroke();
}
