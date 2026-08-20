import type { CapacitorConfig } from "@capacitor/cli";

/**
 * `webDir` points at the `capacitor` build configuration's output rather than
 * at `docs/`, which belongs to GitHub Pages. The two differ in more than the
 * folder: the Pages build is served under /guitab/ and registers a service
 * worker, and neither is true inside a WebView.
 */
const config: CapacitorConfig = {
  appId: "io.github.fauvet.guitab",
  appName: "GuiTab",
  webDir: "dist/capacitor/browser",
  android: {
    // The editor is a text surface with a soft keyboard in front of it; letting
    // the WebView resize rather than pan keeps the caret visible, which is the
    // same reason index.html asks for interactive-widget=resizes-content.
    adjustMarginsForEdgeToEdge: "auto",
  },
  plugins: {
    // The screen wake lock is the app's own setting, so nothing should be held
    // before the player asks for it.
    KeepAwake: {},
  },
};

export default config;
