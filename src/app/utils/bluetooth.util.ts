export class BluetoothUtil {
  private static audioContext: AudioContext | null = null;
  private static gainNode: GainNode | null = null;
  private static isConnected = false;

  private static init(): void {
    if (BluetoothUtil.audioContext) return;

    BluetoothUtil.audioContext = new window.AudioContext();
    BluetoothUtil.gainNode = BluetoothUtil.audioContext.createGain();

    const oscillator = BluetoothUtil.audioContext.createOscillator();
    oscillator.frequency.value = 1;
    oscillator.type = "sine";

    BluetoothUtil.gainNode.gain.value = 0.001;

    oscillator.connect(BluetoothUtil.gainNode);
    oscillator.start();
  }

  static setBluetoothKeptAlive(isBluetoothKeptAlive: boolean): void {
    if (isBluetoothKeptAlive) {
      BluetoothUtil.init();
      if (!BluetoothUtil.isConnected) {
        BluetoothUtil.gainNode!.connect(BluetoothUtil.audioContext!.destination);
      }
      BluetoothUtil.isConnected = true;
      return;
    }

    if (!BluetoothUtil.isConnected) return;

    BluetoothUtil.isConnected = false;
    BluetoothUtil.gainNode!.disconnect(BluetoothUtil.audioContext!.destination);
  }
}
