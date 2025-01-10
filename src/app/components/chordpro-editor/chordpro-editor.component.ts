import { Component, inject, OnDestroy, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { ChordproService } from "../../services/chordpro/chordpro.service";

@Component({
  selector: "app-chordpro-editor",
  standalone: true,
  imports: [],
  templateUrl: "./chordpro-editor.component.html",
  styleUrl: "./chordpro-editor.component.css",
})
export class ChordproEditorComponent implements OnInit, OnDestroy {
  private readonly chordproService = inject(ChordproService);

  private unsubscribe = new Subject<void>();

  ngOnInit(): void {
    document.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    this.chordproService.initialize();
    this.listenEditorChanges();
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
  }

  listenEditorChanges(): void {
    const targetNode = document.getElementById("chordProjectEditor");
    if (!targetNode) return;

    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          this.chordproService.updateChordproContent();
          break;
        }
      }
    });
    observer.observe(targetNode, config);
    this.unsubscribe.subscribe(() => observer.disconnect());
  }
}
