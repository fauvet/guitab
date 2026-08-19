import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatIconTestingModule } from "@angular/material/icon/testing";
import { AppComponent } from "./app.component";
import { CachedFilesService } from "./services/cached-files/cached-files.service";
import { FileUtil } from "./utils/file.util";

type FakeLaunchConsumer = (launchParams: { files: FileSystemFileHandle[] }) => Promise<void>;

describe("AppComponent", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule, MatIconTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it("should create the app", () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  describe("handleLaunchQueue", () => {
    const originalLaunchQueue = (window as { launchQueue?: unknown }).launchQueue;

    afterEach(() => {
      (window as { launchQueue?: unknown }).launchQueue = originalLaunchQueue;
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
  });
});
