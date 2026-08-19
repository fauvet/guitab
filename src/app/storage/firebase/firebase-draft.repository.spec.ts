import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { get, onValue, ref, set } from "firebase/database";
import { FirebaseDraftRepository } from "./firebase-draft.repository";
import { FirebaseService } from "../../services/firebase/firebase.service";
import { AuthService } from "../../services/auth/auth.service";

vi.mock("firebase/database", () => ({
  ref: vi.fn().mockReturnValue({ toString: () => "mock-ref" }),
  get: vi.fn().mockResolvedValue({ exists: () => false }),
  onValue: vi.fn().mockReturnValue(vi.fn()),
  set: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(),
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
});
