import { TestBed } from "@angular/core/testing";
import { WakeLockService } from "./wake-lock.service";
import { PlatformService } from "../platform/platform.service";

const { keepAwake, allowSleep } = vi.hoisted(() => ({
  keepAwake: vi.fn(),
  allowSleep: vi.fn(),
}));

vi.mock("@capacitor-community/keep-awake", () => ({
  KeepAwake: { keepAwake, allowSleep },
}));

/**
 * jsdom has no Screen Wake Lock API, so `navigator.wakeLock` is defined for the
 * test and removed afterwards. What is worth asserting is the handle
 * bookkeeping: requesting twice wastes a sentinel the browser may not give
 * back, releasing one that was never taken throws, and a lock the system drops
 * on its own has to be forgotten or the setting can never be turned back on.
 *
 * The second half of the file covers what the service reports rather than what
 * it does: `isKeptAwake$` is what the settings sheet shows, so every path that
 * ends without a lock has to leave it `false` — otherwise the setting claims
 * the screen is being held awake while it dims.
 */
describe("WakeLockService", () => {
  let service: WakeLockService;
  let request: ReturnType<typeof vi.fn>;
  let release: ReturnType<typeof vi.fn>;
  let releaseListeners: (() => void)[];
  let mockPlatformService: { isNative: ReturnType<typeof vi.fn> };

  function buildService(): WakeLockService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PlatformService, useValue: mockPlatformService }],
    });
    return TestBed.inject(WakeLockService);
  }

  function defineWakeLock(value: unknown): void {
    Object.defineProperty(navigator, "wakeLock", { value, configurable: true });
  }

  // getLastErrorMessage$() is a BehaviorSubject, so a fresh subscribe always
  // emits synchronously with the current value — no need to keep it open.
  function currentErrorMessage(): string | null {
    let value: string | null = null;
    service.getLastErrorMessage$().subscribe((message) => (value = message));
    return value;
  }

  function becomeVisible(): void {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  function becomeHidden(): void {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    // The browser takes the lock back on its own once the tab is hidden; the
    // sentinel's own event is the only notice the app gets.
    releaseListeners.forEach((listener) => listener());
  }

  beforeEach(() => {
    releaseListeners = [];
    release = vi.fn().mockResolvedValue(undefined);

    const sentinel = {
      release,
      addEventListener: (type: string, listener: () => void) => {
        if (type === "release") releaseListeners.push(listener);
      },
    };

    request = vi.fn().mockResolvedValue(sentinel);
    defineWakeLock({ request });

    // These two are module-level, so afterEach's restoreAllMocks leaves their
    // call history behind — a "called twice" assertion would otherwise count
    // every earlier test in the file.
    keepAwake.mockClear().mockResolvedValue(undefined);
    allowSleep.mockClear().mockResolvedValue(undefined);
    mockPlatformService = { isNative: vi.fn().mockReturnValue(false) };

    service = buildService();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "wakeLock");
    Reflect.deleteProperty(document, "visibilityState");
    vi.restoreAllMocks();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should not request anything until it is switched on", () => {
    expect(request).not.toHaveBeenCalled();
  });

  it("should request a screen lock when switched on", async () => {
    await service.setKeptAwake(true);

    expect(request).toHaveBeenCalledWith("screen");
  });

  it("should not request a second lock while one is held", async () => {
    await service.setKeptAwake(true);
    await service.setKeptAwake(true);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("should release the lock when switched off", async () => {
    await service.setKeptAwake(true);
    await service.setKeptAwake(false);

    expect(release).toHaveBeenCalledTimes(1);
  });

  it("should ignore being switched off when no lock is held", async () => {
    await service.setKeptAwake(false);

    expect(release).not.toHaveBeenCalled();
  });

  it("should take a fresh lock after the system released the previous one", async () => {
    await service.setKeptAwake(true);
    // The browser drops the lock whenever the tab stops being visible — going
    // to another app between two songs is the everyday case.
    releaseListeners.forEach((listener) => listener());

    await service.setKeptAwake(true);

    expect(request).toHaveBeenCalledTimes(2);
  });

  it("should tell the user when the browser has no Wake Lock API", async () => {
    Reflect.deleteProperty(navigator, "wakeLock");

    await service.setKeptAwake(true);

    expect(currentErrorMessage()).toBe("This browser cannot keep the screen awake.");
  });

  it("should tell the user when the request is refused", async () => {
    request.mockRejectedValueOnce(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await service.setKeptAwake(true);

    expect(currentErrorMessage()).toBe("Could not keep the screen awake.");
  });

  it("should clear the error message once a retried request succeeds", async () => {
    request.mockRejectedValueOnce(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await service.setKeptAwake(true);
    expect(currentErrorMessage()).not.toBeNull();

    await service.setKeptAwake(true);

    expect(currentErrorMessage()).toBeNull();
  });

  it("should retry after a refusal rather than believe it holds a lock", async () => {
    request.mockRejectedValueOnce(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await service.setKeptAwake(true);
    await service.setKeptAwake(true);

    expect(request).toHaveBeenCalledTimes(2);
  });

  describe("what it reports as held", () => {
    it("should report nothing held before being switched on", () => {
      expect(service.isKeptAwake()).toBe(false);
    });

    it("should report the lock as held once it is taken", async () => {
      await service.setKeptAwake(true);

      expect(service.isKeptAwake()).toBe(true);
    });

    it("should report nothing held after being switched off", async () => {
      await service.setKeptAwake(true);
      await service.setKeptAwake(false);

      expect(service.isKeptAwake()).toBe(false);
    });

    it("should report nothing held when the request is refused", async () => {
      request.mockRejectedValueOnce(new Error("denied"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      await service.setKeptAwake(true);

      expect(service.isKeptAwake()).toBe(false);
    });

    it("should report nothing held when the browser has no Wake Lock API", async () => {
      Reflect.deleteProperty(navigator, "wakeLock");

      await service.setKeptAwake(true);

      expect(service.isKeptAwake()).toBe(false);
    });

    it("should report nothing held once the system takes the lock back", async () => {
      await service.setKeptAwake(true);

      becomeHidden();

      expect(service.isKeptAwake()).toBe(false);
    });

    it("should emit every change through getIsKeptAwake$()", async () => {
      const values: boolean[] = [];
      service.getIsKeptAwake$().subscribe((value) => values.push(value));

      await service.setKeptAwake(true);
      await service.setKeptAwake(false);

      expect(values).toEqual([false, true, false]);
    });
  });

  describe("coming back to the app", () => {
    it("should take the lock again when the tab becomes visible", async () => {
      await service.setKeptAwake(true);
      becomeHidden();

      becomeVisible();

      await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
      expect(service.isKeptAwake()).toBe(true);
    });

    it("should not take a lock when the setting has been switched off meanwhile", async () => {
      await service.setKeptAwake(true);
      becomeHidden();
      await service.setKeptAwake(false);

      becomeVisible();

      expect(request).toHaveBeenCalledTimes(1);
    });

    it("should not take a second lock when one is still held", async () => {
      await service.setKeptAwake(true);

      becomeVisible();

      expect(request).toHaveBeenCalledTimes(1);
    });

    it("should stay quiet when the automatic retry fails", async () => {
      await service.setKeptAwake(true);
      becomeHidden();
      request.mockRejectedValueOnce(new Error("denied"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      becomeVisible();

      await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
      // Returning from another app is not an action on the setting: a message
      // here would land on top of the song for something the player did not do.
      expect(currentErrorMessage()).toBeNull();
      expect(service.isKeptAwake()).toBe(false);
    });
  });

  /**
   * Android's WebView has no Screen Wake Lock API at all, so the browser path
   * would only ever reach the "this browser cannot keep the screen awake"
   * snackbar — on the one device where a music stand is the whole point.
   */
  describe("on a device", () => {
    beforeEach(() => {
      mockPlatformService.isNative.mockReturnValue(true);
      // Proving the native path is taken means proving the web one is not.
      Reflect.deleteProperty(navigator, "wakeLock");
      service = buildService();
    });

    it("should hold the screen through the native plugin", async () => {
      await service.setKeptAwake(true);

      expect(keepAwake).toHaveBeenCalledTimes(1);
      expect(request).not.toHaveBeenCalled();
      expect(service.isKeptAwake()).toBe(true);
    });

    it("should let the screen sleep again when switched off", async () => {
      await service.setKeptAwake(true);
      await service.setKeptAwake(false);

      expect(allowSleep).toHaveBeenCalledTimes(1);
      expect(service.isKeptAwake()).toBe(false);
    });

    it("should report a refusal instead of claiming the screen is held", async () => {
      keepAwake.mockRejectedValueOnce(new Error("denied"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      await service.setKeptAwake(true);

      expect(currentErrorMessage()).toBe("Could not keep the screen awake.");
      expect(service.isKeptAwake()).toBe(false);
    });

    // The window flag goes with the activity, and Android sends no event when
    // it does, so coming back has to re-assert it.
    it("should take the screen back when the app returns to the foreground", async () => {
      await service.setKeptAwake(true);

      becomeVisible();

      await vi.waitFor(() => expect(keepAwake).toHaveBeenCalledTimes(2));
    });
  });
});
