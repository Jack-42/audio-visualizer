const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const WINDOW_SIZE = 512;
const DECIBELS_RANGE = 90;

const NUM_PIXELS_PER_POINT = 1;

let audioCtx;
let analyzer;

let fftBuffer;
let nyquistFrequency;
let updateIntervalInMs;
let timer;

let audioBuffer;
let audioSource;

let ready = false;
let startTime;
let playerTime = 0;
let hasPlayerTimeChanged = false;

let frequencyDomainCanvas;

let chart;

function init() {
    audioCtx = new AudioContext();

    analyzer = audioCtx.createAnalyser();
    analyzer.minDecibels = -DECIBELS_RANGE;
    analyzer.maxDecibels = 0;
    analyzer.fftSize = WINDOW_SIZE;
    analyzer.connect(audioCtx.destination);

    fftBuffer = new Uint8Array(analyzer.frequencyBinCount);
    nyquistFrequency = audioCtx.sampleRate / 2;
    updateIntervalInMs = (WINDOW_SIZE / audioCtx.sampleRate) * 1000;

    frequencyDomainCanvas = document.getElementById("frequency-domain-canvas");
    createFrequencyDomainChart();
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
    updateFrequencyDomainChart();
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

function createFrequencyDomainChart() {
    const shouldResize = frequencyDomainCanvas.width + 50 > window.innerWidth;
    const ctx = frequencyDomainCanvas.getContext("2d");
    chart = new Chart(ctx, {
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
                    type: "logarithmic",
                    position: "bottom",
                    scaleLabel: {
                        display: true,
                        labelString: "Frequency (Hz)"
                    },
                    ticks: {
                        min: 50,
                        max: nyquistFrequency,
                        callback: function(value, index, values) {
                            // transform value to string
                            // necessary, because defaults to scientific notation in logarithmic scale
                            return value.toString();
                        }
                    }
                }],
                yAxes: [{
                    type: "linear",
                    position: "left",
                    scaleLabel: {
                        display: true,
                        labelString: "Power (dB)"
                    },
                    ticks: {
                        min: -DECIBELS_RANGE,
                        max: 0
                    }
                }]
            }
        }
    });
}

function updateFrequencyDomainChart() {
    const maxNumPoints = Math.round(frequencyDomainCanvas.width / NUM_PIXELS_PER_POINT);
    const numValuesPerPoint = Math.max(1, Math.round(fftBuffer.length / maxNumPoints));

    const data = [];
    for (let bin = 0; bin < fftBuffer.length; bin += numValuesPerPoint) {
        const frequency = (bin / fftBuffer.length) * nyquistFrequency;
        const decibels = (fftBuffer[bin] - 255) / 255.0 * DECIBELS_RANGE;
        const point = {
            x: frequency,
            y: decibels
        };
        data.push(point);
    }

    chart.data.datasets = [{
        data: data,
        lineTension: 0, // disable interpolation
        pointRadius: 0, // disable circles for points
        borderWidth: 1,
        backgroundColor: "rgba(0,0,0,0)",
        borderColor: "rgba(255,0,0,1.0)"
    }];

    chart.update();
}
