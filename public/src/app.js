const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const WINDOW_SIZE = 512;

let audioCtx;
let analyzer;
let fftBuffer;
let updateIntervalInMs;
let timer;

let audioBuffer;
let audioSource;

let startTime;

let canvasCtx;
let canvasWidth;
let canvasHeight;

function init() {
    audioCtx = new AudioContext();

    analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = WINDOW_SIZE;
    const bufferSize = analyzer.frequencyBinCount;
    fftBuffer = new Uint8Array(bufferSize);
    analyzer.connect(audioCtx.destination);
    updateIntervalInMs = (WINDOW_SIZE / audioCtx.sampleRate) * 1000;

    const canvas = document.getElementById("spectrum-canvas");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    canvasCtx = canvas.getContext("2d");
    clearCanvas();
}

function loadFile(file) {
    const statusLabel = document.getElementById("status");
    statusLabel.textContent = "Loading...";
    const reader = new FileReader();
    reader.onload = async () => {
        const data = reader.result;
        audioBuffer = await audioCtx.decodeAudioData(data);
        statusLabel.textContent = "Ready";
    };
    reader.readAsArrayBuffer(file);
}

function start() {
    // for whatever reason, cannot reuse a source node, need to re-create it for each start
    if (audioSource) {
        audioSource.disconnect();
    }
    audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(analyzer);

    timer = setInterval(() => {
        update();
    }, updateIntervalInMs);

    startTime = audioCtx.currentTime;
    audioSource.start();
}

function stop() {
    if (audioSource) {
        audioSource.stop();
    }
    clearInterval(timer);
    document.getElementById("time").textContent = "00:00";
}

function update() {
    updateTimeLabel();

    analyzer.getByteFrequencyData(fftBuffer);
    clearCanvas();
    drawSpectrum();
}

function updateTimeLabel() {
    const timeInSeconds = audioCtx.currentTime - startTime;
    const date = new Date(0);
    date.setSeconds(timeInSeconds);
    const timeString = date.toISOString().substr(14, 5);
    document.getElementById("time").textContent = timeString;
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
