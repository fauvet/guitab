import { TestBed } from "@angular/core/testing";
import { firstValueFrom, of } from "rxjs";
import { CachedFilesService } from "./cached-files.service";
import { AuthService } from "../auth/auth.service";
import { FirebaseCachedFilesRepository } from "../../storage/firebase/firebase-cached-files.repository";

const LS_KEY = "CACHED_FILES";
const CONTENT_A = "{title: Hotel California}\n{artist: Eagles}";
const CONTENT_B = "{title: Wonderwall}\n{artist: Oasis}";

const mockAuthService = {
  getUser: vi.fn().mockReturnValue(null),
  getUser$: vi.fn().mockReturnValue(of(null)),
  getUserOnceReady: vi.fn().mockResolvedValue(null),
};

const mockFirebaseRepo = {
  getCachedFiles$: vi.fn().mockReturnValue(of([])),
  saveFile: vi.fn().mockResolvedValue("firebase-id"),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  getSyncError$: vi.fn().mockReturnValue(of(null)),
};

describe("CachedFilesService", () => {
  let service: CachedFilesService;

  beforeEach(() => {
    localStorage.clear();
    mockAuthService.getUserOnceReady.mockResolvedValue(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: FirebaseCachedFilesRepository, useValue: mockFirebaseRepo },
      ],
    });
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
      await service.saveFile(CONTENT_A, null);
      const files = await firstValueFrom(service.getCachedFiles$());
      files.splice(0);
      const filesAgain = await firstValueFrom(service.getCachedFiles$());
      expect(filesAgain.length).toBe(1);
    });
  });

  describe("saveFile", () => {
    it("should add an entry with the correct name derived from title/artist", async () => {
      await service.saveFile(CONTENT_A, null);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files[0].name).toBe("Hotel California (Eagles)");
    });

    it("should add an entry with the original chordpro content", async () => {
      await service.saveFile(CONTENT_A, null);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files[0].chordproContent).toBe(CONTENT_A);
    });

    it("should add an entry with a date instance", async () => {
      await service.saveFile(CONTENT_A, null);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files[0].date).toBeInstanceOf(Date);
    });

    it("should mint and return a new id when none is given", async () => {
      const id = await service.saveFile(CONTENT_A, null);
      expect(id).toBeTruthy();
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files[0].id).toBe(id);
    });

    it("should reuse a given id instead of minting a new one", async () => {
      const id = await service.saveFile(CONTENT_A, null);
      const reusedId = await service.saveFile(CONTENT_A, id);
      expect(reusedId).toBe(id);
    });

    it("should give two different untitled songs distinct ids despite sharing the same fallback name", async () => {
      const firstId = await service.saveFile("no directives here", null, "Untitled");
      const secondId = await service.saveFile("also no directives", null, "Untitled");
      expect(firstId).not.toBe(secondId);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files.length).toBe(2);
    });

    it("should use the fallback name for content with no title or artist, so two untitled saves stay distinct", async () => {
      await service.saveFile("no directives here", null, "song-one");
      await service.saveFile("also no directives", null, "song-two");
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files.map((file) => file.name).sort()).toEqual(["song-one", "song-two"]);
    });

    it("should accumulate entries for different songs", async () => {
      await service.saveFile(CONTENT_A, null);
      await service.saveFile(CONTENT_B, null);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files.length).toBe(2);
    });

    it("should replace an existing entry when the same id is saved again", async () => {
      const CONTENT_A_V2 = `${CONTENT_A}\n# updated`;
      const id = await service.saveFile(CONTENT_A, null);
      await service.saveFile(CONTENT_A_V2, id);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files.length).toBe(1);
      expect(files[0].chordproContent).toBe(CONTENT_A_V2);
    });

    it("should update the same record rather than creating a new one when the derived name changes between saves", async () => {
      const id = await service.saveFile("{title: S}", null);
      await service.saveFile("{title: Song title}", id);
      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files.length).toBe(1);
      expect(files[0].name).toBe("Song title");
      expect(files[0].id).toBe(id);
    });

    it("should persist entries to localStorage", async () => {
      await service.saveFile(CONTENT_A, null);
      const raw = localStorage.getItem(LS_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed[0].name).toBe("Hotel California (Eagles)");
    });

    it("should restore persisted entries on service creation", async () => {
      await service.saveFile(CONTENT_A, null);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({});
      const freshService = TestBed.inject(CachedFilesService);
      const files = await firstValueFrom(freshService.getCachedFiles$());
      expect(files[0].name).toBe("Hotel California (Eagles)");
    });

    it("should default a legacy entry with no id field to its name, and keep it a single record", async () => {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify([{ name: "Legacy Song", chordproContent: CONTENT_A, date: new Date() }]),
      );
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: FirebaseCachedFilesRepository, useValue: mockFirebaseRepo },
        ],
      });
      const freshService = TestBed.inject(CachedFilesService);

      const filesBeforeSave = await firstValueFrom(freshService.getCachedFiles$());
      expect(filesBeforeSave[0].id).toBe("Legacy Song");

      await freshService.saveFile(`${CONTENT_A}\n# touched`, filesBeforeSave[0].id);
      const filesAfterSave = await firstValueFrom(freshService.getCachedFiles$());
      expect(filesAfterSave.length).toBe(1);
    });

    it("should wait for the resolved auth state rather than racing it, so a save started before startup finishes still reaches Firebase", async () => {
      let resolveReady: (user: unknown) => void = () => {};
      mockAuthService.getUserOnceReady.mockReturnValue(
        new Promise((resolve) => {
          resolveReady = resolve;
        }),
      );

      const save = service.saveFile(CONTENT_A, null);
      resolveReady({ uid: "uid-123" });
      await save;

      expect(mockFirebaseRepo.saveFile).toHaveBeenCalledWith(CONTENT_A, null, undefined);
      const rawLocalFiles = localStorage.getItem(LS_KEY);
      expect(rawLocalFiles === null ? [] : JSON.parse(rawLocalFiles)).toEqual([]);
    });

    it("should propagate a rejection from the active repository instead of swallowing it", async () => {
      mockAuthService.getUserOnceReady.mockResolvedValue({ uid: "uid-123" });
      const writeError = new Error("Could not save to your account.");
      mockFirebaseRepo.saveFile.mockRejectedValueOnce(writeError);

      await expect(service.saveFile(CONTENT_A, null)).rejects.toThrow(writeError);
    });
  });

  describe("deleteFile", () => {
    it("should remove the entry from localStorage when signed out", async () => {
      const id = await service.saveFile(CONTENT_A, null);
      await service.deleteFile(id);

      const files = await firstValueFrom(service.getCachedFiles$());
      expect(files).toEqual([]);
    });

    it("should delegate to the Firebase repository once signed in", async () => {
      mockAuthService.getUserOnceReady.mockResolvedValue({ uid: "uid-123" });

      await service.deleteFile("some-id");

      expect(mockFirebaseRepo.deleteFile).toHaveBeenCalledWith("some-id");
    });

    it("should propagate a rejection from the active repository instead of swallowing it", async () => {
      mockAuthService.getUserOnceReady.mockResolvedValue({ uid: "uid-123" });
      const deleteError = new Error("Could not delete.");
      mockFirebaseRepo.deleteFile.mockRejectedValueOnce(deleteError);

      await expect(service.deleteFile("some-id")).rejects.toThrow(deleteError);
    });
  });

  describe("getSyncError$", () => {
    it("reads from the local repository (always null) when signed out", async () => {
      mockAuthService.getUser$.mockReturnValue(of(null));
      const error = await firstValueFrom(service.getSyncError$());
      expect(error).toBeNull();
    });

    it("switches to the Firebase repository's sync error once signed in", async () => {
      const syncError = new Error("permission-denied");
      mockFirebaseRepo.getSyncError$.mockReturnValue(of(syncError));
      mockAuthService.getUser$.mockReturnValue(of({ uid: "uid-123" }));

      const error = await firstValueFrom(service.getSyncError$());

      expect(error).toBe(syncError);
    });
  });
});
