"use strict";
// Simple progress indicator for CLI operations
// No external dependencies - pure console output
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = exports.Progress = void 0;
exports.startProgress = startProgress;
exports.startSpinner = startSpinner;
class Progress {
    constructor(label, total) {
        this.current = 0;
        this.total = 0;
        this.label = "";
        this.startTime = 0;
        this.lastUpdate = 0;
        this.minUpdateInterval = 100; // ms
        this.label = label;
        this.total = total;
        this.startTime = Date.now();
        this.lastUpdate = this.startTime;
    }
    update(current, detail) {
        this.current = current;
        // Throttle updates
        const now = Date.now();
        if (now - this.lastUpdate < this.minUpdateInterval && current < this.total) {
            return;
        }
        this.lastUpdate = now;
        const percentage = Math.round((current / this.total) * 100);
        const elapsed = Math.round((now - this.startTime) / 1000);
        // Clear line and write progress
        process.stdout.write("\r\x1b[K"); // Clear current line
        let output = `${this.label}: ${current}/${this.total} (${percentage}%)`;
        if (detail) {
            output += ` - ${detail}`;
        }
        output += ` [${elapsed}s]`;
        process.stdout.write(output);
        // Add newline when complete
        if (current >= this.total) {
            process.stdout.write("\n");
        }
    }
    increment(detail) {
        this.update(this.current + 1, detail);
    }
    finish(message) {
        this.current = this.total;
        const elapsed = Math.round((Date.now() - this.startTime) / 1000);
        process.stdout.write("\r\x1b[K"); // Clear current line
        const finalMessage = message || `${this.label} complete`;
        console.log(`\u2713 ${finalMessage} (${elapsed}s)`);
    }
    fail(error) {
        process.stdout.write("\r\x1b[K"); // Clear current line
        console.log(`\u2717 ${this.label} failed: ${error}`);
    }
}
exports.Progress = Progress;
function startProgress(label, total) {
    return new Progress(label, total);
}
// Simple spinner for unknown duration tasks
class Spinner {
    constructor(label) {
        this.frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        this.currentFrame = 0;
        this.interval = null;
        this.label = "";
        this.label = label;
    }
    start() {
        this.currentFrame = 0;
        this.interval = setInterval(() => {
            const frame = this.frames[this.currentFrame];
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            process.stdout.write(`\r\x1b[K${frame} ${this.label}`);
        }, 80);
    }
    stop(message) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write("\r\x1b[K");
        if (message) {
            console.log(`\u2713 ${message}`);
        }
    }
    fail(error) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write("\r\x1b[K");
        console.log(`\u2717 ${error}`);
    }
}
exports.Spinner = Spinner;
function startSpinner(label) {
    const spinner = new Spinner(label);
    spinner.start();
    return spinner;
}
//# sourceMappingURL=progress.js.map