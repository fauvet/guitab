import { TestBed } from "@angular/core/testing";
import { AppContextService } from "./app-context.service";
import { WakeLockService } from "../wake-lock/wake-lock.service";
import { BluetoothKeepAliveService } from "../bluetooth-keep-alive/bluetooth-keep-alive.service";
import { FileUtil } from "../../utils/file.util";
import { FileTargetUtil } from "../../utils/file-target.util";

describe("AppContextService", () => {
  let service: AppContextService;
  let wakeLockSpy: ReturnType<typeof vi.fn>;
  let bluetoothSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    wakeLockSpy = vi.fn().mockResolvedValue(undefined);
    bluetoothSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: BluetoothKeepAliveService, useValue: { setKeptAlive: bluetoothSpy } },
        { provide: WakeLockService, useValue: { setKeptAwake: wakeLockSpy } },
      ],
    });
    service = TestBed.inject(AppContextService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("initial state", () => {
    it("should have null fileWithContent", () => {
      expect(service.getFileWithContent()).toBeNull();
    });

    it("should have isEditing = false", () => {
      expect(service.isEditing()).toBe(false);
    });

    it("should have isWakeLock = false", () => {
      expect(service.isWakeLock()).toBe(false);
    });

    it("should have isBluetoothKeptAlive = false", () => {
      expect(service.isBluetoothKeptAlive()).toBe(false);
    });
  });

  describe("setEditing", () => {
    it("should update the editing state to true", () => {
      service.setEditing(true);
      expect(service.isEditing()).toBe(true);
    });

    it("should update the editing state back to false", () => {
      service.setEditing(true);
      service.setEditing(false);
      expect(service.isEditing()).toBe(false);
    });

    it("should be a no-op when the value is already the same", () => {
      const values: boolean[] = [];
      service.getIsEditing$().subscribe((v) => values.push(v));
      service.setEditing(false); // same as initial
      expect(values).toEqual([false]); // only the initial emission
    });

    it("should emit the new value through getIsEditing$()", () => {
      const values: boolean[] = [];
      service.getIsEditing$().subscribe((v) => values.push(v));
      service.setEditing(true);
      expect(values).toEqual([false, true]);
    });
  });

  describe("setWakeLock", () => {
    it("should update the wake lock state to true", () => {
      service.setWakeLock(true);
      expect(service.isWakeLock()).toBe(true);
    });

    it("should call WakeLockService.setKeptAwake with the new value", () => {
      const callsBefore = wakeLockSpy.mock.calls.length;
      service.setWakeLock(true);
      expect(wakeLockSpy).toHaveBeenCalledWith(true);
      expect(wakeLockSpy.mock.calls.length).toBe(callsBefore + 1);
    });

    it("should be a no-op (no extra service call) when value is already the same", () => {
      const callsBefore = wakeLockSpy.mock.calls.length;
      service.setWakeLock(false); // same as initial
      expect(wakeLockSpy.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("setBluetoothKeptAlive", () => {
    it("should update the bluetooth state to true", () => {
      service.setBluetoothKeptAlive(true);
      expect(service.isBluetoothKeptAlive()).toBe(true);
    });

    it("should call BluetoothKeepAliveService.setKeptAlive with the new value", () => {
      const callsBefore = bluetoothSpy.mock.calls.length;
      service.setBluetoothKeptAlive(true);
      expect(bluetoothSpy).toHaveBeenCalledWith(true);
      expect(bluetoothSpy.mock.calls.length).toBe(callsBefore + 1);
    });

    it("should be a no-op (no extra service call) when value is already the same", () => {
      const callsBefore = bluetoothSpy.mock.calls.length;
      service.setBluetoothKeptAlive(false); // same as initial
      expect(bluetoothSpy.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("setFile", () => {
    it("should update fileWithContent with the file and its content", async () => {
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("[Am] Hello world");
      const file = new File([""], "test.cho");
      await service.setFile(FileTargetUtil.fromFile(file));
      expect(service.getFileWithContent()?.fileTarget).toEqual(FileTargetUtil.fromFile(file));
      expect(service.getFileWithContent()?.content).toBe("[Am] Hello world");
    });

    // The target is a wrapper built on demand, so the guard cannot compare it by
    // reference any more — it compares the file inside it. Re-opening the same
    // file must still not restart the pipeline.
    it("should be a no-op when the same file is provided again in a new target", async () => {
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("content");
      const file = new File([""], "test.cho");
      await service.setFile(FileTargetUtil.fromFile(file));
      const stateBefore = service.getFileWithContent();
      await service.setFile(FileTargetUtil.fromFile(file));
      expect(service.getFileWithContent()).toBe(stateBefore);
    });

    // A native target carries no readable object, so FileUtil throws on it by
    // design; the repository that picked it passes the content in instead.
    it("should use the supplied content rather than reading a native target", async () => {
      const getFileContent = vi.spyOn(FileUtil, "getFileContent");
      const fileTarget = FileTargetUtil.fromNative("content://songs/1", "song.cho");

      await service.setFile(fileTarget, "{title: Song}");

      expect(service.getFileWithContent()?.content).toBe("{title: Song}");
      expect(getFileContent).not.toHaveBeenCalled();
    });
  });
});
