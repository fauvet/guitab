import { TestBed } from "@angular/core/testing";
import { ActivatedRoute, convertToParamMap, provideRouter } from "@angular/router";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatIconTestingModule } from "@angular/material/icon/testing";
import { of, Subject } from "rxjs";
import { AppComponent } from "./app.component";
import { CachedFilesService } from "./services/cached-files/cached-files.service";
import { KeyboardShortcutService, FileActionOutcome } from "./services/keyboard-shortcut/keyboard-shortcut.service";
import { NotificationService } from "./services/notification/notification.service";
import { FileUtil } from "./utils/file.util";

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

  describe("opening a launched file", () => {
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
      const mockCachedFilesService = { saveFile: vi.fn() };
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

      expect(consumer).not.toBeNull();
      const fakeFileHandle = {} as unknown as FileSystemFileHandle;
      await consumer!({ files: [fakeFileHandle] });

      expect(mockCachedFilesService.saveFile).toHaveBeenCalledWith("{title: Test Song}");
    });

    it("logs and shows an error notification when syncing the opened file fails, instead of failing silently", async () => {
      const cacheError = new Error('Could not save "Test Song" to your account.');
      const mockCachedFilesService = { saveFile: vi.fn().mockRejectedValue(cacheError) };
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

      await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith(cacheError));
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        "Could not complete the file action. Please try again.",
      );
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

  describe("keyboard file action outcomes", () => {
    function configureWithKeyboardOutcome(outcome$: Subject<FileActionOutcome>) {
      const mockNotificationService = { showError: vi.fn(), showSuccess: vi.fn() };
      const mockKeyboardShortcutService = {
        initialize: vi.fn(),
        openLaunchedFiles: vi.fn(),
        getFileActionOutcome$: () => outcome$.asObservable(),
      };
      return { mockNotificationService, mockKeyboardShortcutService };
    }

    it("shows a success notification once a keyboard-triggered save resolves", async () => {
      const outcome$ = new Subject<FileActionOutcome>();
      const { mockNotificationService, mockKeyboardShortcutService } = configureWithKeyboardOutcome(outcome$);

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

      outcome$.next({ type: "saved", fileName: "song.cho" });

      expect(mockNotificationService.showSuccess).toHaveBeenCalledWith("song.cho saved");
    });

    it("logs and shows an error notification, instead of failing silently, when a keyboard-triggered action throws", async () => {
      const outcome$ = new Subject<FileActionOutcome>();
      const { mockNotificationService, mockKeyboardShortcutService } = configureWithKeyboardOutcome(outcome$);
      const error = new Error("Could not save.");

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

      outcome$.next({ type: "error", error });

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
    });
  });
});
