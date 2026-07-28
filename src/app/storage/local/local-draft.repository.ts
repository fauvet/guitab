import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { IDraftRepository, Draft, DEFAULT_DRAFT } from "../repositories/draft.repository";
import { LocalStorageService } from "../../services/local-storage/local-storage.service";

@Injectable({
  providedIn: "root",
})
export class LocalDraftRepository implements IDraftRepository {
  static readonly LOCAL_STORAGE_KEY = "DRAFT";

  private readonly localStorageService = inject(LocalStorageService);
  private readonly draft$ = this.localStorageService.buildBehaviorSubject<Draft>(
    LocalDraftRepository.LOCAL_STORAGE_KEY,
    DEFAULT_DRAFT,
  );

  getDraft$(): Observable<Draft> {
    return this.draft$.asObservable();
  }

  getDraft(): Draft {
    return this.draft$.getValue();
  }

  async saveDraft(draft: Draft): Promise<void> {
    this.draft$.next(draft);
  }
}
