import { Injectable } from "@angular/core";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { connectDatabaseEmulator, Database, getDatabase } from "firebase/database";
import { environment } from "../../../environments/environment";
import { FIREBASE_EMULATOR_CONFIG } from "../../../environments/firebase-emulator";

/**
 * Firebase initialization is global to the JavaScript process, not to the
 * Angular injector, so `providedIn: "root"` is not enough to make it happen
 * once. Anything that builds a second injector — every spec file's TestBed —
 * constructs this service again, and `initializeApp()` throws the second time
 * for the same app name.
 *
 * Memoizing here expresses the real invariant. It also removes a production
 * risk that had simply never fired: a lazily loaded chunk creating its own
 * injector would have hit the same wall, at runtime, in front of a user.
 *
 * The constructor is deliberately unguarded: a Firebase misconfiguration is a
 * developer error, not a runtime condition, and it happens before any
 * component is mounted to show it — failing fast at bootstrap is correct here,
 * not an oversight. See the bootstrap exception in "Errors are never
 * swallowed".
 */
let firebaseApp: FirebaseApp | undefined;
let database: Database | undefined;

@Injectable({
  providedIn: "root",
})
export class FirebaseService {
  private readonly app: FirebaseApp;
  readonly database: Database;

  constructor() {
    this.app = firebaseApp ??= getApps().length > 0 ? getApp() : initializeApp(environment.firebase);
    // Guard on `database` being unset, not on FIREBASE_EMULATOR_CONFIG alone —
    // connectDatabaseEmulator() throws if called more than once on the same
    // instance, and getDatabase() itself only runs once (see the class doc).
    const isFirstConstruction = database === undefined;
    this.database = database ??= getDatabase(this.app);
    if (isFirstConstruction && FIREBASE_EMULATOR_CONFIG) {
      connectDatabaseEmulator(this.database, FIREBASE_EMULATOR_CONFIG.host, FIREBASE_EMULATOR_CONFIG.databasePort);
    }
  }

  getDatabase(): Database {
    return this.database;
  }

  getApp(): FirebaseApp {
    return this.app;
  }
}
