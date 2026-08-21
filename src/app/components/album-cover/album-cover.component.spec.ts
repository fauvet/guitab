import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClient } from "@angular/common/http";
import { of, throwError } from "rxjs";
import { AlbumCoverComponent } from "./album-cover.component";
import { ChordproService } from "../../services/chordpro/chordpro.service";

const DEFAULT_ALBUM_COVER = "https://upload.wikimedia.org/wikipedia/commons/3/3c/No-album-art.png?20160131100336";

describe("AlbumCoverComponent", () => {
  let component: AlbumCoverComponent;
  let fixture: ComponentFixture<AlbumCoverComponent>;
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };
  let mockChordproService: { parseTitle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockHttpClient = { get: vi.fn().mockReturnValue(of({})) };
    mockChordproService = { parseTitle: vi.fn().mockReturnValue(null) };

    await TestBed.configureTestingModule({
      imports: [AlbumCoverComponent],
      providers: [
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: ChordproService, useValue: mockChordproService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlbumCoverComponent);
    component = fixture.componentInstance;
  });

  function setContentAndInit(content: string): void {
    fixture.componentRef.setInput("chordproContent", content);
    fixture.detectChanges();
  }

  it("starts with the default cover", () => {
    setContentAndInit("no title here");
    expect(component.coverUrl$.getValue()).toBe(DEFAULT_ALBUM_COVER);
  });

  it("does not call the lookup API when the content has no title", () => {
    setContentAndInit("no title here");
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });

  it("looks up the cover by title and switches to it once found", () => {
    mockChordproService.parseTitle.mockReturnValue("Hotel California");
    mockHttpClient.get.mockReturnValue(of({ data: [{ album: { cover_small: "https://cover.example/1.jpg" } }] }));

    setContentAndInit("{title: Hotel California}");

    expect(mockHttpClient.get).toHaveBeenCalledWith("https://api.lyrics.ovh/suggest/Hotel%20California");
    expect(component.coverUrl$.getValue()).toBe("https://cover.example/1.jpg");
  });

  it("keeps the default cover when the lookup returns no album art", () => {
    mockChordproService.parseTitle.mockReturnValue("Hotel California");
    mockHttpClient.get.mockReturnValue(of({ data: [] }));

    setContentAndInit("{title: Hotel California}");

    expect(component.coverUrl$.getValue()).toBe(DEFAULT_ALBUM_COVER);
  });

  it("logs rather than failing silently when the lookup fails, keeping the default cover", () => {
    mockChordproService.parseTitle.mockReturnValue("Hotel California");
    mockHttpClient.get.mockReturnValue(throwError(() => new Error("network error")));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    setContentAndInit("{title: Hotel California}");

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(component.coverUrl$.getValue()).toBe(DEFAULT_ALBUM_COVER);
  });
});
