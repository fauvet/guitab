export class BluetoothUtil {
  private static readonly AUDIO_CONTEXT = new window.AudioContext();
  private static readonly GAIN_NODE = BluetoothUtil.AUDIO_CONTEXT.createGain();
  private static isConnected = false;

  static {
    const oscillator = BluetoothUtil.AUDIO_CONTEXT.createOscillator();
    oscillator.frequency.value = 1;
    oscillator.type = "sine";

    BluetoothUtil.GAIN_NODE.gain.value = 0.001;

    oscillator.connect(BluetoothUtil.GAIN_NODE);
    oscillator.start();
  }

  static setBluetoothKeptAlive(isBluetoothKeptAlive: boolean): void {
    if (isBluetoothKeptAlive) {
      if (!BluetoothUtil.isConnected) {
        BluetoothUtil.GAIN_NODE.connect(BluetoothUtil.AUDIO_CONTEXT.destination);
      }
      BluetoothUtil.isConnected = true;
      return;
    }

    if (!BluetoothUtil.isConnected) return;

    BluetoothUtil.isConnected = false;
    BluetoothUtil.GAIN_NODE.disconnect(BluetoothUtil.AUDIO_CONTEXT.destination);
  }
}
