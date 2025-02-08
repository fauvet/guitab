import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { FileUtil } from "../../utils/file.util";
import { AppContextService } from "../app-context/app-context.service";
// @ts-ignore
import * as ChordProjectEditor from "chordproject-editor";
import { StringUtil } from "../../utils/string.util";
import ChordproSaveState, { areChordproSaveStatesEquals } from "../../types/chordpro-save-state.type";
import { ChordproUtil } from "../../utils/chordpro.util";

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
  private readonly youTubeUrl$ = new BehaviorSubject<string>("");
  private readonly chordproCaretPositionIndex$ = new BehaviorSubject<number>(0);
  private readonly chordproSaveState$ = new BehaviorSubject<ChordproSaveState>(this.buildChordproSaveState());
  private readonly areLyricsDisplayed$ = new BehaviorSubject<boolean>(true);
  private readonly hasEditorUndo$ = new BehaviorSubject<boolean>(false);
  private readonly hasEditorRedo$ = new BehaviorSubject<boolean>(false);
  private readonly isRemovableChordEnabled$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.appContextService.getFileHandle$().subscribe((fileHandle) => this.onFileChanged(fileHandle));
    this.chordproContent$.subscribe((chordproContent) => this.onChordproContentChanged(chordproContent));
  }

  get editor() {
    return ChordProjectEditor.Main.getEditor();
  }

  private async onFileChanged(fileHandle: null | File | FileSystemFileHandle): Promise<void> {
    const fileContent = await FileUtil.getFileContent(fileHandle);
    this.setChordproContent(fileContent ?? "");
    this.resetHistoryState();
    this.updateChordproSaveState();
  }

  private onChordproContentChanged(chordproContent: string): void {
    if (!this.editor) return;

    this.updateHistoryState();
    const youTubeUrl = this.parseMetaYouTube(chordproContent);
    this.setYouTubeUrl(youTubeUrl);

    const editorContent = this.getEditorContent();
    if (editorContent == chordproContent) return;

    const cursorPosition = this.editor.getCursorPosition();
    this.editor.setValue(chordproContent);
    this.editor.clearSelection();
    this.editor.moveCursorToPosition(cursorPosition);
  }

  private parseMetaYouTube(chordproContent: string): string {
    const metaYouTubePrefix = "{meta:youtube ";
    const metaYouTubeIndex = chordproContent.indexOf(metaYouTubePrefix);
    if (metaYouTubeIndex === -1) return "";

    const endOfLineFound = chordproContent.indexOf("\n", metaYouTubeIndex);
    const endOfLineIndex = endOfLineFound === -1 ? chordproContent.length : endOfLineFound;
    const line = chordproContent.slice(metaYouTubeIndex, endOfLineIndex).trim();

    const metaYouTubeSuffix = "}";
    if (!line.endsWith(metaYouTubeSuffix)) return "";

    const youTubeUrl = line.replace(metaYouTubePrefix, "").replace(metaYouTubeSuffix, "").trim();
    return youTubeUrl;
  }

  private buildChordproSaveState(): ChordproSaveState {
    return {
      fileHandle: this.appContextService.getFileHandle(),
      chordproContent: this.getChordproContent(),
    };
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

  getYouTubeUrl$(): Observable<string> {
    return this.youTubeUrl$.asObservable();
  }

  getYouTubeUrl(): string {
    return this.youTubeUrl$.getValue();
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

  hasUnsavedChanges(): boolean {
    const chordproSaveState = this.getChordproSaveState();
    const newChordproSaveState = this.buildChordproSaveState();
    return !areChordproSaveStatesEquals(chordproSaveState, newChordproSaveState);
  }

  private hasEditorUndo(): boolean {
    return this.hasEditorUndo$.getValue();
  }

  private hasEditorRedo(): boolean {
    return this.hasEditorRedo$.getValue();
  }

  private getChordproSaveState(): ChordproSaveState {
    return this.chordproSaveState$.getValue();
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

  private setYouTubeUrl(youTubeUrl: string): void {
    if (youTubeUrl == this.getYouTubeUrl()) return;
    this.youTubeUrl$.next(youTubeUrl);
  }

  private setChordproSaveState(chordproSaveState: ChordproSaveState): void {
    if (chordproSaveState === this.getChordproSaveState()) return;
    this.chordproSaveState$.next(chordproSaveState);
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
      const chordproCaretPositionIndex = ChordproUtil.findIndexFromCoordinates(
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

  updateChordproSaveState(): void {
    const chordproSaveState = this.buildChordproSaveState();
    this.setChordproSaveState(chordproSaveState);
  }

  undoContent(): void {
    this.editor.getSession().getUndoManager().undo();
    this.editor.clearSelection();
  }

  redoContent(): void {
    this.editor.getSession().getUndoManager().redo();
    this.editor.clearSelection();
  }

  insertDirectiveMetaYouTube(): void {
    this.insertDirective("meta:youtube", false);
  }

  insertDirectiveComment(): void {
    this.insertDirective("comment:", false);
  }

  insertDirectiveTab(): void {
    this.insertDirective("tab");
  }

  insertDirectiveVerse(): void {
    this.insertDirective("verse");
  }

  insertDirectiveChorus(): void {
    this.insertDirective("chorus");
  }

  insertDirectiveBridge(): void {
    this.insertDirective("bridge");
  }

  insertUnsecableSpace(): void {
    this.insertContentAtCurrentCaret(" ");
  }

  insertChord(chordName: string): void {
    const newText = `[${chordName}]`;
    this.insertContentAtCurrentCaret(newText);
  }

  removeChord(): void {
    const chordproContent = this.getChordproContent();
    const removableChordPosition = this.findRemovableChordPosition(chordproContent);
    if (removableChordPosition == null) return;

    const chordproContentFirstHalf = chordproContent.slice(0, removableChordPosition.openSquareBracketIndex);
    const newChordproContent =
      chordproContentFirstHalf +
      chordproContent.slice(removableChordPosition.closeSquareBracketIndex + 1, chordproContent.length);

    const closeSquareBracketLastIndex = chordproContentFirstHalf.lastIndexOf("]");
    const newCursorPosition =
      closeSquareBracketLastIndex != -1
        ? ChordproUtil.findCoordinatesFromIndex(newChordproContent, closeSquareBracketLastIndex)
        : ChordproUtil.findCoordinatesFromIndex(newChordproContent, removableChordPosition.openSquareBracketIndex);
    if (closeSquareBracketLastIndex != -1) newCursorPosition.column++;

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

  private insertContentAtCurrentCaret(content: string): void {
    const chordproCaretPositionIndex = this.getChordproCaretPositionIndex();
    const chordproContent = this.getChordproContent();
    const trueCaretPositionIndex = Math.min(chordproContent.length, chordproCaretPositionIndex);
    const newCursorPosition = structuredClone(this.editor.getCursorPosition());
    newCursorPosition.column += content.length;
    const newChordproContent =
      chordproContent.slice(0, trueCaretPositionIndex) + content + chordproContent.slice(trueCaretPositionIndex);

    this.setChordproContent(newChordproContent);
    this.editor.moveCursorToPosition(newCursorPosition);
  }

  private insertDirective(directiveName: string, isPair = true) {
    const directiveStart = isPair ? `{start_of_${directiveName}}\n` : `{${directiveName} `;
    const directiveEnd = isPair ? `\n{end_of_${directiveName}}` : "}";
    const selectionRange = this.editor.getSelectionRange();

    if (selectionRange.isEmpty()) {
      const newCursorPosition = structuredClone(this.editor.getCursorPosition());
      newCursorPosition.row += isPair ? 1 : 0;
      newCursorPosition.column = isPair ? 0 : newCursorPosition.column + directiveStart.length;
      console.debug({ newCursorPosition });
      this.insertContentAtCurrentCaret(directiveStart + directiveEnd);
      this.editor.moveCursorToPosition(newCursorPosition);
      return;
    }

    const selectionRangeStart = selectionRange.start;
    this.editor.moveCursorToPosition(selectionRangeStart);
    this.insertContentAtCurrentCaret(directiveStart);

    const selectionRangeEnd = selectionRange.end;
    selectionRangeEnd.row += isPair ? 1 : 0;
    selectionRangeEnd.column = isPair ? selectionRangeEnd.column : Number.MAX_SAFE_INTEGER;
    this.editor.moveCursorToPosition(selectionRangeEnd);
    this.insertContentAtCurrentCaret(directiveEnd);

    if (isPair) return;

    const newCursorPosition = structuredClone(this.editor.getCursorPosition());
    newCursorPosition.column -= 1;
    console.log({ newCursorPosition });
    this.editor.moveCursorToPosition(newCursorPosition);
  }
}
