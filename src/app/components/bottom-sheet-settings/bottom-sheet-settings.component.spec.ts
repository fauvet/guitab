import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MatBottomSheetRef } from "@angular/material/bottom-sheet";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { BehaviorSubject, of } from "rxjs";
import { AppContextService } from "../../services/app-context/app-context.service";
import { ChordproService } from "../../services/chordpro/chordpro.service";
import { NotificationService } from "../../services/notification/notification.service";
import { WakeLockService } from "../../services/wake-lock/wake-lock.service";
import { BottomSheetSettingsComponent } from "./bottom-sheet-settings.component";

const KEPT_AWAKE_TEXT = "Prevents device screens from dimming or locking";
const NOT_KEPT_AWAKE_TEXT = "The screen is not being kept awake";

/**
 * The wake lock item is the only one here that cannot read its own state off a
 * single flag: what the player asked for lives in `AppContextService`, whether
 * the browser actually granted it lives in `WakeLockService`, and the two
 * disagree whenever a request is refused or the system takes the lock back.
 * The three combinations below are what the item has to say in each case.
 */
describe("BottomSheetSettingsComponent", () => {
  let component: BottomSheetSettingsComponent;
  let fixture: ComponentFixture<BottomSheetSettingsComponent>;
  let isWakeLock$: BehaviorSubject<boolean>;
  let isKeptAwake$: BehaviorSubject<boolean>;
  let lastErrorMessage$: BehaviorSubject<string | null>;
  let isBluetoothKeptAlive$: BehaviorSubject<boolean>;
  let setWakeLock: ReturnType<typeof vi.fn>;
  let setBluetoothKeptAlive: ReturnType<typeof vi.fn>;
  let setLyricsDisplayed: ReturnType<typeof vi.fn>;
  let showSuccess: ReturnType<typeof vi.fn>;

  function renderedText(): string {
    return fixture.nativeElement.textContent as string;
  }

  function bluetoothIconText(): string {
    return (fixture.nativeElement.querySelectorAll("mat-icon")[2].textContent as string).trim();
  }

  beforeEach(async () => {
    isWakeLock$ = new BehaviorSubject<boolean>(false);
    isKeptAwake$ = new BehaviorSubject<boolean>(false);
    lastErrorMessage$ = new BehaviorSubject<string | null>(null);
    isBluetoothKeptAlive$ = new BehaviorSubject<boolean>(false);
    setWakeLock = vi.fn();
    setBluetoothKeptAlive = vi.fn();
    setLyricsDisplayed = vi.fn();
    showSuccess = vi.fn();

    await TestBed.configureTestingModule({
      imports: [BottomSheetSettingsComponent, NoopAnimationsModule],
      providers: [
        { provide: MatBottomSheetRef, useValue: { dismiss: vi.fn(), afterDismissed: () => of(undefined) } },
        {
          provide: AppContextService,
          useValue: {
            getIsWakeLock$: () => isWakeLock$.asObservable(),
            isWakeLock: () => isWakeLock$.getValue(),
            setWakeLock,
            getIsBluetoothKeptAlive$: () => isBluetoothKeptAlive$.asObservable(),
            isBluetoothKeptAlive: () => isBluetoothKeptAlive$.getValue(),
            setBluetoothKeptAlive,
          },
        },
        {
          provide: WakeLockService,
          useValue: {
            getIsKeptAwake$: () => isKeptAwake$.asObservable(),
            getLastErrorMessage$: () => lastErrorMessage$.asObservable(),
          },
        },
        {
          provide: ChordproService,
          useValue: {
            getAreLyricsDisplayed$: () => of(true),
            areLyricsDisplayed: () => true,
            setLyricsDisplayed,
            requestEditorFocus: vi.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: { showSuccess, showError: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomSheetSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("the wake lock item", () => {
    it("should describe what the setting does while it is switched off", () => {
      expect(renderedText()).toContain(KEPT_AWAKE_TEXT);
      expect(renderedText()).not.toContain(NOT_KEPT_AWAKE_TEXT);
    });

    it("should describe what the setting does while the lock is held", () => {
      isWakeLock$.next(true);
      isKeptAwake$.next(true);
      fixture.detectChanges();

      expect(renderedText()).toContain(KEPT_AWAKE_TEXT);
      expect(renderedText()).not.toContain(NOT_KEPT_AWAKE_TEXT);
    });

    it("should say the screen is not being kept awake when the setting is on and no lock is held", () => {
      isWakeLock$.next(true);
      fixture.detectChanges();

      expect(renderedText()).toContain(NOT_KEPT_AWAKE_TEXT);
    });

    it("should stop saying it once the lock is finally taken", () => {
      isWakeLock$.next(true);
      fixture.detectChanges();
      isKeptAwake$.next(true);
      fixture.detectChanges();

      expect(renderedText()).not.toContain(NOT_KEPT_AWAKE_TEXT);
    });

    it("should remain switchable off after a refusal", () => {
      isWakeLock$.next(true);
      fixture.detectChanges();

      component.onItemWakeLockClicked();

      expect(setWakeLock).toHaveBeenCalledWith(false);
    });

    it("should show the reason inline once the request is refused, instead of failing silently", () => {
      lastErrorMessage$.next("Could not keep the screen awake.");
      fixture.detectChanges();

      expect(renderedText()).toContain("Could not keep the screen awake.");
    });

    it("should say nothing once the request eventually succeeds", () => {
      lastErrorMessage$.next("Could not keep the screen awake.");
      fixture.detectChanges();

      lastErrorMessage$.next(null);
      fixture.detectChanges();

      expect(renderedText()).not.toContain("Could not keep the screen awake.");
    });
  });

  describe("the bluetooth item", () => {
    it("should show the off icon while the setting is switched off", () => {
      expect(bluetoothIconText()).toBe("media_bluetooth_off");
    });

    it("should show the on icon once the setting is switched on", () => {
      isBluetoothKeptAlive$.next(true);
      fixture.detectChanges();

      expect(bluetoothIconText()).toBe("media_bluetooth_on");
    });
  });

  describe("toggle notifications", () => {
    it("should notify when lyrics are shown", () => {
      component.onItemShowLyricsClicked();

      expect(showSuccess).toHaveBeenCalledWith("Lyrics hidden.");
    });

    it("should notify when wake lock is enabled", () => {
      component.onItemWakeLockClicked();

      expect(showSuccess).toHaveBeenCalledWith("Wake lock enabled.");
    });

    it("should notify when wake lock is disabled", () => {
      isWakeLock$.next(true);

      component.onItemWakeLockClicked();

      expect(showSuccess).toHaveBeenCalledWith("Wake lock disabled.");
    });

    it("should notify when bluetooth keep-alive is enabled", () => {
      component.onItemKeepBluetoothAliveClicked();

      expect(showSuccess).toHaveBeenCalledWith("Bluetooth keep-alive enabled.");
    });

    it("should notify when bluetooth keep-alive is disabled", () => {
      isBluetoothKeptAlive$.next(true);

      component.onItemKeepBluetoothAliveClicked();

      expect(showSuccess).toHaveBeenCalledWith("Bluetooth keep-alive disabled.");
    });
  });
});
