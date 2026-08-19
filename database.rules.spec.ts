import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, remove, set, update } from "firebase/database";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

// Mirrors the repositories' record shape — see
// .claude/skills/firebase-realtime-database/SKILL.md's "document layout" section.
const OWNER_UID = "owner-uid";
const OTHER_UID = "intruder-uid";
const CACHED_FILES_PATH = `users/${OWNER_UID}/cachedFiles`;
const CACHED_FILE_PATH = `${CACHED_FILES_PATH}/file-1`;

function validRecord(overrides: Record<string, unknown> = {}) {
  return {
    ownerId: OWNER_UID,
    createdAt: 1,
    updatedAt: 1,
    chordproContent: "{title: Test}",
    ...overrides,
  };
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-guitab",
    database: {
      rules: readFileSync("database.rules.json", "utf8"),
      host: "127.0.0.1",
      port: 9000,
    },
  });
});

afterEach(async () => {
  await testEnv.clearDatabase();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("database.rules.json", () => {
  describe("default deny", () => {
    it("denies access to a path outside /users/", async () => {
      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(get(ref(db, "somethingElse/item-1")));
      await assertFails(set(ref(db, "somethingElse/item-1"), { anything: true }));
    });
  });

  describe("read", () => {
    it("denies an unauthenticated read", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.unauthenticatedContext().database();
      await assertFails(get(ref(db, CACHED_FILE_PATH)));
    });

    it("allows the owner to read their own record", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(get(ref(db, CACHED_FILE_PATH)));
    });

    it("denies a different authenticated user from reading someone else's record", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OTHER_UID).database();
      await assertFails(get(ref(db, CACHED_FILE_PATH)));
    });

    it("allows the owner to read their whole cachedFiles collection at once", async () => {
      // FirebaseCachedFilesRepository never reads a single record — it always
      // reads the whole collection via a query. A rule that only covers a
      // single-record get would not have caught a gap specific to this shape.
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(get(ref(db, CACHED_FILES_PATH)));
    });

    it("denies a different authenticated user from reading someone else's cachedFiles collection", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OTHER_UID).database();
      await assertFails(get(ref(db, CACHED_FILES_PATH)));
    });
  });

  describe("create", () => {
    it("allows create with all required fields and a matching ownerId", async () => {
      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(set(ref(db, CACHED_FILE_PATH), validRecord()));
    });

    it("denies create when ownerId does not match the authenticated uid", async () => {
      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(set(ref(db, CACHED_FILE_PATH), validRecord({ ownerId: OTHER_UID })));
    });

    it("denies create missing a required field", async () => {
      const record = validRecord();
      delete (record as { createdAt?: unknown }).createdAt;

      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(set(ref(db, CACHED_FILE_PATH), record));
    });

    it("denies create when chordproContent exceeds the size cap", async () => {
      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(set(ref(db, CACHED_FILE_PATH), validRecord({ chordproContent: "a".repeat(500001) })));
    });
  });

  describe("update", () => {
    it("allows an update that leaves createdAt untouched", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(update(ref(db, CACHED_FILE_PATH), { updatedAt: 2 }));
    });

    it("denies an update that changes createdAt", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(update(ref(db, CACHED_FILE_PATH), { createdAt: 2, updatedAt: 2 }));
    });

    it("denies an update from a different user", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OTHER_UID).database();
      await assertFails(update(ref(db, CACHED_FILE_PATH), { updatedAt: 2 }));
    });

    it("denies an update where chordproContent exceeds the size cap", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(update(ref(db, CACHED_FILE_PATH), { chordproContent: "a".repeat(500001) }));
    });
  });

  describe("delete", () => {
    it("allows the owner to delete their own record", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(remove(ref(db, CACHED_FILE_PATH)));
    });

    it("denies a different user from deleting someone else's record", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await set(ref(context.database(), CACHED_FILE_PATH), validRecord());
      });

      const db = testEnv.authenticatedContext(OTHER_UID).database();
      await assertFails(remove(ref(db, CACHED_FILE_PATH)));
    });
  });
});
