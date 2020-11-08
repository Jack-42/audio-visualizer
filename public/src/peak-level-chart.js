class PeakLevelChart {
    constructor(canvas, decibelsRange) {
        this.canvas = canvas;
        const ctx = this.canvas.getContext("2d");

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
                        type: "linear",
                        position: "left",
                        scaleLabel: {
                            display: true,
                            labelString: "Peak Level (dB)"
                        },
                        ticks: {
                            min: -decibelsRange,
                            max: 0,
                            maxRotation: 0,  // prevent automatic rotation
                            autoSkip: true,
                            autoSkipPadding: 10 // prevent overlapping labels
                        }
                    }]
                }
            }
        });
    }

    destroy() {
        this.chart.destroy();
    }

    update(peakLevel) {
        this.chart.data.datasets = [{
            data: [peakLevel],
            borderWidth: 1,
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: "rgba(63,63,63,1.0)"
        }];

        this.chart.update();
    }
}
