import { AsyncPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import _ from "lodash";
import { BehaviorSubject, Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";
import { StringUtil } from "../../utils/string.util";
import { HandyRow, SoloTabUtil } from "../../utils/solo-tab.util";
import { PitchMonitorComponent } from "../pitch-monitor/pitch-monitor.component";
import { NotificationService } from "../../services/notification/notification.service";

@Component({
  selector: "app-dialog-solo-tab-editor",
  imports: [
    AsyncPipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PitchMonitorComponent,
  ],
  templateUrl: "./dialog-solo-tab-editor.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: "./dialog-solo-tab-editor.component.css",
})
export class DialogSoloTabEditorComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<DialogSoloTabEditorComponent>);
  private readonly notificationService = inject(NotificationService);
  private readonly unsubscribe$ = new Subject<void>();

  @ViewChild("editor") editorRef!: ElementRef<HTMLTextAreaElement>;

  soloTab$ = new BehaviorSubject("e B G D A E\n|\n");
  isHumming$ = new BehaviorSubject(false);
  generatedSoloTab$ = new BehaviorSubject("");
  handyRows$ = new BehaviorSubject(new Array<HandyRow>());

  ngOnInit(): void {
    this.soloTab$
      .pipe(debounceTime(200), takeUntil(this.unsubscribe$))
      .subscribe((soloTab) => this.onSoloTabChanged(soloTab));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  private getSoloTab(): string {
    return this.soloTab$.getValue();
  }

  private getGeneratedSoloTab(): string {
    return this.generatedSoloTab$.getValue();
  }

  private getHandyRows(): HandyRow[] {
    return this.handyRows$.getValue();
  }

  setSoloTab(soloTab: string): void {
    if (this.getSoloTab() === soloTab) return;
    this.soloTab$.next(soloTab);
  }

  setGeneratedSoloTab(generatedSoloTab: string): void {
    if (this.getGeneratedSoloTab() === generatedSoloTab) return;
    this.generatedSoloTab$.next(generatedSoloTab);
  }

  setHandyRows(handyRows: HandyRow[]): void {
    if (_.isEqual(this.getHandyRows(), handyRows)) return;
    this.handyRows$.next(handyRows);
  }

  onSoloTabChanged(soloTab: string): void {
    const { generatedSoloTab, handyRows } = SoloTabUtil.convert(soloTab);
    this.setHandyRows(handyRows);
    this.setGeneratedSoloTab(generatedSoloTab);
  }

  onButtonHandyRowClicked(handyRow: HandyRow) {
    const editor = this.editorRef.nativeElement;
    const cursorIndex = editor.selectionStart;

    const soloTab = this.getSoloTab();
    const newSoloTab = StringUtil.insert(soloTab, handyRow.input + "\n\n", cursorIndex);
    this.setSoloTab(newSoloTab);

    const newCursorPos = cursorIndex + handyRow.input.length + 2;
    editor.selectionStart = editor.selectionEnd = newCursorPos;
    editor.focus();
  }

  onToggleHummingClicked(): void {
    this.isHumming$.next(!this.isHumming$.getValue());
  }

  /**
   * Appends what was hummed rather than replacing the editor's contents: a
   * player builds a solo in passes, and a transcription that wiped the previous
   * take would make the second pass cost the first one.
   */
  onTranscribed(lines: string): void {
    if (!lines) return;

    const soloTab = this.getSoloTab();
    const separator = soloTab.endsWith("\n") || soloTab === "" ? "" : "\n";
    this.setSoloTab(soloTab + separator + lines + "\n");
  }

  onCopyClicked(): void {
    const text = this.generatedSoloTab$.getValue();
    if (!text) return;

    navigator.clipboard.writeText(text).catch((error: unknown) => {
      console.error(error);
      this.notificationService.showError("Could not copy the tab to the clipboard.");
    });
  }

  onInsertClicked(): void {
    const text = this.generatedSoloTab$.getValue();
    if (text) {
      this.dialogRef.close(text);
    }
  }
}
