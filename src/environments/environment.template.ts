/**
 * Environment configuration template.
 *
 * Copy this file to environment.ts (dev) or environment.prod.ts (prod)
 * and fill in the Firebase project values.
 * Both environment.ts and environment.prod.ts are git-ignored.
 *
 * Firebase web API keys are semi-public by design; the real security layer is
 * Firestore Security Rules + Firebase Authentication.
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface Environment {
  production: boolean;
  firebase: FirebaseConfig;
}

export const environment: Environment = {
  production: false, // true in environment.prod.ts
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
