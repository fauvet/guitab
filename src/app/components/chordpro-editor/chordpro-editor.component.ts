import { Component, OnDestroy, OnInit } from "@angular/core";
// @ts-ignore
import * as ChordProjectEditor from "chordproject-editor";
import { Subject, takeUntil } from "rxjs";
import { AppContextService } from "../../services/app-context/app-context.service";
import { FileUtil } from "../../utils/file.util";

@Component({
  selector: "app-chordpro-editor",
  standalone: true,
  imports: [],
  templateUrl: "./chordpro-editor.component.html",
  styleUrl: "./chordpro-editor.component.css",
})
export class ChordproEditorComponent implements OnInit, OnDestroy {
  private unsubscribe = new Subject<void>();

  constructor(private appContextService: AppContextService) {
    this.appContextService
      .getFileHandle$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((fileHandle) => ChordproEditorComponent.onFileChanged(fileHandle));

    this.appContextService
      .getFile$()
      .pipe(takeUntil(this.unsubscribe))
      .subscribe((file) => ChordproEditorComponent.onFileChanged(file));
  }

  ngOnInit(): void {
    ChordProjectEditor.Main.init();
    this.listenEditorChanges();
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
  }

  private static getEditorContent(): string {
    const editorContent = ChordProjectEditor.Main.getEditor()?.getValue() ?? "";
    return editorContent;
  }

  private static async onFileChanged(fileHandle: null | File | FileSystemFileHandle): Promise<void> {
    const fileContent = await FileUtil.getFileContent(fileHandle);
    ChordProjectEditor.Main.run(fileContent);
  }

  listenEditorChanges(): void {
    const targetNode = document.getElementById("chordProjectEditor");
    if (!targetNode) return;

    const config = { attributes: true, childList: true, subtree: true };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          const chordproContent = ChordproEditorComponent.getEditorContent();
          this.appContextService.setChordproContent(chordproContent);
          break;
        }
      }
    });
    observer.observe(targetNode, config);
    this.unsubscribe.subscribe(() => observer.disconnect());
  }
}
