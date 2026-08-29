import { TestBed } from "@angular/core/testing";
import { LocalStorageService } from "./local-storage.service";

const DEPRECATED_KEY = "ZoomService-ZOOM-VALUE";

describe("LocalStorageService", () => {
  let service: LocalStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalStorageService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("constructor", () => {
    it("should automatically remove deprecated keys on creation", () => {
      localStorage.setItem(DEPRECATED_KEY, "legacy-value");
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      TestBed.inject(LocalStorageService);
      expect(localStorage.getItem(DEPRECATED_KEY)).toBeNull();
    });

    it("should not affect non-deprecated keys on creation", () => {
      localStorage.setItem("my-key", "value");
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      TestBed.inject(LocalStorageService);
      expect(localStorage.getItem("my-key")).toBe("value");
    });
  });

  describe("removeDeprecatedKeys", () => {
    it("should remove an existing key from localStorage", () => {
      localStorage.setItem("foo", "bar");
      service.removeDeprecatedKeys("foo");
      expect(localStorage.getItem("foo")).toBeNull();
    });

    it("should not throw when the key does not exist", () => {
      expect(() => service.removeDeprecatedKeys("non-existent-key")).not.toThrow();
    });

    it("should remove multiple keys at once", () => {
      localStorage.setItem("key-a", "1");
      localStorage.setItem("key-b", "2");
      service.removeDeprecatedKeys("key-a", "key-b");
      expect(localStorage.getItem("key-a")).toBeNull();
      expect(localStorage.getItem("key-b")).toBeNull();
    });
  });

  describe("buildBehaviorSubject", () => {
    it("should use defaultValue when no localStorage entry exists", () => {
      const subject = service.buildBehaviorSubject("test-key", 42);
      expect(subject.getValue()).toBe(42);
    });

    it("should parse and use the stored localStorage value when present", () => {
      localStorage.setItem("test-key", "99");
      const subject = service.buildBehaviorSubject("test-key", 0);
      expect(subject.getValue()).toBe(99);
    });

    it("should persist the value to localStorage on next()", () => {
      const subject = service.buildBehaviorSubject("test-key", 0);
      subject.next(7);
      expect(JSON.parse(localStorage.getItem("test-key")!)).toBe(7);
    });

    it("should remove the localStorage entry on next(null)", () => {
      localStorage.setItem("test-key", "7");
      const subject = service.buildBehaviorSubject<number | null>("test-key", null);
      subject.next(null);
      expect(localStorage.getItem("test-key")).toBeNull();
    });

    it("should remove the localStorage entry on next(undefined)", () => {
      localStorage.setItem("test-key", "7");
      const subject = service.buildBehaviorSubject<number | undefined>("test-key", undefined);
      subject.next(undefined);
      expect(localStorage.getItem("test-key")).toBeNull();
    });

    it("should fall back to defaultValue and log when the stored value is corrupted JSON", () => {
      localStorage.setItem("test-key", "{not valid json");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const subject = service.buildBehaviorSubject("test-key", 42);

      expect(subject.getValue()).toBe(42);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should throw when using a deprecated key", () => {
      expect(() => service.buildBehaviorSubject(DEPRECATED_KEY, "value")).toThrow(
        `Local storage key "${DEPRECATED_KEY}" is deprecated and should not be used.`,
      );
    });

    it("should apply the reviver function when parsing the stored value", () => {
      const stored = JSON.stringify({ date: "2024-06-15T00:00:00.000Z" });
      localStorage.setItem("test-key", stored);
      const reviver = (key: string, value: any) => (key === "date" ? new Date(value) : value);
      const subject = service.buildBehaviorSubject<{ date: Date }>("test-key", { date: new Date(0) }, reviver);
      expect(subject.getValue().date).toBeInstanceOf(Date);
      expect(subject.getValue().date.getFullYear()).toBe(2024);
    });

    it("should log instead of throwing when the underlying setItem fails", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const subject = service.buildBehaviorSubject("test-key", 0);

      expect(() => subject.next(7)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
    });

    it("should persist object values as JSON strings", () => {
      const subject = service.buildBehaviorSubject("test-key", { name: "test", value: 1 });
      subject.next({ name: "updated", value: 2 });
      const stored = JSON.parse(localStorage.getItem("test-key")!);
      expect(stored).toEqual({ name: "updated", value: 2 });
    });
  });
});
