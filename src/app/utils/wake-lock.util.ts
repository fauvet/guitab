export class WakeLockUtil {
  private static wakeLock: WakeLockSentinel | null = null;

  static async setWakeLock(isWakeLock: boolean): Promise<void> {
    if (isWakeLock) {
      if (!("wakeLock" in navigator) || this.wakeLock) return;

      try {
        WakeLockUtil.wakeLock = await navigator.wakeLock.request("screen");
        WakeLockUtil.wakeLock.addEventListener("release", () => {
          WakeLockUtil.wakeLock = null;
        });
      } catch (error: unknown) {
        console.error("Error while enabling Wake Lock:", error);
      }
      return;
    }

    await WakeLockUtil.wakeLock?.release();
    WakeLockUtil.wakeLock = null;
  }
}
