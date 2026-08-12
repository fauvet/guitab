import { ComponentFixture, TestBed } from "@angular/core/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BehaviorSubject } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { LoginComponent } from "./login.component";
import { AuthService } from "../../services/auth/auth.service";
import type { User } from "firebase/auth";

const anonymousUser = { uid: "anon-uid", isAnonymous: true, displayName: null, photoURL: null } as User;
const googleUser = { uid: "google-uid", isAnonymous: false, displayName: "Alice", photoURL: null } as User;

function buildMockAuthService(initialUser: User | null = null) {
  const user$ = new BehaviorSubject<User | null>(initialUser);
  return {
    getUser$: vi.fn().mockReturnValue(user$.asObservable()),
    isAnonymous: vi.fn().mockReturnValue(initialUser?.isAnonymous ?? true),
    signInWithGoogle: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    _user$: user$,
  };
}

describe("LoginComponent", () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: ReturnType<typeof buildMockAuthService>;

  beforeEach(async () => {
    mockAuthService = buildMockAuthService(null);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, NoopAnimationsModule],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
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

    it("resets isSigningIn and shows snack bar when sign-in fails", async () => {
      mockAuthService.signInWithGoogle.mockRejectedValueOnce(new Error("popup closed"));
      component.onSignIn();
      // Each await flushes one microtask cycle (.catch → .finally)
      await Promise.resolve();
      await Promise.resolve();
      expect(component.isSigningIn$.getValue()).toBe(false);
    });
  });

  describe("onSignOut()", () => {
    it("delegates to authService.signOut()", () => {
      component.onSignOut();
      expect(mockAuthService.signOut).toHaveBeenCalledTimes(1);
    });
  });
});
