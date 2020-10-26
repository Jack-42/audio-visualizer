class TimeDomainChart {
    constructor(canvas, windowSizeInSeconds) {
        this.canvas = canvas;
        this.windowSizeInSeconds = windowSizeInSeconds;
        this.currTime = 0;

        const shouldResize = this.canvas.width + 50 > window.innerWidth;
        const ctx = this.canvas.getContext("2d");

        this.chart = new Chart(ctx, {
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
                            labelString: "Time (s)"
                        },
                        ticks: {
                            min: 0,
                            max: this.windowSizeInSeconds,
                            callback: function(value, index, values) {
                                // transform value to string
                                // only show min and max value because otherwise too much flickering, looks confusing
                                if (index === 0) {
                                    return this.currTime.toFixed(3);
                                } else if (index === values.length - 1) {
                                    const endTime = this.currTime + this.windowSizeInSeconds;
                                    return endTime.toFixed(3);
                                } else {
                                    return "";
                                }
                            }
                        }
                    }],
                    yAxes: [{
                        type: "linear",
                        position: "left",
                        scaleLabel: {
                            display: true,
                            labelString: "Amplitude"
                        },
                        ticks: {
                            min: -1.0,
                            max: 1.0
                        }
                    }]
                }
            }
        });
    }

    // TODO: pre-process data on caller side
    update(rawData, currTime) {
        this.currTime = currTime;

        const numValuesPerPoint = this.getNumValuesPerPoint(rawData.length);
        const data = [];
        for (let i = 0; i < rawData.length; i += numValuesPerPoint) {
            const time = (i / audioCtx.sampleRate) + this.currTime; // offset by start time of the current window
            const amplitude = (rawData[i] - 128) / 255.0;
            const point = {
                x: time,
                y: amplitude
            };
            data.push(point);
        }

        this.chart.data.datasets = [{
            data: data,
            lineTension: 0, // disable interpolation
            pointRadius: 0, // disable circles for points
            borderWidth: 1,
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "rgba(63,63,63,1.0)"
        }];

        // update range of time for current window
        this.chart.options.scales.xAxes[0].ticks.min = currTime;
        this.chart.options.scales.xAxes[0].ticks.max = currTime + windowSizeInSeconds;

        this.chart.update();
    }

    getNumValuesPerPoint(numValues) {
        const numPixelsPerPoint = 1;
        const maxNumPoints = Math.round(this.canvas.width / numPixelsPerPoint);
        return Math.max(1, Math.round(numValues / maxNumPoints));
    }
}
