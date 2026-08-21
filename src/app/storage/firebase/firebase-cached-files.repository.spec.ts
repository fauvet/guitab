import { TestBed } from "@angular/core/testing";
import { firstValueFrom, of } from "rxjs";
import { onValue, orderByChild, ref } from "firebase/database";
import { FirebaseCachedFilesRepository } from "./firebase-cached-files.repository";
import { FirebaseService } from "../../services/firebase/firebase.service";
import { AuthService } from "../../services/auth/auth.service";

interface FakeChildSnapshot {
  key: string;
  val(): unknown;
}

interface FakeSnapshot {
  forEach(callback: (child: FakeChildSnapshot) => void): void;
}

interface FakeRecord {
  key: string;
  value: Record<string, unknown>;
}

function buildFakeSnapshot(records: FakeRecord[]): FakeSnapshot {
  return {
    forEach: (callback) => {
      for (const record of records) callback({ key: record.key, val: () => record.value });
    },
  };
}

const { snapshotCallbacks } = vi.hoisted(() => ({
  snapshotCallbacks: {
    onNext: null as ((snapshot: unknown) => void) | null,
    onError: null as ((error: unknown) => void) | null,
  },
}));

vi.mock("firebase/database", () => ({
  ref: vi.fn().mockReturnValue({ toString: () => "mock-ref" }),
  query: vi.fn().mockReturnValue({ toString: () => "mock-query" }),
  orderByChild: vi.fn(),
  get: vi.fn().mockResolvedValue({ exists: () => false }),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue("mock-server-timestamp"),
  onValue: vi.fn((_query: unknown, onNext: (snapshot: unknown) => void, onError: (error: unknown) => void) => {
    snapshotCallbacks.onNext = onNext;
    snapshotCallbacks.onError = onError;
    return vi.fn();
  }),
}));

