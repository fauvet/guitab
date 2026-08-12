import { TestBed } from "@angular/core/testing";
import { BluetoothKeepAliveService } from "./bluetooth-keep-alive.service";

/**
 * jsdom has no Web Audio, so the graph is stubbed rather than built. What is
 * worth asserting is not that an oscillator exists — it is the connect/disconnect
 * bookkeeping, which is where a silent-audio keep-alive goes wrong: connecting
 * twice leaks a node, and disconnecting a node that was never connected throws.
 */
describe("BluetoothKeepAliveService", () => {
  let service: BluetoothKeepAliveService;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let start: ReturnType<typeof vi.fn>;
  let audioContextConstructor: ReturnType<typeof vi.fn>;
  let destination: object;

  beforeEach(() => {
    connect = vi.fn();
    disconnect = vi.fn();
    start = vi.fn();
    destination = { id: "destination" };

    const gainNode = { gain: { value: 1 }, connect, disconnect };
    const oscillator = { frequency: { value: 0 }, type: "", connect: vi.fn(), start };

    // A class, not `vi.fn(() => …)`: the subject calls `new AudioContext()`, and
    // an arrow function cannot be a constructor.
    audioContextConstructor = vi.fn(
      class {
        destination = destination;
        createGain = () => gainNode;
        createOscillator = () => oscillator;
      },
    );

    vi.stubGlobal("AudioContext", audioContextConstructor);

    TestBed.configureTestingModule({});
    service = TestBed.inject(BluetoothKeepAliveService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should not touch Web Audio until it is switched on", () => {
    expect(audioContextConstructor).not.toHaveBeenCalled();
  });

  it("should build the graph and connect it when switched on", () => {
    service.setKeptAlive(true);

    expect(audioContextConstructor).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith(destination);
  });

  it("should build the audio graph only once across several switches", () => {
    service.setKeptAlive(true);
    service.setKeptAlive(false);
    service.setKeptAlive(true);

    expect(audioContextConstructor).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("should not connect twice when switched on while already on", () => {
    service.setKeptAlive(true);
    service.setKeptAlive(true);

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("should disconnect when switched off", () => {
    service.setKeptAlive(true);
    service.setKeptAlive(false);

    expect(disconnect).toHaveBeenCalledWith(destination);
  });

  it("should ignore being switched off when it was never on", () => {
    service.setKeptAlive(false);

    expect(audioContextConstructor).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("should stay silent on a browser with no Web Audio rather than throw", () => {
    vi.stubGlobal("AudioContext", undefined);

    expect(() => service.setKeptAlive(true)).not.toThrow();
  });
});
