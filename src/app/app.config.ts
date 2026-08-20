import { ApplicationConfig, isDevMode } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideHttpClient } from "@angular/common/http";

import { routes } from "./app.routes";
import { provideServiceWorker } from "@angular/service-worker";
import { Capacitor } from "@capacitor/core";

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(),
    provideServiceWorker("ngsw-worker.js", {
      // Packaged in a WebView the assets are already on the device, so a
      // service worker would only add a way to serve a stale copy of files it
      // cannot update. The `capacitor` build configuration ships no
      // ngsw-worker.js at all — without this flag the registration would just
      // 404 on every launch.
      enabled: !isDevMode() && !Capacitor.isNativePlatform(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
