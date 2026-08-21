/**
 * Whether Firebase should be redirected to the local Emulator Suite instead
 * of the real `guitab-8b990` project. `environment.ts` never changes between
 * builds — this is the only thing that does, swapped to
 * firebase-emulator.agent.ts by the "agent" build configuration in
 * angular.json. See `npm run start:agent`.
 */
export const FIREBASE_EMULATOR_CONFIG: { host: string; authPort: number; databasePort: number } | null = null;
