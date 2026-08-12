import { TestBed } from "@angular/core/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AuthService } from "./auth.service";
import { FirebaseService } from "../firebase/firebase.service";

// vi.hoisted() ensures these are accessible inside the vi.mock() factory,
// which is statically hoisted to the top of the file before any imports.
const { authCallbacks, mockAuth } = vi.hoisted(() => ({
  authCallbacks: { callback: null as ((user: unknown) => void) | null },
  mockAuth: { currentUser: null as unknown },
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => mockAuth),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    authCallbacks.callback = callback;
    return vi.fn();
  }),
  signInAnonymously: vi.fn().mockResolvedValue({}),
  signInWithPopup: vi.fn().mockResolvedValue({}),
  linkWithPopup: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: vi.fn(),
}));

const mockFirebaseService = { getApp: vi.fn().mockReturnValue({}) };

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    authCallbacks.callback = null;
    mockAuth.currentUser = null;
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: FirebaseService, useValue: mockFirebaseService }],
    });
    service = TestBed.inject(AuthService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("signs in anonymously when onAuthStateChanged reports no session", async () => {
    const { signInAnonymously } = await import("firebase/auth");
    authCallbacks.callback?.(null);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
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

  describe("signOut()", () => {
    it("calls Firebase signOut", async () => {
      const { signOut } = await import("firebase/auth");
      await service.signOut();
      expect(signOut).toHaveBeenCalledTimes(1);
    });
  });
});