describe("FirebaseCachedFilesRepository", () => {
  const uid = "Y74dTpMayWSmqArsaKo9MqlcRDg2";
  const database = { name: "mock-db" };

  let repository: FirebaseCachedFilesRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    snapshotCallbacks.onNext = null;
    snapshotCallbacks.onError = null;

    const mockAuthService = {
      getUser$: vi.fn().mockReturnValue(of({ uid, isAnonymous: false })),
      getUser: vi.fn().mockReturnValue({ uid, isAnonymous: false }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseService, useValue: { getDatabase: () => database } },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    repository = TestBed.inject(FirebaseCachedFilesRepository);
  });

  it("subscribes to the user's cachedFiles collection, ordered by updatedAt", () => {
    expect(ref).toHaveBeenCalledWith(database, `users/${uid}/cachedFiles`);
    expect(orderByChild).toHaveBeenCalledWith("updatedAt");
    expect(onValue).toHaveBeenCalled();
  });

  it("reverses the ascending snapshot order, so the newest file comes first, and maps the node key to id", async () => {
    snapshotCallbacks.onNext?.(
      buildFakeSnapshot([
        { key: "id-older", value: { name: "Older", chordproContent: "a", updatedAt: 1 } },
        { key: "id-newer", value: { name: "Newer", chordproContent: "b", updatedAt: 2 } },
      ]),
    );

    const files = await firstValueFrom(repository.getCachedFiles$());
    expect(files.map((file) => file.name)).toEqual(["Newer", "Older"]);
    expect(files.map((file) => file.id)).toEqual(["id-newer", "id-older"]);
  });

  describe("getSyncError$()", () => {
    it("starts null", async () => {
      const error = await firstValueFrom(repository.getSyncError$());
      expect(error).toBeNull();
    });

    it("carries the Error when the listener reports one, and logs it rather than swallowing it", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const listenerError = new Error("permission-denied");

      snapshotCallbacks.onError?.(listenerError);

      const error = await firstValueFrom(repository.getSyncError$());
      expect(error).toBe(listenerError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("resets to null once a snapshot succeeds again", async () => {
      snapshotCallbacks.onError?.(new Error("permission-denied"));
      snapshotCallbacks.onNext?.(buildFakeSnapshot([]));

      const error = await firstValueFrom(repository.getSyncError$());
      expect(error).toBeNull();
    });
  });

  describe("saveFile()", () => {
    it("rejects with a clear Error when the write itself fails, instead of failing silently", async () => {
      const { set } = await import("firebase/database");
      (set as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("permission-denied"));

      await expect(repository.saveFile("{title: Test}", "song-1")).rejects.toThrow(
        /Could not save ".*" to your account\./,
      );
    });

    it("should set() a brand-new file with createdAt, and never update() it", async () => {
      const { get, set, update } = await import("firebase/database");
      (get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });

      await repository.saveFile("{title: Test}", "song-1");

      expect(set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ownerId: uid, createdAt: "mock-server-timestamp" }),
      );
      expect(update).not.toHaveBeenCalled();
    });

    it("should update() an existing file instead of set()-ing it, so createdAt is preserved", async () => {
      const { get, set, update } = await import("firebase/database");
      (get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => true });

      await repository.saveFile("{title: Test}", "song-1");

      const [, payload] = (update as ReturnType<typeof vi.fn>).mock.calls[0] as [unknown, Record<string, unknown>];
      expect(payload).toMatchObject({ ownerId: uid });
      // set() overwrites the whole node, so omitting createdAt here would delete
      // it and trip the rules' hasChildren(['ownerId', 'updatedAt', 'createdAt'])
      // validation — update() must be used instead, which merges and leaves it alone.
      expect(Object.prototype.hasOwnProperty.call(payload, "createdAt")).toBe(false);
      expect(set).not.toHaveBeenCalled();
    });

    it("does not touch getSyncError$() — that reflects only the live listener", async () => {
      const { set } = await import("firebase/database");
      (set as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("permission-denied"));

      await repository.saveFile("{title: Test}", "song-1").catch(() => {});

      const error = await firstValueFrom(repository.getSyncError$());
      expect(error).toBeNull();
    });

    it("mints a random id and returns it when none is given", async () => {
      const id = await repository.saveFile("{title: Test}", null);

      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(ref).toHaveBeenCalledWith(database, `users/${uid}/cachedFiles/${id}`);
    });

    it("writes to the same ref path across two saves with the same id, even if the derived name changes", async () => {
      await repository.saveFile("{title: S}", "song-1");
      await repository.saveFile("{title: Song title}", "song-1");

      const cachedFilesRefCalls = (ref as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([, path]) => typeof path === "string" && path.startsWith(`users/${uid}/cachedFiles/`),
      );
      expect(cachedFilesRefCalls).toHaveLength(2);
      expect(cachedFilesRefCalls.every(([, path]) => path === `users/${uid}/cachedFiles/song-1`)).toBe(true);
    });

    it("uses an id verbatim, even one that already looks percent-encoded, instead of re-encoding it", async () => {
      // Regression test: a legacy id inherited from the old name-based key
      // scheme is already percent-encoded (e.g. from a title like "Mr. Blue
      // Sky"). Sanitizing it again would escape the literal "%" itself,
      // silently forking the record onto a new path.
      const legacyId = "Mr%2E%20Blue%20Sky";

      await repository.saveFile("{title: Mr. Blue Sky}", legacyId);

      expect(ref).toHaveBeenCalledWith(database, `users/${uid}/cachedFiles/${legacyId}`);
    });
  });

  describe("deleteFile()", () => {
    it("removes the entry at the same path saveFile() would have written it to", async () => {
      const { remove } = await import("firebase/database");

      await repository.deleteFile("song-1");

      expect(ref).toHaveBeenCalledWith(database, `users/${uid}/cachedFiles/song-1`);
      expect(remove).toHaveBeenCalled();
    });

    it("rejects with a clear Error when the removal itself fails, instead of failing silently", async () => {
      const { remove } = await import("firebase/database");
      (remove as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("permission-denied"));

      await expect(repository.deleteFile("song-1")).rejects.toThrow(/Could not delete this song\./);
    });
  });
});
