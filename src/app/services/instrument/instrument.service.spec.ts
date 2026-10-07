import { TestBed } from "@angular/core/testing";
import { InstrumentService } from "./instrument.service";

const LOCAL_STORAGE_KEY = "InstrumentService-INSTRUMENT";

describe("InstrumentService", () => {
  function createService(): InstrumentService {
    TestBed.configureTestingModule({});
    return TestBed.inject(InstrumentService);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should default to the guitar when nothing is stored", () => {
    expect(createService().getInstrument()).toBe("guitar");
  });

  it("should restore the instrument stored by a previous session", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify("ukulele"));
    expect(createService().getInstrument()).toBe("ukulele");
  });

  it("should fall back to the guitar when the stored value is not an instrument", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify("banjo"));
    const service = createService();
    expect(service.getInstrument()).toBe("guitar");
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe(JSON.stringify("guitar"));
  });

  it("should persist and emit a new instrument", () => {
    const service = createService();
    const emitted: string[] = [];
    service.getInstrument$().subscribe((instrument) => emitted.push(instrument));

    service.setInstrument("ukulele");

    expect(service.getInstrument()).toBe("ukulele");
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe(JSON.stringify("ukulele"));
    expect(emitted).toEqual(["guitar", "ukulele"]);
  });

  it("should not emit when the instrument is unchanged", () => {
    const service = createService();
    const emitted: string[] = [];
    service.getInstrument$().subscribe((instrument) => emitted.push(instrument));

    service.setInstrument("guitar");

    expect(emitted).toEqual(["guitar"]);
  });
});
