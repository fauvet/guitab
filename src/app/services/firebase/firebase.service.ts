import { Injectable } from "@angular/core";
import { FirebaseApp, initializeApp } from "firebase/app";
import { Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class FirebaseService {
  private readonly app: FirebaseApp;
  readonly firestore: Firestore;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.firestore = initializeFirestore(this.app, {
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
