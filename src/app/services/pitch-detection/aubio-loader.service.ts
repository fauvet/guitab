import { Injectable } from "@angular/core";

/** The minimal slice of aubio's API this app uses. */
export interface AubioDetector {
  do(buffer: Float32Array): number;
}

export interface AubioModule {
  Pitch: new (method: string, bufferSize: number, hopSize: number, sampleRate: number) => AubioDetector;
  Onset: new (bufferSize: number, hopSize: number, sampleRate: number) => AubioDetector;
}

/**
 * Where aubio's WebAssembly is copied to by the build. See the `assets` entry in
 * `angular.json`.
 */
const AUBIO_MODULE_PATH = "assets/aubio/aubio.esm.js";

/**
 * Loads aubio at runtime, from a URL rather than through the bundler.
 *
 * Not the obvious `import("aubiojs")`, and the reason is concrete: both builds
 * aubiojs ships still carry emscripten's Node branches, calling `require("fs")`
 * and `require("path")`. Those lines never execute in a browser, but esbuild
 * resolves imports before it knows that, and the build fails outright.
 *
 * Shipping the module as an asset and importing it by a URL the bundler cannot
 * analyse sidesteps that entirely, and has a second benefit worth as much: the
 * 400 kB is guaranteed to stay out of the initial bundle, because it was never
 * in the module graph to begin with. Its WebAssembly is inlined as a data URI,
 * so this one file is the whole dependency — nothing else to fetch, and the
 * service worker's existing `/assets/**` group already caches it for offline
 * use.
 *
 * Isolating this in a service of its own is what keeps PitchDetectionService
 * testable: a spec provides a fake loader instead of trying to intercept a
 * dynamic import by URL.
 */
@Injectable({
  providedIn: "root",
})
export class AubioLoaderService {
  private aubio: AubioModule | null = null;

  /**
   * Loaded once per session and kept. Initialising the module takes long enough
   * to be visible, and a user toggling recording should not pay for it twice.
   */
  async load(): Promise<AubioModule> {
    if (this.aubio !== null) return this.aubio;

    // Resolved against the document's base, so it survives the `/guitab/`
    // baseHref the app is deployed under.
    const moduleUrl = new URL(AUBIO_MODULE_PATH, document.baseURI).href;
    const module = (await import(/* @vite-ignore */ moduleUrl)) as { default: () => Promise<AubioModule> };

    this.aubio = await module.default();
    return this.aubio;
  }
}
