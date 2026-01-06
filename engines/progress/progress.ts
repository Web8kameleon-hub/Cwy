// Simple progress indicator for CLI operations
// No external dependencies - pure console output

export class Progress {
  private current = 0;
  private total = 0;
  private label = "";
  private startTime = 0;
  private lastUpdate = 0;
  private minUpdateInterval = 100; // ms

  constructor(label: string, total: number) {
    this.label = label;
    this.total = total;
    this.startTime = Date.now();
    this.lastUpdate = this.startTime;
  }

  update(current: number, detail?: string): void {
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

  increment(detail?: string): void {
    this.update(this.current + 1, detail);
  }

  finish(message?: string): void {
    this.current = this.total;
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    
    process.stdout.write("\r\x1b[K"); // Clear current line
    
    const finalMessage = message || `${this.label} complete`;
    console.log(`\u2713 ${finalMessage} (${elapsed}s)`);
  }

  fail(error: string): void {
    process.stdout.write("\r\x1b[K"); // Clear current line
    console.log(`\u2717 ${this.label} failed: ${error}`);
  }
}

export function startProgress(label: string, total: number): Progress {
  return new Progress(label, total);
}

// Simple spinner for unknown duration tasks
export class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private currentFrame = 0;
  private interval: NodeJS.Timeout | null = null;
  private label = "";

  constructor(label: string) {
    this.label = label;
  }

  start(): void {
    this.currentFrame = 0;
    this.interval = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      
      process.stdout.write(`\r\x1b[K${frame} ${this.label}`);
    }, 80);
  }

  stop(message?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    process.stdout.write("\r\x1b[K");
    if (message) {
      console.log(`\u2713 ${message}`);
    }
  }

  fail(error: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    process.stdout.write("\r\x1b[K");
    console.log(`\u2717 ${error}`);
  }
}

export function startSpinner(label: string): Spinner {
  const spinner = new Spinner(label);
  spinner.start();
  return spinner;
}
