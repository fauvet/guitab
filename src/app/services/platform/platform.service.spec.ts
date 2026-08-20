import { TestBed } from "@angular/core/testing";
import { Capacitor } from "@capacitor/core";
import { PlatformService } from "./platform.service";

describe("PlatformService", () => {
  let service: PlatformService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlatformService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  // Every strategy in the app branches on this, so the default matters: under
  // jsdom, and in a browser, the web path is the one that runs.
  it("should report the web platform when there is no native shell", () => {
    expect(service.isNative()).toBe(false);
    expect(service.getPlatform()).toBe("web");
  });

  it("should report a native platform when Capacitor says so", () => {
    vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
    vi.spyOn(Capacitor, "getPlatform").mockReturnValue("android");

    expect(service.isNative()).toBe(true);
    expect(service.getPlatform()).toBe("android");
  });
});
