const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const FFT_WINDOW_SIZE = 2048;

let audioCtx;
let analyzer;
let fftBuffer;

let canvasCtx;
let canvasWidth;
let canvasHeight;

function init() {
    audioCtx = new AudioContext();
    analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = FFT_WINDOW_SIZE;
    const bufferSize = analyzer.frequencyBinCount;
    fftBuffer = new Uint8Array(bufferSize);

    // TODO: create from file const source = ctx.createMediaElementSource(audioElement);
    /*
    source.connect(analyser);
    analyser.connect(ctx.destination);
     */

    const canvas = document.getElementById("spectrum-canvas");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    canvasCtx = canvas.getContext("2d");
    clearCanvas();
}

function load() {
    const files = document.getElementById("audio-file").files;
    if (files.length === 0) {
        alert("No file selected");
        return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
        const data = reader.result;
        const buffer = await audioCtx.decodeAudioData(data);
        console.log(buffer);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(analyzer);
        analyzer.connect(audioCtx.destination);
    };
    reader.readAsArrayBuffer(files[0]);
}

async function loadFile(ctx, path) {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

function start() {
    // TODO: play audio
}

function stop() {
    // TODO: stop audio
}

function process() {
    analyzer.getByteFrequencyData(fftBuffer);
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
