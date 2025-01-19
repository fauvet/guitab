import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { FileUtil } from "../../utils/file.util";
import { AppContextService } from "../app-context/app-context.service";
// @ts-ignore
import * as ChordProjectEditor from "chordproject-editor";
import { StringUtil } from "../../utils/string.util";

type RemovableChordPosition = {
  openSquareBracketIndex: number;
  closeSquareBracketIndex: number;
};

@Injectable({
  providedIn: "root",
})
export class ChordproService {
  static readonly NB_CHARS_LOOK_ARROUND = 10;

  private readonly appContextService = inject(AppContextService);

  private readonly chordproContent$ = new BehaviorSubject<string>("");
  private readonly chordproCaretPositionIndex$ = new BehaviorSubject<number>(0);
  private readonly areLyricsDisplayed$ = new BehaviorSubject<boolean>(true);
  private readonly hasEditorUndo$ = new BehaviorSubject<boolean>(false);
  private readonly hasEditorRedo$ = new BehaviorSubject<boolean>(false);
  private readonly isRemovableChordEnabled$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.appContextService.getFileHandle$().subscribe((fileHandle) => this.onFileChanged(fileHandle));
    this.appContextService.getFile$().subscribe((file) => this.onFileChanged(file));
    this.chordproContent$.subscribe((chordproContent) => this.onChordproContentChanged(chordproContent));
  }

  get editor() {
    return ChordProjectEditor.Main.getEditor();
  }

  private async onFileChanged(fileHandle: null | File | FileSystemFileHandle): Promise<void> {
    const fileContent = await FileUtil.getFileContent(fileHandle);
    this.setChordproContent(fileContent ?? "");
    this.resetHistoryState();
  }

  private onChordproContentChanged(chordproContent: string): void {
    if (!this.editor) return;

    this.updateHistoryState();
    const editorContent = this.getEditorContent();
    if (editorContent == chordproContent) return;

    const cursorPosition = this.editor.getCursorPosition();
    this.editor.setValue(chordproContent);
    this.editor.clearSelection();
    this.editor.moveCursorToPosition(cursorPosition);
  }

  private getEditorContent(): string {
    return this.editor?.getValue() ?? "";
  }

  getChordproContent$(): Observable<string> {
    return this.chordproContent$.asObservable();
  }

  getChordproContent(): string {
    return this.chordproContent$.getValue();
  }

  getChordproCaretPositionIndex$(): Observable<number> {
    return this.chordproCaretPositionIndex$.asObservable();
  }

  getChordproCaretPositionIndex(): number {
    return this.chordproCaretPositionIndex$.getValue();
  }

  getAreLyricsDisplayed$(): Observable<boolean> {
    return this.areLyricsDisplayed$.asObservable();
  }

  getHasEditorUndo(): boolean {
    return this.hasEditorUndo$.getValue();
  }

  getHasEditorUndo$(): Observable<boolean> {
    return this.hasEditorUndo$.asObservable();
  }

  getHasEditorRedo$(): Observable<boolean> {
    return this.hasEditorRedo$.asObservable();
  }

  getIsRemovableChordEnabled$(): Observable<boolean> {
    return this.isRemovableChordEnabled$.asObservable();
  }

  private hasEditorUndo(): boolean {
    return this.hasEditorUndo$.getValue();
  }

  private hasEditorRedo(): boolean {
    return this.hasEditorRedo$.getValue();
  }

  private isRemovableChordEnabled(): boolean {
    return this.isRemovableChordEnabled$.getValue();
  }

  areLyricsDisplayed(): boolean {
    return this.areLyricsDisplayed$.getValue();
  }

  setLyricsDisplayed(areLyricsDisplayed: boolean): void {
    if (areLyricsDisplayed == this.areLyricsDisplayed()) return;
    this.areLyricsDisplayed$.next(areLyricsDisplayed);
  }

  private setEditorUndo(hasEditorUndo: boolean): void {
    if (hasEditorUndo == this.hasEditorUndo()) return;
    this.hasEditorUndo$.next(hasEditorUndo);
  }

  private setEditorRedo(hasEditorRedo: boolean): void {
    if (hasEditorRedo == this.hasEditorRedo()) return;
    this.hasEditorRedo$.next(hasEditorRedo);
  }

  private setRemovableChordEnabled(isRemovableChordEnabled: boolean): void {
    if (isRemovableChordEnabled == this.isRemovableChordEnabled()) return;
    this.isRemovableChordEnabled$.next(isRemovableChordEnabled);
  }

  private setChordproContent(chordproContent: string): void {
    if (chordproContent == this.getChordproContent()) return;
    this.chordproContent$.next(chordproContent);
  }

  setChordproCaretPositionIndex(chordproCaretPositionIndex: number): void {
    if (chordproCaretPositionIndex == this.getChordproCaretPositionIndex()) return;
    this.chordproCaretPositionIndex$.next(chordproCaretPositionIndex);
  }

  initialize(): void {
    ChordProjectEditor.Main.init();
    this.listenCursorChanges();
  }

  listenCursorChanges(): void {
    this.editor.session.selection.on("changeCursor", () => {
      const cursorPosition = this.editor.getCursorPosition();
      const chordproContent = this.getChordproContent();
      const chordproCaretPositionIndex = StringUtil.findIndexFromCoordinates(
        chordproContent,
        cursorPosition.row,
        cursorPosition.column,
      );
      this.setChordproCaretPositionIndex(chordproCaretPositionIndex);

      const removableChordPosition = this.findRemovableChordPosition(chordproContent);
      this.setRemovableChordEnabled(removableChordPosition != null);
    });
  }

  updateChordproContent(): void {
    const editorContent = this.getEditorContent();
    this.setChordproContent(editorContent);
  }

  updateHistoryState(): void {
    const undoManager = this.editor.getSession().getUndoManager();
    const hasUndo = undoManager.hasUndo();
    const hasRedo = undoManager.hasRedo();
    this.setEditorUndo(hasUndo);
    this.setEditorRedo(hasRedo);
  }

  undoContent(): void {
    this.editor.getSession().getUndoManager().undo();
    this.editor.clearSelection();
  }

  redoContent(): void {
    this.editor.getSession().getUndoManager().redo();
    this.editor.clearSelection();
  }

  addChord(chordName: string): void {
    const chordproCaretPositionIndex = this.getChordproCaretPositionIndex();
    const chordproContent = this.getChordproContent();
    const trueCaretPositionIndex = Math.min(chordproContent.length, chordproCaretPositionIndex);
    const newText = `[${chordName}]`;
    const newCursorPosition = structuredClone(this.editor.getCursorPosition());
    newCursorPosition.column += newText.length;
    const newChordproContent =
      chordproContent.slice(0, trueCaretPositionIndex) + newText + chordproContent.slice(trueCaretPositionIndex);

    this.setChordproContent(newChordproContent);
    this.editor.moveCursorToPosition(newCursorPosition);
  }

  removeChord(): void {
    const chordproContent = this.getChordproContent();
    const removableChordPosition = this.findRemovableChordPosition(chordproContent);
    if (removableChordPosition == null) return;

    const newChordproContent =
      chordproContent.slice(0, removableChordPosition.openSquareBracketIndex) +
      chordproContent.slice(removableChordPosition.closeSquareBracketIndex + 1, chordproContent.length);
    const deletedLength = newChordproContent.length - chordproContent.length;
    const newCursorPosition = structuredClone(this.editor.getCursorPosition());
    newCursorPosition.column += deletedLength;

    this.setChordproContent(newChordproContent);
    this.editor.moveCursorToPosition(newCursorPosition);
  }

  private findRemovableChordPosition(chordproContent: string): RemovableChordPosition | null {
    const chordproCaretPositionIndex = this.getChordproCaretPositionIndex();
    const openSquareBracketIndex = StringUtil.findFirst(
      chordproContent,
      chordproCaretPositionIndex - 1,
      "[",
      ChordproService.NB_CHARS_LOOK_ARROUND,
      false,
    );
    let closeSquareBracketIndex = StringUtil.findFirst(
      chordproContent,
      chordproCaretPositionIndex - 1,
      "]",
      ChordproService.NB_CHARS_LOOK_ARROUND,
      false,
    );
    if (
      openSquareBracketIndex == -1 ||
      (closeSquareBracketIndex > openSquareBracketIndex && closeSquareBracketIndex != chordproCaretPositionIndex - 1)
    )
      return null;

    closeSquareBracketIndex = StringUtil.findFirst(
      chordproContent,
      chordproCaretPositionIndex - 1,
      "]",
      ChordproService.NB_CHARS_LOOK_ARROUND,
      true,
    );
    return { openSquareBracketIndex, closeSquareBracketIndex };
  }

  private resetHistoryState(): void {
    this.editor.getSession().getUndoManager().reset();
    this.setEditorUndo(false);
    this.setEditorRedo(false);
  }
}
