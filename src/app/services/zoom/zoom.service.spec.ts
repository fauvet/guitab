import { TestBed } from "@angular/core/testing";
import { ZoomService } from "./zoom.service";

const LOCAL_STORAGE_KEY = "ZoomService-ZOOM-STEP-VALUE";

describe("ZoomService", () => {
  let service: ZoomService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ZoomService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should apply default font size (1rem) on creation with no stored value", () => {
    expect(document.documentElement.style.fontSize).toBe("1rem");
  });

  describe("incrementZoom", () => {
    it("should increase the font size by one step", () => {
      service.incrementZoom();
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(1.1, 1)}rem`);
    });

    it("should accumulate multiple increments", () => {
      service.incrementZoom();
      service.incrementZoom();
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(1.1, 2)}rem`);
    });

    it("should not exceed max zoom step (10)", () => {
      for (let i = 0; i < 15; i++) service.incrementZoom();
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(1.1, 10)}rem`);
    });
  });

  describe("decrementZoom", () => {
    it("should decrease the font size by one step", () => {
      service.decrementZoom();
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(0.9, 1)}rem`);
    });

    it("should not go below min zoom step (-10)", () => {
      for (let i = 0; i < 15; i++) service.decrementZoom();
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(0.9, 10)}rem`);
    });
  });

  describe("resetZoom", () => {
    it("should restore font size to 1rem after increments", () => {
      service.incrementZoom();
      service.incrementZoom();
      service.resetZoom();
      expect(document.documentElement.style.fontSize).toBe("1rem");
    });

    it("should restore font size to 1rem after decrements", () => {
      service.decrementZoom();
      service.resetZoom();
      expect(document.documentElement.style.fontSize).toBe("1rem");
    });
  });

  describe("onZoomChanged", () => {
    it("should set font size to 1rem for step 0", () => {
      service.onZoomChanged(0);
      expect(document.documentElement.style.fontSize).toBe("1rem");
    });

    it("should apply exponential scale for a positive step", () => {
      service.onZoomChanged(3);
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(1.1, 3)}rem`);
    });

    it("should apply exponential scale for a negative step", () => {
      service.onZoomChanged(-3);
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(0.9, 3)}rem`);
    });
  });

  describe("localStorage persistence", () => {
    it("should persist zoom step after increment", () => {
      service.incrementZoom();
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!)).toBe(1);
    });

    it("should persist zoom step 0 after reset", () => {
      service.incrementZoom();
      service.resetZoom();
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!)).toBe(0);
    });

    it("should restore and apply stored zoom step on creation", () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, "3");
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      TestBed.inject(ZoomService);
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(1.1, 3)}rem`);
    });

    it("should clamp an out-of-range stored value on creation", () => {
      localStorage.setItem(LOCAL_STORAGE_KEY, "99");
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      TestBed.inject(ZoomService);
      expect(document.documentElement.style.fontSize).toBe(`${Math.pow(1.1, 10)}rem`);
    });
  });
});
