import { TestBed } from '@angular/core/testing';

import { ChordproService } from './chordpro.service';

describe('ChordproService', () => {
  let service: ChordproService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChordproService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
