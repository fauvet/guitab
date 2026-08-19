import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { MatSnackBar } from "@angular/material/snack-bar";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { Subject } from "rxjs";
import { BottomSheetManageFileComponent } from "./bottom-sheet-manage-file.component";
import { CachedFilesService } from "../../services/cached-files/cached-files.service";
import CachedFile from "../../types/cached-file.type";

describe("BottomSheetManageFileComponent", () => {
  let component: BottomSheetManageFileComponent;
  let fixture: ComponentFixture<BottomSheetManageFileComponent>;
  let cachedFiles$: Subject<CachedFile[]>;
  let syncError$: Subject<boolean>;

  beforeEach(async () => {
    cachedFiles$ = new Subject<CachedFile[]>();
    syncError$ = new Subject<boolean>();
    await TestBed.configureTestingModule({
      imports: [BottomSheetManageFileComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MatBottomSheetRef,
          useValue: { dismiss: () => {}, afterDismissed: () => ({ subscribe: () => {} }) },
        },
        {
          provide: CachedFilesService,
          useValue: {
            getCachedFiles$: () => cachedFiles$.asObservable(),
            getSyncError$: () => syncError$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetManageFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("shows a snack bar when the cached files sync fails, instead of failing silently", () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const openSpy = vi.spyOn(snackBar, "open");

    syncError$.next(true);

    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("does not show a snack bar while the sync stays healthy", () => {
    const snackBar = TestBed.inject(MatSnackBar);
    const openSpy = vi.spyOn(snackBar, "open");

    syncError$.next(false);

    expect(openSpy).not.toHaveBeenCalled();
  });

  it("stops reacting to cachedFiles$ once destroyed, so the subscription does not leak", () => {
    const cachedFile: CachedFile = { name: "Song", chordproContent: "", date: new Date() };
    cachedFiles$.next([cachedFile]);
    expect(component.coveredCachedFiles$.getValue().length).toBe(1);

    component.ngOnDestroy();
    cachedFiles$.next([cachedFile, cachedFile]);

    expect(component.coveredCachedFiles$.getValue().length).toBe(1);
  });
});
