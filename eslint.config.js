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
    // The layer boundaries, enforced rather than described. Both exist so the
    // app can be tested without a network and without a microphone; a single
    // import in a component is enough to end that, and nothing else would
    // notice until a test needed the real thing.
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
