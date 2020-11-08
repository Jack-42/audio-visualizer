class PeakFrequencyChart {
    constructor(canvas, minFrequency, maxFrequency) {
        const ctx = canvas.getContext("2d");

        this.chart = new Chart(ctx, {
            type: "bar",
            options: {
                animation: {
                    duration: 0 // disable animation
                },
                legend: {
                    display: false
                },
                responsive: false,
                scales: {
                    yAxes: [{
                        type: "logarithmic",
                        position: "left",
                        scaleLabel: {
                            display: true,
                            labelString: "Peak Frequency (Hz)"
                        },
                        ticks: {
                            min: minFrequency,
                            max: maxFrequency,
                            autoSkip: true,
                            autoSkipPadding: 10, // prevent overlapping labels
                            callback: function (value, index, values) {
                                // transform value to string
                                // necessary, because defaults to scientific notation in logarithmic scale
                                return value.toString();
                            }
                        }
                    }]
                }
            }
        });
    }

    destroy() {
        this.chart.destroy();
    }

    update(peakFrequency) {
        this.chart.data.datasets = [{
            data: [peakFrequency],
            borderWidth: 1,
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "rgba(255,0,0,1.0)"
        }];

        this.chart.update();
    }
}
