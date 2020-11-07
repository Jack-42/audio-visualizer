class AudioPlayer {
    constructor(ctx, buffer, destinationNode) {
        this.ctx = ctx;
        this.buffer = buffer;
        this.source = null;
        this.destinationNode = destinationNode;
    }

    setCallbacks(onStart, onPause, onResume, onStop) {
        this.onStart = onStart;
        this.onPause = onPause;
        this.onResume = onResume;
        this.onStop = onStop;
    }

    getCurrentTime() {
        return this.ctx.currentTime - this.startTime + this.seekTime;
    }

    async togglePlayState() {
        if (!this.source) {
            // player has not been started yet or has just been stopped
            // needs to be re-started
            this.start();
        } else {
            // player is not stopped, so it is either playing or paused
            if (this.ctx.state === "running") {
                // playing => pause
                await this.pause();
            } else if (this.ctx.state === "suspended") {
                // paused => resume
                await this.resume();
            }
        }
    }

    async stop() {
        if (!this.source) {
            // player has not been start yet or is already stopped
            return;
        }
        if (this.ctx.state === "suspended") {
            // if ctx is suspended (paused), first need to resume
            // might seem paradox, but is correct because not the source is suspended, but the ctx
            await this.ctx.resume();
        }
        this.source.stop();
    }

    async changeSeekTime(timeInSeconds) {
        this.seekTime = timeInSeconds;
        // need to stop and re-start in order to change seek time
        // seems hacky, but did not find a better way
        this.restartingToChangeSeekTime = true;
        await this.stop();
    }

    start() {
        // to re-start a player, need to re-create the source
        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.connect(this.destinationNode);
        this.source.onended = () => {
            // this is called if playback has finished naturally or forcefully by stop() call on the source
            this.handleStop();
        };
        this.startTime = this.ctx.currentTime;
        this.source.start(0, this.seekTime);
        if (this.onStart) {
            this.onStart();
        }
    }

    async pause() {
        await this.ctx.suspend();
        if (this.onPause) {
            this.onPause();
        }
    }

    async resume() {
        await this.ctx.resume();
        if (this.onResume) {
            this.onResume();
        }
    }

    handleStop() {
        this.source.disconnect();
        this.source = null;

        if (this.restartingToChangeSeekTime) {
            // re-start because track has been stopped just for changing seek time
            // very hacky, did not find any better solution
            this.restartingToChangeSeekTime = false;
            start();
        } else {
            // track has been stopped usually
            this.seekTime = 0;
            this.onStop();
        }
    }
}
