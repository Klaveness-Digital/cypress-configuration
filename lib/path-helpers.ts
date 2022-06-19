import path from "path";

export function ensureIsAbsolute(root: string, maybeAbsolutePath: string) {
  if (path.isAbsolute(maybeAbsolutePath)) {
    return maybeAbsolutePath;
  } else {
    return path.join(root, maybeAbsolutePath);
  }
}
