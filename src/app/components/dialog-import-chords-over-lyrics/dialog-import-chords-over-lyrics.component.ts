import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { AsyncPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from "@angular/material/dialog";
import { BehaviorSubject, Subject } from "rxjs";
import { debounceTime, takeUntil } from "rxjs/operators";
import { ChordsOverLyricsUtil } from "../../utils/chords-over-lyrics.util";
import { NotificationService } from "../../services/notification/notification.service";

@Component({
  selector: "app-dialog-import-chords-over-lyrics",
  imports: [
    AsyncPipe,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
  ],
  templateUrl: "./dialog-import-chords-over-lyrics.component.html",
  styleUrl: "./dialog-import-chords-over-lyrics.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogImportChordsOverLyricsComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<DialogImportChordsOverLyricsComponent>);
  private readonly notificationService = inject(NotificationService);
  private readonly unsubscribe$ = new Subject<void>();

  readonly input$ = new BehaviorSubject<string>("");
  readonly preview$ = new BehaviorSubject<string>("");

  ngOnInit(): void {
    this.input$.pipe(debounceTime(200), takeUntil(this.unsubscribe$)).subscribe((input) => {
      this.preview$.next(input.trim() ? ChordsOverLyricsUtil.convert(input) : "");
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
  }

  setInput(value: string): void {
    if (this.input$.getValue() === value) return;
    this.input$.next(value);
  }

  onCopyClicked(): void {
    const text = this.preview$.getValue();
    if (!text) return;

    navigator.clipboard.writeText(text).catch((error: unknown) => {
      console.error(error);
      this.notificationService.showError("Could not copy the result to the clipboard.");
    });
  }

  onInsertClicked(): void {
    const converted = this.preview$.getValue();
    if (converted) {
      this.dialogRef.close(converted);
    }
  }
}
