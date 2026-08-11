import { Injectable } from "@angular/core";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { environment } from "../../../environments/environment";

/**
 * Firebase initialization is global to the JavaScript process, not to the
 * Angular injector, so `providedIn: "root"` is not enough to make it happen
 * once. Anything that builds a second injector — every spec file's TestBed —
 * constructs this service again, and `initializeFirestore()` throws the second
 * time because it refuses to be called twice with different options.
 *
 * Memoizing here expresses the real invariant. It also removes a production
 * risk that had simply never fired: a lazily loaded chunk creating its own
 * injector would have hit the same wall, at runtime, in front of a user.
 */
let firebaseApp: FirebaseApp | undefined;
let firestore: Firestore | undefined;

@Injectable({
  providedIn: "root",
})
export class FirebaseService {
  private readonly app: FirebaseApp;
  readonly firestore: Firestore;

  constructor() {
    this.app = firebaseApp ??= getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
    this.firestore = firestore ??= initializeFirestore(this.app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }

  getFirestore(): Firestore {
    return this.firestore;
  }

  getApp(): FirebaseApp {
    return this.app;
  }
}
