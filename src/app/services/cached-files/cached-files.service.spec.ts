import { TestBed } from "@angular/core/testing";

import { CachedFilesService } from "./cached-files.service";

describe("CachedFilesService", () => {
  let service: CachedFilesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CachedFilesService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
