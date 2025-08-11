// Type definitions for spectorjs
declare module 'spectorjs' {
  export class Spector {
    constructor();
    startCapture(): void;
    stopCapture(): void;
    displayUI(): void;
    clearCapture(): void;
    getCaptureData(): any;
    setCaptureOptions(options: any): void;
  }
  export default Spector;
}
