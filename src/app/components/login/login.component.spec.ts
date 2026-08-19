import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BehaviorSubject } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { By } from "@angular/platform-browser";
import { MatTooltip } from "@angular/material/tooltip";
import { LoginComponent } from "./login.component";
import { AuthService } from "../../services/auth/auth.service";
import { NotificationService } from "../../services/notification/notification.service";
import type { User } from "firebase/auth";

const anonymousUser = { uid: "anon-uid", isAnonymous: true, displayName: null, photoURL: null } as User;
const googleUser = { uid: "google-uid", isAnonymous: false, displayName: "Alice", photoURL: null } as User;

function buildMockAuthService(initialUser: User | null = null) {
  const user$ = new BehaviorSubject<User | null>(initialUser);
  const signInError$ = new BehaviorSubject<Error | null>(null);
  return {
    getUser$: vi.fn().mockReturnValue(user$.asObservable()),
    getSignInError$: vi.fn().mockReturnValue(signInError$.asObservable()),
    isAnonymous: vi.fn().mockReturnValue(initialUser?.isAnonymous ?? true),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    _user$: user$,
    _signInError$: signInError$,
  };
}

describe("LoginComponent", () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: ReturnType<typeof buildMockAuthService>;
  let mockNotificationService: { showError: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuthService = buildMockAuthService(null);
    mockNotificationService = { showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("when user is anonymous", () => {
    beforeEach(() => {
      mockAuthService._user$.next(anonymousUser);
      mockAuthService.isAnonymous.mockReturnValue(true);
      fixture.detectChanges();
    });

    it("shows the sign-in button", () => {
      const btn = fixture.nativeElement.querySelector("button[aria-label='Sign in']");
      expect(btn).toBeTruthy();
    });

    it("does not show the sign-out button", () => {
      const buttons = fixture.nativeElement.querySelectorAll("button");
      const hasSignOutBtn = Array.from(buttons).some((b: any) => b.getAttribute("mattooltip")?.includes("sign out"));
      expect(hasSignOutBtn).toBe(false);
    });
  });

  describe("when user is authenticated with Google", () => {
    beforeEach(() => {
      mockAuthService._user$.next(googleUser);
      mockAuthService.isAnonymous.mockReturnValue(false);
      fixture.detectChanges(); // AsyncPipe marks the view for check; this renders it
    });

    it("shows the sign-out button with user display name in tooltip", () => {
      const btn = fixture.nativeElement.querySelector("button");
      expect(btn).toBeTruthy();
    });

    it("does not show the sign-in button", () => {
      const btn = fixture.nativeElement.querySelector("button[aria-label='Sign in']");
      expect(btn).toBeNull();
    });

    it("does not fall back to a placeholder when displayName is set", () => {
      const tooltip = fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);
      expect(tooltip.message).toBe("Signed in as Alice — click to sign out");
    });

    it("falls back to the email when displayName is null, instead of printing 'null'", () => {
      mockAuthService._user$.next({
        uid: "google-uid-2",
        isAnonymous: false,
        displayName: null,
        email: "alice@example.com",
        photoURL: null,
      } as User);
      fixture.detectChanges();

      const tooltip = fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);
      expect(tooltip.message).toBe("Signed in as alice@example.com — click to sign out");
    });

    it("falls back to a generic label when both displayName and email are null", () => {
      mockAuthService._user$.next({
        uid: "google-uid-3",
        isAnonymous: false,
        displayName: null,
        email: null,
        photoURL: null,
      } as User);
      fixture.detectChanges();

      const tooltip = fixture.debugElement.query(By.directive(MatTooltip)).injector.get(MatTooltip);
      expect(tooltip.message).toBe("Signed in as your account — click to sign out");
    });
  });

  describe("onSignIn()", () => {
    it("delegates to authService.signInWithGoogle()", () => {
      component.onSignIn();
      expect(mockAuthService.signInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it("sets isSigningIn to true while the popup is open", () => {
      let resolveSignIn!: () => void;
      mockAuthService.signInWithGoogle.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSignIn = resolve;
        }),
      );

      component.onSignIn();

      expect(component.isSigningIn$.getValue()).toBe(true);
      resolveSignIn();
    });

    it("resets isSigningIn to false after sign-in resolves", async () => {
      component.onSignIn();
      await fixture.whenStable();
      expect(component.isSigningIn$.getValue()).toBe(false);
    });

    it("does nothing if already signing in (prevents double-click)", () => {
      component.isSigningIn$.next(true);
      component.onSignIn();
      expect(mockAuthService.signInWithGoogle).not.toHaveBeenCalled();
    });

    it("resets isSigningIn and shows a notification when sign-in fails", async () => {
      mockAuthService.signInWithGoogle.mockRejectedValueOnce(new Error("popup closed"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      component.onSignIn();
      // Each await flushes one microtask cycle (.catch → .finally)
      await Promise.resolve();
      await Promise.resolve();
      expect(component.isSigningIn$.getValue()).toBe(false);
      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("onSignOut()", () => {
    it("delegates to authService.signOut()", () => {
      component.onSignOut();
      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
    });

    it("shows a notification and logs when sign-out fails", async () => {
      mockAuthService.signOut.mockRejectedValueOnce(new Error("network error"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      component.onSignOut();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("anonymous sign-in failure", () => {
    it("shows a notification and logs the real error when getSignInError$() emits one", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const signInError = new Error("network error");

      mockAuthService._signInError$.next(signInError);

      expect(mockNotificationService.showError).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(signInError);
    });

    it("does not notify while getSignInError$() stays null", () => {
      mockAuthService._signInError$.next(null);

      expect(mockNotificationService.showError).not.toHaveBeenCalled();
    });
  });
});
