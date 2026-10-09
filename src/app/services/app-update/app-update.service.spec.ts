import { DOCUMENT } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { SwUpdate } from "@angular/service-worker";
import { ChordproService } from "../chordpro/chordpro.service";
import { AppUpdateService } from "./app-update.service";

describe("AppUpdateService", () => {
  let service: AppUpdateService;
  let swUpdate: {
    isEnabled: boolean;
    checkForUpdate: ReturnType<typeof vi.fn>;
    activateUpdate: ReturnType<typeof vi.fn>;
  };
  let saveNow: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    swUpdate = {
      isEnabled: true,
      checkForUpdate: vi.fn().mockResolvedValue(false),
      activateUpdate: vi.fn().mockResolvedValue(false),
    };
    saveNow = vi.fn().mockResolvedValue(undefined);
    reload = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        { provide: ChordproService, useValue: { saveNow } },
        { provide: DOCUMENT, useValue: { location: { reload } } },
      ],
    });
    service = TestBed.inject(AppUpdateService);
  });

  it("should reject with a clear error when no service worker serves the app", async () => {
    swUpdate.isEnabled = false;

    await expect(service.updateApp()).rejects.toThrow(/service worker/);
    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it("should resolve false and leave the page alone when already up to date", async () => {
    await expect(service.updateApp()).resolves.toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("should reload into a version found by this check", async () => {
    swUpdate.checkForUpdate.mockResolvedValue(true);
    swUpdate.activateUpdate.mockResolvedValue(true);

    await expect(service.updateApp()).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("should reload into a version the service worker had already downloaded in the background", async () => {
    // The check finds nothing newer than what is downloaded, yet this tab is behind.
    swUpdate.checkForUpdate.mockResolvedValue(false);
    swUpdate.activateUpdate.mockResolvedValue(true);

    await expect(service.updateApp()).resolves.toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("should save the song before reloading, so the reload asks nothing and loses nothing", async () => {
    const calls: string[] = [];
    saveNow.mockImplementation(async () => calls.push("save"));
    swUpdate.activateUpdate.mockImplementation(async () => (calls.push("activate"), true));
    reload.mockImplementation(() => calls.push("reload"));

    await service.updateApp();

    expect(calls).toEqual(["save", "activate", "reload"]);
  });

  it("should not update when the song cannot be saved", async () => {
    saveNow.mockRejectedValue(new Error("offline"));

    await expect(service.updateApp()).rejects.toThrow("offline");
    expect(swUpdate.activateUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("should reject when the check itself fails", async () => {
    swUpdate.checkForUpdate.mockRejectedValue(new Error("network"));

    await expect(service.updateApp()).rejects.toThrow("network");
    expect(reload).not.toHaveBeenCalled();
  });
});
