class FrequencyDomainChart {
    constructor(canvas) {
        this.canvas = canvas;

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
                        type: "logarithmic",
                        position: "bottom",
                        scaleLabel: {
                            display: true,
                            labelString: "Frequency (Hz)"
                        },
                        ticks: {
                            min: 50,
                            max: nyquistFrequency,
                            callback: function (value, index, values) {
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

    // TODO: pre-process data on caller side
    update(rawData) {
        const numValuesPerPoint = this.getNumValuesPerPoint(rawData.length);
        const data = [];
        for (let bin = 0; bin < rawData.length; bin += numValuesPerPoint) {
            const frequency = this.binToFrequency(bin);
            const decibels = (rawData[bin] - 255) / 255.0 * DECIBELS_RANGE;
            const point = {
                x: frequency,
                y: decibels
            };
            data.push(point);
        }

        this.chart.data.datasets = [{
            data: data,
            lineTension: 0, // disable interpolation
            pointRadius: 0, // disable circles for points
            borderWidth: 1,
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "rgba(255,0,0,1.0)"
        }];

        this.chart.update();
    }

    getNumValuesPerPoint(numValues) {
        const numPixelsPerPoint = 1;
        const maxNumPoints = Math.round(this.canvas.width / numPixelsPerPoint);
        return Math.max(1, Math.round(numValues / maxNumPoints));
    }

    // TODO: duplicated code, function exists in app.js
    binToFrequency(bin) {
        return (bin / frequencyDomainData.length) * nyquistFrequency
    }
}
