import { AsyncPipe } from "@angular/common";
import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import _ from "lodash";
import { BehaviorSubject, debounceTime, generate } from "rxjs";
import { StringUtil } from "../../utils/string.util";

type HandyRow = {
  input: string;
  output: string[];
};

@Component({
  selector: "app-dialog-solo-tab-editor",
  standalone: true,
  imports: [
    AsyncPipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: "./dialog-solo-tab-editor.component.html",
  styleUrl: "./dialog-solo-tab-editor.component.css",
})
export class DialogSoloTabEditorComponent implements OnInit {
  @ViewChild("editor") editorRef!: ElementRef<HTMLTextAreaElement>;

  soloTab$ = new BehaviorSubject("e B G D A E\n|\n");
  generatedSoloTab$ = new BehaviorSubject("");
  handyRows$ = new BehaviorSubject(new Array<HandyRow>());

  ngOnInit(): void {
    this.soloTab$.pipe(debounceTime(200)).subscribe((soloTab) => this.onSoloTabChanged(soloTab));
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
    const lines = soloTab.split("\n").map((line) => line.trimEnd());
    const nbStrings = Math.max(...lines.map((line) => line.split(" ").length));
    const matrix = lines.map((line) => {
      const row: string[] = new Array(nbStrings);

      if (line === "|") {
        row.fill("|");
        return row;
      }

      row.fill("-");

      if (line === "..") {
        const index = Math.round(nbStrings / 2) - 1;
        row[index] = "•";
        row[index + 1] = "•";
        return row;
      }

      const stringValues = line.split(" ").map((stringValue) => (stringValue === "" ? "-" : stringValue));
      Object.assign(row, stringValues);

      const maxStringValueLength = Math.max(...stringValues.map((stringValue) => stringValue.length));
      return row.map((stringValue) => stringValue.padEnd(maxStringValueLength, "-"));
    });

    const uniqueHandyRows = _.range(lines.length)
      .map(
        (lineIndex) =>
          ({
            input: lines[lineIndex],
            output: matrix[lineIndex],
          }) as HandyRow,
      )
      .filter(
        (handyRow, lineIndex, handyRows) =>
          !handyRows
            .slice(0, lineIndex)
            .map((handyRow) => handyRow.input)
            .includes(handyRow.input),
      );
    this.setHandyRows(uniqueHandyRows);

    const generatedSoloTab = _.range(nbStrings)
      .map((stringIndex) => matrix.reduce((acc, row) => (acc += row[stringIndex]), ""))
      .join("\n");
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
}
