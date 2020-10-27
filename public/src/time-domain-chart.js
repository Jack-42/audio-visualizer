class TimeDomainChart {
    constructor(canvas, windowSizeInSeconds) {
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
                        type: "linear",
                        position: "bottom",
                        scaleLabel: {
                            display: true,
                            labelString: "Time (s)"
                        },
                        ticks: {
                            min: 0,
                            max: windowSizeInSeconds,
                            callback: function(value, index, values) {
                                // transform value to string
                                // only show min and max value because otherwise too much flickering, looks confusing
                                if (index === 0 || index === values.length - 1) {
                                    return value.toFixed(3);
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

    update(data, minTime, maxTime) {
        this.chart.data.datasets = [{
            data: data,
            lineTension: 0, // disable interpolation
            pointRadius: 0, // disable circles for points
            borderWidth: 1,
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "rgba(63,63,63,1.0)"
        }];

        // update range of x axis for current window
        this.chart.options.scales.xAxes[0].ticks.min = minTime;
        this.chart.options.scales.xAxes[0].ticks.max = maxTime;

        this.chart.update();
    }
}
