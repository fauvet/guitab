// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

/**
 * The rules that matter here are not the generic ones — Prettier already owns
 * formatting, and the recommended sets own the obvious mistakes. What is
 * configured below encodes the four conventions this codebase would otherwise
 * lose one pull request at a time, each of which has a documented reason in
 * .claude/rules/ or CLAUDE.md.
 */
const AUDIO_BOUNDARY_MESSAGE =
  "Web Audio belongs to src/app/services/pitch-detection/ and " +
  "src/app/services/bluetooth-keep-alive/. Call a service instead — see CLAUDE.md hard rule 3.";

const MICROPHONE_BOUNDARY_MESSAGE =
  "The microphone belongs to src/app/services/pitch-detection/. Call the service instead — " +
  "see CLAUDE.md hard rule 3.";

const SNACK_BAR_BOUNDARY_MESSAGE =
  "MatSnackBar belongs to src/app/services/notification/ and src/app/components/. " +
  "A service or repository throws or rejects instead — see CLAUDE.md hard rule 10.";

module.exports = tseslint.config(
  {
    ignores: ["docs/**", "out-tsc/**", ".angular/**", "coverage/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: "app", style: "camelCase" }],
      "@angular-eslint/component-selector": ["error", { type: "element", prefix: "app", style: "kebab-case" }],

      // OnPush is not a performance preference here. The app pushes state
      // through BehaviorSubjects and AsyncPipe, and a component left on default
      // change detection re-renders on every event in the application.
      "@angular-eslint/prefer-on-push-component-change-detection": "error",

      // `any` disables checking for everything downstream of it, so one in a
      // service quietly unchecks the components that consume it. The sanctioned
      // exceptions are boundaries where data genuinely arrives untyped, and
      // they are narrow enough to disable per line with a reason.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // The Firebase boundary, enforced rather than described. It exists so the
    // app can be tested without a network; a single import in a component is
    // enough to end that, and nothing else would notice until a test needed the
    // real thing.
    files: ["src/app/components/**/*.ts", "src/app/utils/**/*.ts"],
    rules: {
      // typescript-eslint's variant rather than the core rule, for
      // allowTypeImports: a `import type { User } from "firebase/auth"`
      // disappears at build time and creates no runtime dependency, so it does
      // not breach the boundary. Importing a *function* does.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["firebase/*", "@firebase/*"],
              allowTypeImports: true,
              message:
                "Firebase belongs to src/app/services/ and src/app/storage/. Call a service or a repository instead — see CLAUDE.md hard rule 2. A type-only import is fine.",
            },
          ],
        },
      ],
    },
  },
  {
    // The MatSnackBar boundary: a service that shows its own snackbar is a
    // service that decided how its own failure looks on screen, which is a
    // component's call — see "Errors are never swallowed". Negated so the one
    // service that legitimately wraps MatSnackBar stays exempt, rather than
    // needing a per-line disable.
    files: ["src/app/services/**/*.ts", "src/app/storage/**/*.ts"],
    ignores: ["src/app/services/notification/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@angular/material/snack-bar", message: SNACK_BAR_BOUNDARY_MESSAGE }],
        },
      ],
    },
  },
  {
    // The Web Audio boundary, which the same comment used to claim was enforced
    // while nothing enforced it. Web Audio arrives through globals rather than
    // imports, so no-restricted-imports cannot see it — and it went unchecked
    // long enough for a silent-oscillator keep-alive to grow inside
    // src/app/utils/, where a "pure in, pure out" util was holding a live
    // handle on the sound card.
    //
    // Denied everywhere, then granted back to the two services that own it, so
    // a new folder is closed by default rather than by remembering to add it.
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "AudioContext",
          message: AUDIO_BOUNDARY_MESSAGE,
        },
        {
          name: "webkitAudioContext",
          message: AUDIO_BOUNDARY_MESSAGE,
        },
        {
          name: "OfflineAudioContext",
          message: AUDIO_BOUNDARY_MESSAGE,
        },
      ],

      // `window.AudioContext` and `navigator.mediaDevices` slip past
      // no-restricted-globals, which only ever sees a bare identifier.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.name='window'][property.name=/^(AudioContext|webkitAudioContext|OfflineAudioContext)$/]",
          message: AUDIO_BOUNDARY_MESSAGE,
        },
        {
          selector: "MemberExpression[object.name='navigator'][property.name='mediaDevices']",
          message: MICROPHONE_BOUNDARY_MESSAGE,
        },
      ],
    },
  },
  {
    files: ["src/app/services/pitch-detection/**/*.ts", "src/app/services/bluetooth-keep-alive/**/*.ts"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["**/*.spec.ts"],
    rules: {
      // A spec builds fake objects that stand in for typed ones; forcing them
      // to satisfy the real interface makes the mock a second implementation
      // to maintain, which is the opposite of what a mock is for.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
  {
    files: ["scripts/**/*.mjs"],
    extends: [eslint.configs.recommended],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: "latest",
      globals: { console: "readonly", process: "readonly" },
    },
  },
  {
    files: ["eslint.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "writable", require: "readonly" },
    },
  },
);
