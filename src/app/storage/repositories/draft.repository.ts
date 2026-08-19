import { Observable } from "rxjs";

export interface Draft {
  chordproContent: string;
  hasUnsavedChanges: boolean;
}

export const DEFAULT_DRAFT: Draft = {
  chordproContent: "",
  hasUnsavedChanges: false,
};

export interface IDraftRepository {
  getDraft$(): Observable<Draft>;
  getDraft(): Draft;
  saveDraft(draft: Draft): Promise<void>;
}
