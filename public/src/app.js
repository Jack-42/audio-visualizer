const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const DECIBELS_RANGE = 90;

const NUM_PIXELS_PER_POINT = 1;

let audioCtx;
let analyzer;

let timeDomainData;
let frequencyDomainData;
let nyquistFrequency;
let windowSizeInSeconds;
let windowSizeInMs;
let timer;

let audioBuffer;
let audioSource;

let ready = false;
let startTime;
let currTime = 0;
let playerTime = 0;
let hasPlayerTimeChanged = false;

let timeDomainCanvas;
let frequencyDomainCanvas;

let timeDomainChart;
let frequencyDomainChart;

let minFrequency;
let maxFrequency;

async function init() {
    if (audioSource) {
        await stop();
    }

    const sampleRateField = document.getElementById("sample-rate");
    if (!sampleRateField.checkValidity()) {
        alert("Invalid sample rate, must lie in range 8000 to 96000!");
        return;
    }
    const sampleRate = Number.parseInt(sampleRateField.value);

    const windowSizeField = document.getElementById("window-size");
    if (!windowSizeField.checkValidity()) {
        alert("Invalid window size, must lie in range 32 to 32768!");
        return;
    }
    const windowSize = Number.parseInt(windowSizeField.value);

    audioCtx = new AudioContext({
        sampleRate: sampleRate
    });

    analyzer = audioCtx.createAnalyser();
    analyzer.minDecibels = -DECIBELS_RANGE;
    analyzer.maxDecibels = 0;
    try {
        analyzer.fftSize = windowSize;
    } catch (e) {
        alert("Invalid window size, must be a power of two!");
        return;
    }
    analyzer.connect(audioCtx.destination);

    timeDomainData = new Uint8Array(windowSize);
    frequencyDomainData = new Uint8Array(analyzer.frequencyBinCount);
    nyquistFrequency = audioCtx.sampleRate / 2;
    windowSizeInSeconds = windowSize / audioCtx.sampleRate;
    windowSizeInMs = windowSizeInSeconds * 1000;

    timeDomainCanvas = document.getElementById("time-domain-canvas");
    frequencyDomainCanvas = document.getElementById("frequency-domain-canvas");

    initFrequencyRange();

    if (timeDomainChart) {
        timeDomainChart.destroy();
    }
    timeDomainChart = new TimeDomainChart(timeDomainCanvas, windowSizeInSeconds);

    if (frequencyDomainChart) {
        frequencyDomainChart.destroy();
    }
    frequencyDomainChart = new FrequencyDomainChart(frequencyDomainCanvas, DECIBELS_RANGE, minFrequency, maxFrequency);
}

function initFrequencyRange() {
    minFrequency = 20;
    maxFrequency = Math.floor(nyquistFrequency);

    const minFrequencyField = document.getElementById("min-frequency");
    minFrequencyField.min = minFrequency;
    minFrequencyField.max = maxFrequency;
    minFrequencyField.value = minFrequency;

    const maxFrequencyField = document.getElementById("max-frequency");
    maxFrequencyField.min = minFrequency;
    maxFrequencyField.max = maxFrequency;
    maxFrequencyField.value = maxFrequency;
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
    }, windowSizeInMs);

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

function changeFrequencyRange() {
    const minFrequencyField = document.getElementById("min-frequency");
    if (!minFrequencyField.checkValidity()) {
        alert("Invalid min frequency!");
        return;
    }

    const maxFrequencyField = document.getElementById("max-frequency");
    if (!maxFrequencyField.checkValidity()) {
        alert("Invalid max frequency!");
        return;
    }

    minFrequency = Number.parseInt(minFrequencyField.value);
    maxFrequency = Number.parseInt(maxFrequencyField.value);

    frequencyDomainChart.setFrequencyRange(minFrequency, maxFrequency);
}

function update() {
    if (!audioBuffer) {
        return;
    }
    updateTime();
    analyzer.getByteTimeDomainData(timeDomainData);
    analyzer.getByteFrequencyData(frequencyDomainData);
    updatePeakFrequency();
    updateTimeDomainChart();
    updateFrequencyDomainChart();
}

function updateTime() {
    currTime = audioCtx.currentTime - startTime + playerTime;
    document.getElementById("time-slider").value = Math.floor(currTime);
    document.getElementById("time").textContent = getTimeString(currTime);
    document.getElementById("duration").textContent = getTimeString(audioBuffer.duration) ;
}

function getTimeString(time) {
    const date = new Date(0);
    date.setSeconds(time);
    return date.toISOString().substr(14, 5);
}

function updatePeakFrequency() {
    document.getElementById("peak-frequency").textContent = getPeakFrequency();
}

function getPeakFrequency() {
    const minBin = Math.max(0, frequencyToBin(minFrequency));
    const maxBin = Math.min(frequencyToBin(maxFrequency), frequencyDomainData.length);

    let peakPower = 0;
    let peakBin = 0;
    for (let bin = minBin; bin < maxBin; bin++) {
        if (frequencyDomainData[bin] > peakPower) {
            peakPower = frequencyDomainData[bin];
            peakBin = bin;
        }
    }
    return binToFrequency(peakBin);
}

function updateTimeDomainChart() {
    const numValuesPerPoint = getNumValuesPerPoint(timeDomainCanvas.width, timeDomainData.length);
    const data = [];

    for (let i = 0; i < timeDomainData.length; i += numValuesPerPoint) {
        const time = (i / audioCtx.sampleRate) + currTime; // offset by start time of the current window
        const amplitude = (timeDomainData[i] - 128) / 255.0;
        const point = {
            x: time,
            y: amplitude
        };
        data.push(point);
    }

    const minTime = currTime;
    const maxTime = currTime + windowSizeInSeconds;
    timeDomainChart.update(data, minTime, maxTime);
}

function updateFrequencyDomainChart() {
    const numValuesPerPoint = this.getNumValuesPerPoint(frequencyDomainCanvas.width, frequencyDomainData.length);
    const data = [];

    for (let bin = 0; bin < frequencyDomainData.length; bin += numValuesPerPoint) {
        const frequency = this.binToFrequency(bin);
        const decibels = (frequencyDomainData[bin] - 255) / 255.0 * DECIBELS_RANGE;
        const point = {
            x: frequency,
            y: decibels
        };
        data.push(point);
    }

    frequencyDomainChart.update(data);
}

function getNumValuesPerPoint(canvasWidth, numValues) {
    const maxNumPoints = Math.round(canvasWidth / NUM_PIXELS_PER_POINT);
    return Math.max(1, Math.round(numValues / maxNumPoints));
}

function binToFrequency(bin) {
    return (bin / frequencyDomainData.length) * nyquistFrequency;
}

function frequencyToBin(frequency) {
    return Math.round((frequency / nyquistFrequency) * frequencyDomainData.length);
}
