import { TestBed } from "@angular/core/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "./auth.service";
import { FirebaseService } from "../firebase/firebase.service";
import { PlatformService } from "../platform/platform.service";

// vi.hoisted() ensures these are accessible inside the vi.mock() factory,
// which is statically hoisted to the top of the file before any imports.
const { authCallbacks, mockAuth } = vi.hoisted(() => ({
  authCallbacks: { callback: null as ((user: unknown) => void) | null },
  mockAuth: { currentUser: null as unknown },
}));

const { nativeSignInWithGoogle, nativeSignOut } = vi.hoisted(() => ({
  nativeSignInWithGoogle: vi.fn(),
  nativeSignOut: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => mockAuth),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    authCallbacks.callback = callback;
    return vi.fn();
  }),
  signInAnonymously: vi.fn().mockResolvedValue({}),
  signInWithPopup: vi.fn().mockResolvedValue({}),
  signInWithCredential: vi.fn().mockResolvedValue({}),
  linkWithPopup: vi.fn().mockResolvedValue({}),
  linkWithCredential: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: Object.assign(vi.fn(), { credential: vi.fn(() => ({ providerId: "google.com" })) }),
}));

vi.mock("@capacitor-firebase/authentication", () => ({
  FirebaseAuthentication: { signInWithGoogle: nativeSignInWithGoogle, signOut: nativeSignOut },
}));

const mockFirebaseService = { getApp: vi.fn().mockReturnValue({}) };

