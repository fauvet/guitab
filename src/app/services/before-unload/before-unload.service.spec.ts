import { TestBed } from "@angular/core/testing";
import { of, Subject } from "rxjs";
import { BeforeUnloadService } from "./before-unload.service";
import { ChordproService } from "../chordpro/chordpro.service";
import { AuthService } from "../auth/auth.service";
import { FirebaseDraftRepository } from "../../storage/firebase/firebase-draft.repository";
import { DEFAULT_DRAFT } from "../../storage/repositories/draft.repository";

describe("BeforeUnloadService", () => {
  let service: BeforeUnloadService;
  let contentSubject: Subject<string>;
  let mockChordproService: {
    getChordproContent$: ReturnType<typeof vi.fn>;
    hasUnsavedChanges: ReturnType<typeof vi.fn>;
  };

  const mockAuthService = {
    getUser: vi.fn().mockReturnValue(null),
    getUser$: vi.fn().mockReturnValue(of(null)),
    getUserOnceReady: vi.fn().mockResolvedValue(null),
  };

  const mockFirebaseDraftRepo = {
    getDraft$: vi.fn().mockReturnValue(of(DEFAULT_DRAFT)),
    getDraft: vi.fn().mockReturnValue(DEFAULT_DRAFT),
    saveDraft: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    localStorage.clear();
    mockAuthService.getUserOnceReady.mockResolvedValue(null);
    contentSubject = new Subject<string>();
    mockChordproService = {
      getChordproContent$: vi.fn().mockReturnValue(contentSubject.asObservable()),
      hasUnsavedChanges: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ChordproService, useValue: mockChordproService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: FirebaseDraftRepository, useValue: mockFirebaseDraftRepo },
      ],
    });
    service = TestBed.inject(BeforeUnloadService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("initialize", () => {
    it("should be a no-op and not throw", () => {
      expect(() => service.initialize()).not.toThrow();
    });
  });

  describe("findDraftUnsavedChordproContent", () => {
    it("should return null initially (no unsaved changes)", async () => {
      expect(await service.findDraftUnsavedChordproContent()).toBeNull();
    });

    it("should return null after a content change when hasUnsavedChanges is false", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(false);
      contentSubject.next("first"); // skipped by skip(1)
      contentSubject.next("some content");
      await vi.waitFor(async () => expect(await service.findDraftUnsavedChordproContent()).toBeNull());
    });

    it("should return the content after a content change when hasUnsavedChanges is true", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(true);
      contentSubject.next("first"); // skipped by skip(1)
      contentSubject.next("my unsaved content");
      await vi.waitFor(async () => expect(await service.findDraftUnsavedChordproContent()).toBe("my unsaved content"));
    });

    it("should reflect the latest content after multiple changes", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(true);
      contentSubject.next("first"); // skipped
      contentSubject.next("second");
      contentSubject.next("third");
      await vi.waitFor(async () => expect(await service.findDraftUnsavedChordproContent()).toBe("third"));
    });

    it("should return null if hasUnsavedChanges switches back to false", async () => {
      mockChordproService.hasUnsavedChanges.mockReturnValue(true);
      contentSubject.next("first"); // skipped
      contentSubject.next("unsaved content");
      mockChordproService.hasUnsavedChanges.mockReturnValue(false);
      contentSubject.next("saved content");
      await vi.waitFor(async () => expect(await service.findDraftUnsavedChordproContent()).toBeNull());
    });

    it("should wait for the resolved auth state rather than racing it, so a draft saved before startup finishes still lands in the right repository", async () => {
      let resolveReady: (user: unknown) => void = () => {};
      mockAuthService.getUserOnceReady.mockReturnValue(
        new Promise((resolve) => {
          resolveReady = resolve;
        }),
      );
      mockFirebaseDraftRepo.getDraft.mockReturnValue({ chordproContent: "cloud draft", hasUnsavedChanges: true });

      const find = service.findDraftUnsavedChordproContent();
      resolveReady({ uid: "uid-123" });

      expect(await find).toBe("cloud draft");
    });
  });
});
