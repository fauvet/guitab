import { TestBed } from "@angular/core/testing";
import { MatSnackBar } from "@angular/material/snack-bar";
import { WakeLockService } from "./wake-lock.service";

/**
 * jsdom has no Screen Wake Lock API, so `navigator.wakeLock` is defined for the
 * test and removed afterwards. What is worth asserting is the handle
 * bookkeeping: requesting twice wastes a sentinel the browser may not give
 * back, releasing one that was never taken throws, and a lock the system drops
 * on its own has to be forgotten or the setting can never be turned back on.
 */
describe("WakeLockService", () => {
  let service: WakeLockService;
  let request: ReturnType<typeof vi.fn>;
  let release: ReturnType<typeof vi.fn>;
  let snackBarOpen: ReturnType<typeof vi.fn>;
  let releaseListeners: (() => void)[];

  function defineWakeLock(value: unknown): void {
    Object.defineProperty(navigator, "wakeLock", { value, configurable: true });
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

    snackBarOpen = vi.fn();

    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { open: snackBarOpen } }],
    });
    service = TestBed.inject(WakeLockService);
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "wakeLock");
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

    expect(snackBarOpen).toHaveBeenCalledTimes(1);
  });

  it("should tell the user when the request is refused", async () => {
    request.mockRejectedValueOnce(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await service.setKeptAwake(true);

    expect(snackBarOpen).toHaveBeenCalledTimes(1);
  });

  it("should retry after a refusal rather than believe it holds a lock", async () => {
    request.mockRejectedValueOnce(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await service.setKeptAwake(true);
    await service.setKeptAwake(true);

    expect(request).toHaveBeenCalledTimes(2);
  });
});