describe("AuthService", () => {
  let service: AuthService;
  let mockPlatformService: { isNative: ReturnType<typeof vi.fn> };

  const buildService = (): AuthService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: PlatformService, useValue: mockPlatformService },
      ],
    });
    return TestBed.inject(AuthService);
  };

  beforeEach(() => {
    authCallbacks.callback = null;
    mockAuth.currentUser = null;
    vi.clearAllMocks();

    nativeSignInWithGoogle.mockResolvedValue({ credential: { idToken: "id-token" } });
    nativeSignOut.mockResolvedValue(undefined);
    mockPlatformService = { isNative: vi.fn().mockReturnValue(false) };

    service = buildService();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("signs in anonymously when onAuthStateChanged reports no session", async () => {
    const { signInAnonymously } = await import("firebase/auth");
    authCallbacks.callback?.(null);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("reports a sign-in error when anonymous sign-in rejects", async () => {
    const { signInAnonymously } = await import("firebase/auth");
    const rejection = new Error("network error");
    (signInAnonymously as ReturnType<typeof vi.fn>).mockRejectedValueOnce(rejection);
    vi.spyOn(console, "error").mockImplementation(() => {});

    authCallbacks.callback?.(null);
    await vi.waitFor(() => expect(service.getSignInError()).toBe(rejection));
  });

  it("does not report a sign-in error when anonymous sign-in succeeds", async () => {
    authCallbacks.callback?.(null);
    await Promise.resolve();
    expect(service.getSignInError()).toBeNull();
  });

  it("updates user$ when a user session is returned", () => {
    const fakeUser = { uid: "uid-123", isAnonymous: true };
    authCallbacks.callback?.(fakeUser);
    expect(service.getUser()).toBe(fakeUser);
  });

  it("isAnonymous() returns true when user is anonymous", () => {
    authCallbacks.callback?.({ uid: "anon", isAnonymous: true });
    expect(service.isAnonymous()).toBe(true);
  });

  it("isAnonymous() returns false when user is authenticated with Google", () => {
    authCallbacks.callback?.({ uid: "google-uid", isAnonymous: false });
    expect(service.isAnonymous()).toBe(false);
  });

  it("isAnonymous() returns true when no user is set", () => {
    expect(service.isAnonymous()).toBe(true);
  });

  it("clears the previous user immediately when onAuthStateChanged reports no session", async () => {
    authCallbacks.callback?.({ uid: "google-uid", isAnonymous: false });
    expect(service.getUser()).not.toBeNull();

    authCallbacks.callback?.(null);
    // Before signInAnonymously's promise has had a chance to resolve.
    expect(service.getUser()).toBeNull();
  });

  it("getUser$() emits successive user updates", () => {
    const emitted: unknown[] = [];
    service.getUser$().subscribe((u) => emitted.push(u));

    const fakeUser = { uid: "uid-456", isAnonymous: false };
    authCallbacks.callback?.(fakeUser);

    expect(emitted).toContain(fakeUser);
  });

  describe("signInWithGoogle()", () => {
    it("calls linkWithPopup when current user is anonymous", async () => {
      const { linkWithPopup } = await import("firebase/auth");
      mockAuth.currentUser = { isAnonymous: true };

      await service.signInWithGoogle();

      expect(linkWithPopup).toHaveBeenCalledTimes(1);
    });

    it("falls back to signInWithPopup when linkWithPopup throws credential-already-in-use", async () => {
      const { linkWithPopup, signInWithPopup } = await import("firebase/auth");
      mockAuth.currentUser = { isAnonymous: true };
      (linkWithPopup as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
        code: "auth/credential-already-in-use",
      });

      await service.signInWithGoogle();

      expect(signInWithPopup).toHaveBeenCalledTimes(1);
    });

    it("calls signInWithPopup directly when user is not anonymous", async () => {
      const { signInWithPopup } = await import("firebase/auth");
      mockAuth.currentUser = { isAnonymous: false };

      await service.signInWithGoogle();

      expect(signInWithPopup).toHaveBeenCalledTimes(1);
    });
  });

  // Google refuses OAuth started from an embedded WebView, so on a device the
  // popup cannot be the mechanism. The native plugin runs the consent flow and
  // returns an ID token; the JS SDK stays the owner of the session.
  describe("signInWithGoogle() on a device", () => {
    beforeEach(() => {
      mockPlatformService.isNative.mockReturnValue(true);
      service = buildService();
    });

    it("links the anonymous account with the credential rather than opening a popup", async () => {
      const { linkWithCredential, linkWithPopup } = await import("firebase/auth");
      mockAuth.currentUser = { isAnonymous: true };

      await service.signInWithGoogle();

      expect(nativeSignInWithGoogle).toHaveBeenCalledWith({ skipNativeAuth: true });
      expect(linkWithCredential).toHaveBeenCalledTimes(1);
      expect(linkWithPopup).not.toHaveBeenCalled();
    });

    it("signs in with the credential when the user is not anonymous", async () => {
      const { signInWithCredential, signInWithPopup } = await import("firebase/auth");
      mockAuth.currentUser = { isAnonymous: false };

      await service.signInWithGoogle();

      expect(signInWithCredential).toHaveBeenCalledTimes(1);
      expect(signInWithPopup).not.toHaveBeenCalled();
    });

    it("keeps the fallback when the Google account already belongs to another uid", async () => {
      const { linkWithCredential, signInWithCredential } = await import("firebase/auth");
      mockAuth.currentUser = { isAnonymous: true };
      (linkWithCredential as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
        code: "auth/credential-already-in-use",
      });

      await service.signInWithGoogle();

      expect(signInWithCredential).toHaveBeenCalledTimes(1);
    });

    it("fails rather than signing in when the plugin returned no ID token", async () => {
      nativeSignInWithGoogle.mockResolvedValue({ credential: {} });
      mockAuth.currentUser = { isAnonymous: false };

      await expect(service.signInWithGoogle()).rejects.toThrow(/no ID token/);
    });
  });

  describe("signOut()", () => {
    it("calls Firebase signOut", async () => {
      const { signOut } = await import("firebase/auth");
      await service.signOut();
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(nativeSignOut).not.toHaveBeenCalled();
    });

    // The native layer caches the chosen account on its own; left signed in it
    // would skip the chooser and hand back the account the user just left.
    it("also signs the native layer out on a device", async () => {
      mockPlatformService.isNative.mockReturnValue(true);
      service = buildService();

      await service.signOut();

      expect(nativeSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe("getUserOnceReady()", () => {
    it("does not resolve while the first auth state is still pending", async () => {
      let resolved = false;
      service.getUserOnceReady().then(() => (resolved = true));

      await Promise.resolve();
      expect(resolved).toBe(false);
    });

    it("resolves with the user once onAuthStateChanged reports a session", async () => {
      const fakeUser = { uid: "uid-123", isAnonymous: true };
      const pending = service.getUserOnceReady();

      authCallbacks.callback?.(fakeUser);

      await expect(pending).resolves.toBe(fakeUser);
    });

    it("resolves with null once anonymous sign-in definitively fails", async () => {
      const { signInAnonymously } = await import("firebase/auth");
      (signInAnonymously as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network error"));

      const pending = service.getUserOnceReady();
      authCallbacks.callback?.(null);

      await expect(pending).resolves.toBeNull();
    });
  });
});
