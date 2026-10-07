import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import Instrument, { isInstrument } from "../../types/instrument.type";
import { LocalStorageService } from "../local-storage/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class InstrumentService {
  private static readonly LOCAL_STORAGE_KEY = "InstrumentService-INSTRUMENT";
  private static readonly DEFAULT_VALUE: Instrument = "guitar";

  private readonly localStorageService = inject(LocalStorageService);
  private readonly instrument$ = this.localStorageService.buildBehaviorSubject<Instrument>(
    InstrumentService.LOCAL_STORAGE_KEY,
    InstrumentService.DEFAULT_VALUE,
  );

  constructor() {
    // localStorage is outside the type system: a hand-edited or future value
    // would otherwise reach SvgGuitarUtil as an instrument it has no data for.
    const storedInstrument: unknown = this.instrument$.getValue();
    if (!isInstrument(storedInstrument)) this.instrument$.next(InstrumentService.DEFAULT_VALUE);
  }

  getInstrument$(): Observable<Instrument> {
    return this.instrument$.asObservable();
  }

  getInstrument(): Instrument {
    return this.instrument$.getValue();
  }

  setInstrument(instrument: Instrument): void {
    if (instrument === this.getInstrument()) return;
    this.instrument$.next(instrument);
  }
}
