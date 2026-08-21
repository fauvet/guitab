import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { get, onValue, ref, set, update } from "firebase/database";
import { FirebaseDraftRepository } from "./firebase-draft.repository";
import { FirebaseService } from "../../services/firebase/firebase.service";
import { AuthService } from "../../services/auth/auth.service";

vi.mock("firebase/database", () => ({
  ref: vi.fn().mockReturnValue({ toString: () => "mock-ref" }),
  get: vi.fn().mockResolvedValue({ exists: () => false }),
  onValue: vi.fn().mockReturnValue(vi.fn()),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn().mockReturnValue("mock-server-timestamp"),
}));

describe("FirebaseDraftRepository", () => {
  const uid = "Y74dTpMayWSmqArsaKo9MqlcRDg2";
  const database = { name: "mock-db" };

  let repository: FirebaseDraftRepository;
  let mockAuthService: { getUser$: ReturnType<typeof vi.fn>; getUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthService = {
      getUser$: vi.fn().mockReturnValue(of({ uid, isAnonymous: false })),
      getUser: vi.fn().mockReturnValue({ uid, isAnonymous: false }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseService, useValue: { getDatabase: () => database } },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    repository = TestBed.inject(FirebaseDraftRepository);
  });

  it("should subscribe to the draft's own path", () => {
    expect(ref).toHaveBeenCalledWith(database, `users/${uid}/draft/current`);
    expect(onValue).toHaveBeenCalled();
  });

  it("should save the draft to the same path", async () => {
    await repository.saveDraft({ chordproContent: "test", hasUnsavedChanges: true });

    expect(ref).toHaveBeenCalledWith(database, `users/${uid}/draft/current`);
    expect(get).toHaveBeenCalled();
    expect(set).toHaveBeenCalled();
  });

  it("should set() a brand-new draft with createdAt, and never update() it", async () => {
    (get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => false });

    await repository.saveDraft({ chordproContent: "test", hasUnsavedChanges: true });

    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chordproContent: "test", ownerId: uid, createdAt: "mock-server-timestamp" }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("should update() an existing draft instead of set()-ing it, so createdAt is preserved", async () => {
    (get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exists: () => true });

    await repository.saveDraft({ chordproContent: "test", hasUnsavedChanges: true });

    const [, payload] = (update as ReturnType<typeof vi.fn>).mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ chordproContent: "test", ownerId: uid });
    // set() overwrites the whole node, so omitting createdAt here would delete
    // it and trip the rules' hasChildren(['ownerId', 'updatedAt', 'createdAt'])
    // validation — update() must be used instead, which merges and leaves it alone.
    expect(Object.prototype.hasOwnProperty.call(payload, "createdAt")).toBe(false);
    expect(set).not.toHaveBeenCalled();
  });

  it("should reject with a clear Error when the write fails, instead of failing silently", async () => {
    (set as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("permission-denied"));

    await expect(repository.saveDraft({ chordproContent: "test", hasUnsavedChanges: true })).rejects.toThrow(
      "Could not save your draft.",
    );
  });
});
