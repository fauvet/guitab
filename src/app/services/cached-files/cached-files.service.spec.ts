import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";
import { CachedFilesService } from "./cached-files.service";

const LS_KEY = "CACHED_FILES";
const CONTENT_A = "{title: Hotel California}\n{artist: Eagles}";
const CONTENT_B = "{title: Wonderwall}\n{artist: Oasis}";

describe("CachedFilesService", () => {
  let service: CachedFilesService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CachedFilesService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getCachedFiles$", () => {
    it("should emit an empty array initially", async () => {
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files).toEqual([]);
    });

    it("should emit a copy — mutations do not affect the internal state", async () => {
      service.saveFile(CONTENT_A);
      const files = await firstValueFrom(service.getCachedFiles$());
      files.splice(0);
      const filesAgain = await firstValueFrom(service.getCachedFiles$());
      expect(filesAgain.length).toBe(1);
    });
  });

  describe("saveFile", () => {
    it("should add an entry with the correct name derived from title/artist", async () => {
      service.saveFile(CONTENT_A);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files[0].name).toBe("Hotel California (Eagles)");
    });

    it("should add an entry with the original chordpro content", async () => {
      service.saveFile(CONTENT_A);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files[0].chordproContent).toBe(CONTENT_A);
    });

    it("should add an entry with a date instance", async () => {
      service.saveFile(CONTENT_A);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files[0].date).toBeInstanceOf(Date);
    });

    it("should accumulate entries for different songs", async () => {
      service.saveFile(CONTENT_A);
      service.saveFile(CONTENT_B);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files.length).toBe(2);
    });

    it("should replace an existing entry when the same name is saved again", async () => {
      const CONTENT_A_V2 = `${CONTENT_A}\n# updated`;
      service.saveFile(CONTENT_A);
      service.saveFile(CONTENT_A_V2);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files.length).toBe(1);
      expect(files[0].chordproContent).toBe(CONTENT_A_V2);
    });

    it("should persist entries to localStorage", () => {
      service.saveFile(CONTENT_A);
      const raw = localStorage.getItem(LS_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed[0].name).toBe("Hotel California (Eagles)");
    });

    it("should restore persisted entries on service creation", async () => {
      service.saveFile(CONTENT_A);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshService = TestBed.inject(CachedFilesService);
      const files = await firstValueFrom(freshService.getCachedFiles$());
      expect(files[0].name).toBe("Hotel California (Eagles)");
    });
  });
});
