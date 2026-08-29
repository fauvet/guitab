import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, provideRouter } from "@angular/router";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatIconTestingModule } from "@angular/material/icon/testing";
import { of, Subject } from "rxjs";
import { AppComponent } from "./app.component";
import { AppContextService } from "./services/app-context/app-context.service";
import { CachedFilesService } from "./services/cached-files/cached-files.service";
import { KeyboardShortcutService } from "./services/keyboard-shortcut/keyboard-shortcut.service";
import { ChordproService } from "./services/chordpro/chordpro.service";
import { NotificationService } from "./services/notification/notification.service";
import { FileUtil } from "./utils/file.util";

// AppComponent transitively constructs the real AuthService, which otherwise
// calls the genuine signInAnonymously() against the CI job's dummy Firebase
// config and logs a bootstrap-exception console.error on every test here —
// see auth.service.spec.ts for the same mock shape.
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    callback(null);
    return vi.fn();
  }),
  signInAnonymously: vi.fn().mockResolvedValue({}),
  signInWithPopup: vi.fn().mockResolvedValue({}),
  linkWithPopup: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: vi.fn(),
  connectAuthEmulator: vi.fn(),
}));

type FakeLaunchConsumer = (launchParams: { files: FileSystemFileHandle[] }) => Promise<void>;

describe("AppComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create the app", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  describe("handleLaunchQueue", () => {
    const originalLaunchQueue = (window as { launchQueue?: unknown }).launchQueue;

    afterEach(() => {
      // Reassigning `undefined` still leaves "launchQueue" as an own property,
      // which makes `"launchQueue" in window` true for every test that runs
      // afterwards in this file — delete it instead when there was none to
      // begin with.
      if (originalLaunchQueue === undefined) {
        delete (window as { launchQueue?: unknown }).launchQueue;
      } else {
        (window as { launchQueue?: unknown }).launchQueue = originalLaunchQueue;
      }
    });

    it("registers a file opened through the PWA file handler as a cached file", async () => {
      const mockCachedFilesService = {
        saveFile: vi.fn().mockResolvedValue("launched-file-id"),
        getSyncError$: vi.fn().mockReturnValue(of(null)),
      };
      let consumer: FakeLaunchConsumer | null = null;
      (window as { launchQueue?: unknown }).launchQueue = {
        setConsumer: (fn: FakeLaunchConsumer) => (consumer = fn),
      };
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("{title: Test Song}");

      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
          providers: [provideRouter([]), { provide: CachedFilesService, useValue: mockCachedFilesService }],
        })
        .compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const appContextService = TestBed.inject(AppContextService);

      expect(consumer).not.toBeNull();
      const fakeFileHandle = {} as unknown as FileSystemFileHandle;
      await consumer!({ files: [fakeFileHandle] });

      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("{title: Test Song}", null);
      expect(appContextService.getFileId()).toBe("launched-file-id");
    });

    it("logs and shows an error notification when syncing the opened file fails, instead of failing silently", async () => {
      const cacheError = new Error('Could not save "Test Song" to your account.');
      const mockCachedFilesService = {
        saveFile: vi.fn().mockRejectedValue(cacheError),
        getSyncError$: vi.fn().mockReturnValue(of(null)),
      };
      const mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
      let consumer: FakeLaunchConsumer | null = null;
      (window as { launchQueue?: unknown }).launchQueue = {
        setConsumer: (fn: FakeLaunchConsumer) => (consumer = fn),
      };
      vi.spyOn(FileUtil, "getFileContent").mockResolvedValue("{title: Test Song}");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
          providers: [
            provideRouter([]),
            { provide: CachedFilesService, useValue: mockCachedFilesService },
            { provide: NotificationService, useValue: mockNotificationService },
          ],
        })
        .compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      const fakeFileHandle = {} as unknown as FileSystemFileHandle;
      await consumer!({ files: [fakeFileHandle] });

      expect(consoleErrorSpy).toHaveBeenCalledWith(cacheError);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("loading the initial song", () => {
    it("logs and shows an error notification when the sample file cannot be loaded, instead of failing silently", async () => {
      const loadError = new Error('Could not load asset "sample.cho".');
      vi.spyOn(FileUtil, "loadSampleFile").mockRejectedValue(loadError);
      const mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
          providers: [
            provideRouter([]),
            { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ load: "demo" })) } },
            { provide: NotificationService, useValue: mockNotificationService },
          ],
        })
        .compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith(loadError));
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });

  describe("keyboard shortcut errors", () => {
    it("logs and shows an error notification, instead of failing silently, when a keyboard-triggered action throws", async () => {
      const error$ = new Subject<Error>();
      const mockKeyboardShortcutService = {
        initialize: vi.fn(),
        getKeyboardShortcutError$: () => error$.asObservable(),
      };
      const mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
      const error = new Error("Could not create a new file.");

      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
          providers: [
            provideRouter([]),
            { provide: KeyboardShortcutService, useValue: mockKeyboardShortcutService },
            { provide: NotificationService, useValue: mockNotificationService },
          ],
        })
        .compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      error$.next(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        "Could not complete the keyboard shortcut. Please try again.",
      );
    });
  });

  describe("sync error", () => {
    it("logs and shows an error notification, instead of failing silently, when the library fails to sync", async () => {
      const syncError$ = new Subject<Error | null>();
      const mockCachedFilesService = { getSyncError$: () => syncError$.asObservable() };
      const mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
      const error = new Error("Could not sync.");

      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
          providers: [
            provideRouter([]),
            { provide: CachedFilesService, useValue: mockCachedFilesService },
            { provide: NotificationService, useValue: mockNotificationService },
          ],
        })
        .compileComponents();

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      syncError$.next(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        "Couldn't sync your recent files. Check your connection and try again later.",
      );
    });
  });

  describe("autosave error", () => {
    it("logs and shows an error notification, instead of failing silently, when autosave fails", async () => {
      // Spies on the real ChordproService rather than replacing it — a full
      // mock would also have to stand in for every other component in the
      // tree that reads from it (undo/redo state, editor content, ...).
      const autosaveError$ = new Subject<Error | null>();
      const mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
      const error = new Error('Could not save "song.cho" to your account.');

      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
          providers: [provideRouter([]), { provide: NotificationService, useValue: mockNotificationService }],
        })
        .compileComponents();

      const chordproService = TestBed.inject(ChordproService);
      vi.spyOn(chordproService, "getAutosaveError$").mockReturnValue(autosaveError$.asObservable());

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      autosaveError$.next(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        "Couldn't save your changes. Check your connection and try again later.",
      );
    });
  });
});
