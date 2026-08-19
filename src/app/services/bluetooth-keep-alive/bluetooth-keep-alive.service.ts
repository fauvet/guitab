import { Injectable } from "@angular/core";

/**
 * Keeps a Bluetooth speaker from going to sleep between songs by playing a tone
 * too quiet and too low to hear. Many speakers drop the connection after a few
 * seconds of silence and take a second or two to come back — long enough to
 * swallow the start of the next song.
 *
 * This is a service and not a util because it is the second Web Audio boundary
 * in the app: an AudioContext is a live, stateful handle on an output device, so
 * it cannot live behind static methods without the "pure in, pure out" contract
 * of `src/app/utils/` becoming a fiction. See CLAUDE.md hard rules 3 and 5;
 * ESLint enforces the boundary.
 */
@Injectable({
  providedIn: "root",
})
export class BluetoothKeepAliveService {
  private static readonly FREQUENCY_HZ = 1;
  private static readonly GAIN = 0.001;

  private audioContext: null | AudioContext = null;
  private gainNode: null | GainNode = null;
  private isConnected = false;

  setKeptAlive(isKeptAlive: boolean): void {
    if (isKeptAlive) {
      this.connect();
      return;
    }

    this.disconnect();
  }

  private connect(): void {
    this.initialize();
    if (this.isConnected || !this.audioContext || !this.gainNode) return;

    this.gainNode.connect(this.audioContext.destination);
    this.isConnected = true;
  }

  private disconnect(): void {
    if (!this.isConnected || !this.audioContext || !this.gainNode) return;

    this.gainNode.disconnect(this.audioContext.destination);
    this.isConnected = false;
  }

  /**
   * Built on first use, then kept: an AudioContext is a scarce resource a
   * browser will refuse to hand out indefinitely, and the oscillator can only be
   * started once. Switching the setting off disconnects the graph instead of
   * tearing it down.
   */
  private initialize(): void {
    if (this.audioContext) return;
    // A browser without Web Audio simply cannot do this; there is nothing to
    // tell the user, because the setting is an optimisation for their speaker
    // and everything else keeps working.
    if (typeof AudioContext === "undefined") return;

    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = BluetoothKeepAliveService.GAIN;

    const oscillator = this.audioContext.createOscillator();
    oscillator.frequency.value = BluetoothKeepAliveService.FREQUENCY_HZ;
    oscillator.type = "sine";
    oscillator.connect(this.gainNode);
    oscillator.start();
  }
}
