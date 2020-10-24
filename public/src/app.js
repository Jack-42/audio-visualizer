const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const WINDOW_SIZE = 512;
const DECIBELS_RANGE = 90;

let audioCtx;
let analyzer;
let fftBuffer;
let updateIntervalInMs;
let timer;

let audioBuffer;
let audioSource;

let ready = false;
let startTime;
let playerTime = 0;
let hasPlayerTimeChanged = false;

let canvasCtx;
let canvasWidth;
let canvasHeight;

let chart;

function init() {
    audioCtx = new AudioContext();

    analyzer = audioCtx.createAnalyser();
    analyzer.minDecibels = -DECIBELS_RANGE;
    analyzer.maxDecibels = 0;
    analyzer.fftSize = WINDOW_SIZE;
    const bufferSize = analyzer.frequencyBinCount;
    fftBuffer = new Uint8Array(bufferSize);
    analyzer.connect(audioCtx.destination);
    updateIntervalInMs = (WINDOW_SIZE / audioCtx.sampleRate) * 1000;

    const canvas = document.getElementById("spectrum-canvas");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    canvasCtx = canvas.getContext("2d");

    createChart();
}

function loadFile(file) {
    const statusLabel = document.getElementById("status");
    ready = false;
    statusLabel.textContent = "Loading...";
    const reader = new FileReader();
    reader.onload = async () => {
        const data = reader.result;
        audioBuffer = await audioCtx.decodeAudioData(data);
        ready = true;
        statusLabel.textContent = "Ready";
    };
    reader.readAsArrayBuffer(file);
}

async function playOrPause() {
    if (!ready) {
        return;
    }
    if (!audioSource) {
        // source has not been started yet or has just been stopped
        // needs to be re-started
        start();
    } else {
        // source is not stopped, i.e. it is either playing or paused
        await pauseOrResume();
    }
}

function start() {
    audioSource = audioCtx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(analyzer);
    audioSource.onended = (event) => {
        // this is triggered if playback has finished or if stop() is called
        onStop();
    }

    timer = setInterval(() => {
        update();
    }, updateIntervalInMs);

    document.getElementById("btn-play-pause").value = "Pause";
    document.getElementById("time-slider").max = Math.floor(audioBuffer.duration);
    document.getElementById("time").textContent = "00:00";
    document.getElementById("duration").textContent = getTimeString(audioBuffer.duration);

    startTime = audioCtx.currentTime;
    audioSource.start(0, playerTime);
}

async function pauseOrResume() {
    if (audioCtx.state === "running") {
        await audioCtx.suspend();
        document.getElementById("btn-play-pause").value = "Play";
    } else if (audioCtx.state === "suspended") {
        await audioCtx.resume();
        document.getElementById("btn-play-pause").value = "Pause";
    }
}

async function stop() {
    if (!audioSource) {
        return;
    }
    if (audioCtx.state === "suspended") {
        // if ctx is suspended (paused), first need to resume
        // might seem paradox, but is correct because not the source is suspended, but the ctx
        await audioCtx.resume();
    }
    if (audioSource) {
        audioSource.stop();
    }
}

function onStop() {
    audioSource.disconnect();
    audioSource = null;

    clearInterval(timer);

    document.getElementById("btn-play-pause").value = "Play";
    document.getElementById("time").textContent = "00:00";
    document.getElementById("time-slider").value = 0;
    document.getElementById("time-slider").max = 0;

    if (hasPlayerTimeChanged) {
        // re-start because track was stopped just for changing player time
        // very hacky, did not find any better solution
        hasPlayerTimeChanged = false;
        start();
    } else {
        // if it has stopped usually, reset the player time
        playerTime = 0;
    }
}

async function changePlayerTime(timeString) {
    playerTime = Number.parseInt(timeString);
    hasPlayerTimeChanged = true;
    await stop();
}

function update() {
    if (!audioBuffer) {
        return;
    }
    updateTime();
    analyzer.getByteFrequencyData(fftBuffer);
    updateChart();
}

function updateTime() {
    const time = audioCtx.currentTime - startTime + playerTime;
    document.getElementById("time-slider").value = Math.floor(time);
    document.getElementById("time").textContent = getTimeString(time);
    document.getElementById("duration").textContent = getTimeString(audioBuffer.duration) ;
}

function getTimeString(time) {
    const date = new Date(0);
    date.setSeconds(time);
    return date.toISOString().substr(14, 5);
}

function createChart() {
    const shouldResize = canvasWidth + 50 > window.innerWidth;
    chart = new Chart(canvasCtx, {
        type: 'line',
        options: {
            animation: {
                duration: 0 // disable animation
            },
            legend: {
                display: false // disable legend (database label)
            },
            responsive: shouldResize,
            scales: {
                xAxes: [{
                    type: "linear",
                    position: "bottom",
                    scaleLabel: {
                        display: true,
                        labelString: "Frequency Bin"
                    },
                    ticks: {
                        min: 0,
                        max: fftBuffer.length
                    }
                }],
                yAxes: [{
                    type: "linear",
                    position: "left",
                    scaleLabel: {
                        display: true,
                        labelString: "Power"
                    },
                    ticks: {
                        min: 0,
                        max: 255
                    }
                }]
            }
        }
    });
}

function updateChart() {
    // have at most one point per pixel
    // e.g. if 2048 values but 512 pixels, then 4 values per point, i.e. skipping 3 values each
    const maxNumPoints = canvasWidth;
    const numValuesPerPoint = Math.max(1, Math.round(fftBuffer.length / maxNumPoints));

    const data = [];
    for (let i = 0; i < fftBuffer.length; i += numValuesPerPoint) {
        const point = {
            x: i,
            y: fftBuffer[i]
        };
        data.push(point);
    }

    chart.data.datasets = [{
        data: data,
        lineTension: 0, // disable interpolation
        pointRadius: 0, // disable circles for points
        borderWidth: 1,
        backgroundColor: "rgba(255,0,0,0.5)",
        borderColor: "rgba(255,0,0,1.0)"
    }];

    chart.update();
}
