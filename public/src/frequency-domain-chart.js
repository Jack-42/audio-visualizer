class FrequencyDomainChart {
    constructor(canvas, decibelsRange, minFrequency, maxFrequency) {
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
                            min: minFrequency,
                            max: maxFrequency,
                            maxRotation: 0,  // do not rotate if space gets too small
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
                            min: -decibelsRange,
                            max: 0,
                            maxRotation: 0  // do not rotate if space gets too small
                        }
                    }]
                }
            }
        });
    }

    destroy() {
        this.chart.destroy();
    }

    update(data) {
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

    setFrequencyRange(minFrequency, maxFrequency) {
        this.chart.options.scales.xAxes[0].ticks.min = minFrequency;
        this.chart.options.scales.xAxes[0].ticks.max = maxFrequency;
        this.chart.update();
    }
}
