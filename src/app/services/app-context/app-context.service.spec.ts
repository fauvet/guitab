import { TestBed } from "@angular/core/testing";
import { AppContextService } from "./app-context.service";
import { WakeLockService } from "../wake-lock/wake-lock.service";
import { BluetoothKeepAliveService } from "../bluetooth-keep-alive/bluetooth-keep-alive.service";
import { FileUtil } from "../../utils/file.util";

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
    it("should have null fileHandleWithContent", () => {
      expect(service.getFileHandleWithContent()).toBeNull();
    });

    it("should have null fileId", () => {
      expect(service.getFileId()).toBeNull();
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

  describe("setFileHandle", () => {
    it("should update fileHandleWithContent with the file and its content", async () => {
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("[Am] Hello world");
      const file = new File([""], "test.cho");
      await service.setFileHandle(file);
      expect(service.getFileHandleWithContent()?.fileHandle).toBe(file);
      expect(service.getFileHandleWithContent()?.content).toBe("[Am] Hello world");
    });

    it("should be a no-op when the same file handle is provided again", async () => {
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("content");
      const file = new File([""], "test.cho");
      await service.setFileHandle(file);
      const stateBefore = service.getFileHandleWithContent();
      await service.setFileHandle(file); // same reference → no-op
      expect(service.getFileHandleWithContent()).toBe(stateBefore);
    });

    it("should default fileId to null when no id is given", async () => {
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("content");
      await service.setFileHandle(new File([""], "test.cho"));
      expect(service.getFileId()).toBeNull();
    });

    it("should set fileId when an id is given", async () => {
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("content");
      await service.setFileHandle(new File([""], "test.cho"), "cached-file-id");
      expect(service.getFileId()).toBe("cached-file-id");
    });
  });

  describe("setFileId", () => {
    it("should update the fileId", () => {
      service.setFileId("new-id");
      expect(service.getFileId()).toBe("new-id");
    });

    it("should be a no-op (no new emission) when the id is already the same", () => {
      service.setFileId("new-id");
      const values: (string | null)[] = [];
      service.getFileId$().subscribe((v) => values.push(v));
      service.setFileId("new-id");
      expect(values).toEqual(["new-id"]); // only the initial emission from subscribing
    });

    it("should not emit through getFileHandleWithContent$(), so it never re-triggers a file-load reaction", () => {
      const emissions: unknown[] = [];
      service.getFileHandleWithContent$().subscribe((v) => emissions.push(v));
      const emissionsBefore = emissions.length;

      service.setFileId("new-id");

      expect(emissions.length).toBe(emissionsBefore);
    });
  });
});
