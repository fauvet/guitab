import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { StringUtil } from "../../utils/string.util";

/** Only the members read below; the API returns a great deal more. */
interface LyricsSuggestResponse {
  data?: { album?: { cover_small?: string } }[];
}

@Component({
  selector: "app-album-cover",
  imports: [AsyncPipe],
  templateUrl: "./album-cover.component.html",
  styleUrl: "./album-cover.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumCoverComponent implements OnInit {
  private static readonly DEFAULT_ALBUM_COVER =
    "https://upload.wikimedia.org/wikipedia/commons/3/3c/No-album-art.png?20160131100336";

  @Input({ required: true }) chordproContent = "";

  private readonly http = inject(HttpClient);
  private readonly chordproService = inject(ChordproService);

  coverUrl$ = new BehaviorSubject<string>(AlbumCoverComponent.DEFAULT_ALBUM_COVER);

  ngOnInit(): void {
    const title = this.chordproService.parseTitle(this.chordproContent);
    if (!title) return;

    const encodedTitleWithoutAccents = encodeURIComponent(StringUtil.stripDiacritics(title));
    this.http.get<LyricsSuggestResponse>(`https://api.lyrics.ovh/suggest/${encodedTitleWithoutAccents}`).subscribe({
      next: (res) => {
        const coverUrl = res?.data?.[0]?.album?.cover_small;
        if (coverUrl) this.coverUrl$.next(coverUrl);
      },
      // The default cover already covers the user — this is a cosmetic lookup,
      // not an action to interrupt with a notification.
      error: (error: unknown) => console.error(error),
    });
  }
}
