import { TestBed } from "@angular/core/testing";
import { FirebaseService } from "./firebase.service";

describe("FirebaseService", () => {
  const injectFreshInstance = (): FirebaseService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(FirebaseService);
  };

  it("should be created", () => {
    expect(injectFreshInstance()).toBeTruthy();
  });

  // Firebase initialization is global to the JavaScript process, not to the
  // Angular injector. Every spec file gets a fresh TestBed, so a service that
  // initializes on construction is constructed again and again in the same
  // process — and initializeFirestore() throws the second time. That was the
  // cause of the suite's flakiness: whichever spec file happened to run second
  // failed, so the set of failing tests changed between runs.
  it("should reuse the existing Firebase app rather than initializing a second one", () => {
    const first = injectFreshInstance();
    const second = injectFreshInstance();

    expect(second.getApp()).toBe(first.getApp());
  });

  it("should reuse the existing Firestore instance rather than throwing", () => {
    const first = injectFreshInstance();

    expect(() => injectFreshInstance()).not.toThrow();
    expect(injectFreshInstance().getFirestore()).toBe(first.getFirestore());
  });
});
