import { Component, OnDestroy, OnInit } from "@angular/core";
// @ts-ignore
import * as ChordProjectEditor from "chordproject-editor";
import { Subject, takeUntil } from "rxjs";
import { AppContextService } from "../app-context.service";
import { FileUtil } from "../utils/file.util";

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
      .subscribe((fileHandle) => this.onFileHandleChanged(fileHandle));
  }

  ngOnInit(): void {
    ChordProjectEditor.Main.init();
  }

  ngOnDestroy(): void {
    this.unsubscribe.next();
  }

  async onFileHandleChanged(fileHandle: null | FileSystemFileHandle): Promise<void> {
    const fileContent = await FileUtil.getFileContent(fileHandle);
    ChordProjectEditor.Main.run(fileContent);
  }

  static getEditorContent(): string {
    const editorContent = ChordProjectEditor.Main.getEditor()?.getValue() ?? "";
    return editorContent;
  }
}
