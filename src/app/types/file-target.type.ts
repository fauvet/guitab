/**
 * The file the editor is currently working on, described in a way that does not
 * assume a browser.
 *
 * This used to be `File | FileSystemFileHandle`, and the question the app asked
 * of it — "can I write back to this in place, or do I have to save-as?" — was
 * answered with `instanceof FileSystemFileHandle`. That works in a desktop
 * browser and nowhere else: an Android WebView does not define
 * `FileSystemFileHandle` at all, so the check does not evaluate to false, it
 * throws a ReferenceError. A tag answers the same question without reading a
 * global that may not exist.
 *
 * The third variant is the one no web type can express: a file the host handed
 * over as a URI, with no `File` object behind it. Its content cannot be read by
 * a pure function — see `FileTargetUtil` and the file-access repositories.
 */
export type FileTarget =
  | { readonly kind: "web-file"; readonly file: File }
  | { readonly kind: "web-handle"; readonly handle: FileSystemFileHandle }
  | { readonly kind: "native"; readonly uri: string; readonly name: string };
