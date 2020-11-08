const AudioContext = window.AudioContext || window.webkitAudioContext; // for legacy browsers

const DECIBELS_RANGE = 90;

const NUM_PIXELS_PER_POINT = 1;

let audioCtx;
let analyzer;
let audioBuffer;
let audioPlayer;

let timeDomainData;
let frequencyDomainData;

let nyquistFrequency;
let windowSizeInSeconds;
let windowSizeInMs;
let frequencyResolution;

let timer;

let timeDomainCanvas;
let frequencyDomainCanvas;
let peakLevelCanvas;

let timeDomainChart;
let frequencyDomainChart;
let peakLevelChart;

let minFrequency;
let maxFrequency;

async function init() {
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

    // need to re-create player because of new ctx and analyzer
    // first stop old one
    if (audioPlayer) {
        await audioPlayer.stop();
    }
    audioPlayer = new AudioPlayer(audioCtx, audioBuffer, analyzer);
    audioPlayer.setCallbacks(onStart, onPause, onResume, onStop);

    timeDomainData = new Uint8Array(windowSize);
    frequencyDomainData = new Uint8Array(analyzer.frequencyBinCount);

    nyquistFrequency = audioCtx.sampleRate / 2;
    windowSizeInSeconds = windowSize / audioCtx.sampleRate;
    windowSizeInMs = windowSizeInSeconds * 1000;
    frequencyResolution = nyquistFrequency / analyzer.frequencyBinCount;

    const windowSizeLabel = document.getElementById("window-size-label");
    windowSizeLabel.textContent = windowSizeInMs.toFixed(0);

    const frequencyResolutionLabel = document.getElementById("frequency-resolution-label");
    frequencyResolutionLabel.textContent = frequencyResolution.toFixed(0);

    timeDomainCanvas = document.getElementById("time-domain-canvas");
    frequencyDomainCanvas = document.getElementById("frequency-domain-canvas");
    peakLevelCanvas = document.getElementById("peak-level-canvas");

    initFrequencyRange();

    if (timeDomainChart) {
        timeDomainChart.destroy();
    }
    timeDomainChart = new TimeDomainChart(timeDomainCanvas, windowSizeInSeconds);

    if (frequencyDomainChart) {
        frequencyDomainChart.destroy();
    }
    frequencyDomainChart = new FrequencyDomainChart(frequencyDomainCanvas, DECIBELS_RANGE, minFrequency, maxFrequency);

    if (peakLevelChart) {
        peakLevelChart.destroy();
    }
    peakLevelChart = new PeakLevelChart(peakLevelCanvas, DECIBELS_RANGE);
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
    statusLabel.textContent = "Loading...";
    const reader = new FileReader();
    reader.onload = async () => {
        if (audioPlayer) {
            await audioPlayer.stop();
        }
        const data = reader.result;
        audioBuffer = await audioCtx.decodeAudioData(data);
        audioPlayer = new AudioPlayer(audioCtx, audioBuffer, analyzer);
        audioPlayer.setCallbacks(onStart, onPause, onResume, onStop);
        statusLabel.textContent = "Ready";
    };
    reader.readAsArrayBuffer(file);
}

async function playOrPause() {
    if (!audioPlayer) {
        return;
    }
    await audioPlayer.playOrPause();
}

async function stop() {
    if (!audioPlayer) {
        return;
    }
    await audioPlayer.stop();
}

async function changeSeekTime(timeString) {
    if (!audioPlayer) {
        return;
    }
    const seekTime = Number.parseInt(timeString);
    await audioPlayer.changeSeekTime(seekTime);
}

function onStart() {
    timer = setInterval(() => {
        update();
    }, windowSizeInMs);

    document.getElementById("btn-play-pause").value = "Pause";
    document.getElementById("time-slider").max = Math.floor(audioBuffer.duration);
    document.getElementById("time").textContent = "00:00";
    document.getElementById("duration").textContent = getTimeString(audioBuffer.duration);
}

function onPause() {
    document.getElementById("btn-play-pause").value = "Play";
}

function onResume() {
    document.getElementById("btn-play-pause").value = "Pause";
}

function onStop() {
    clearInterval(timer);

    document.getElementById("btn-play-pause").value = "Play";
    document.getElementById("time").textContent = "00:00";
    document.getElementById("time-slider").value = 0;
    document.getElementById("time-slider").max = 0;
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
    updatePeakLevel();
    updatePeakFrequency();
    updateTimeDomainChart();
    updateFrequencyDomainChart();
}

function updateTime() {
    const currTime = audioPlayer.getCurrentTime();
    document.getElementById("time-slider").value = Math.floor(currTime);
    document.getElementById("time").textContent = getTimeString(currTime);
    document.getElementById("duration").textContent = getTimeString(audioBuffer.duration) ;
}

function getTimeString(time) {
    const date = new Date(0);
    date.setSeconds(time);
    return date.toISOString().substr(14, 5);
}

function updatePeakLevel() {
    const peakLevel = getPeakLevel();
    document.getElementById("peak-level").textContent = peakLevel.toFixed(2);
    peakLevelChart.update(peakLevel);
}

function getPeakLevel() {
    let peakAmplitude = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
        const amplitude = Math.abs((timeDomainData[i] - 128) / 127);
        if (amplitude > peakAmplitude) {
            peakAmplitude = amplitude;
        }
    }
    return linearToDecibels(peakAmplitude);
}

function linearToDecibels(linear) {
    return 20 * Math.log10(linear);
}

function updatePeakFrequency() {
    document.getElementById("peak-frequency").textContent = getPeakFrequency().toFixed(0);
}

function getPeakFrequency() {
    const minBin = Math.max(0, Math.floor(minFrequency / frequencyResolution));
    const maxBin = Math.min(Math.floor(maxFrequency / frequencyResolution), frequencyDomainData.length);

    let peakPower = 0;
    let peakBin = 0;
    for (let bin = minBin; bin < maxBin; bin++) {
        if (frequencyDomainData[bin] > peakPower) {
            peakPower = frequencyDomainData[bin];
            peakBin = bin;
        }
    }
    return peakBin * frequencyResolution;
}

function updateTimeDomainChart() {
    const currTime = audioPlayer.getCurrentTime();
    const numValuesPerPoint = getNumValuesPerPoint(timeDomainCanvas.width, timeDomainData.length);

    const data = [];
    for (let i = 0; i < timeDomainData.length; i += numValuesPerPoint) {
        const time = (i / audioCtx.sampleRate) + currTime; // offset by start time of the current window
        const amplitude = (timeDomainData[i] - 128) / 127;
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
    const numValuesPerPoint = getNumValuesPerPoint(frequencyDomainCanvas.width, frequencyDomainData.length);

    const data = [];
    for (let bin = 0; bin < frequencyDomainData.length; bin += numValuesPerPoint) {
        const frequency = bin * frequencyResolution;
        const decibels = (frequencyDomainData[bin] - 255) / 255 * DECIBELS_RANGE;
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
