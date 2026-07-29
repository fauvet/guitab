/**
 * Environment configuration template.
 *
 * There is a single Firebase environment: the production project guitab-8b990.
 * Both local dev and the deployed app use the same Firebase project.
 *
 * Copy this file to environment.ts and fill in the Firebase project values.
 * environment.ts is git-ignored. In CI, it is generated from GitHub secrets.
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
  firebase: FirebaseConfig;
}

export const environment: Environment = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
