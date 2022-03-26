import assert from "assert";

import { ensureIsAbsolute } from "./path-helpers";

describe("ensureIsAbsolute()", () => {
  it("relative path", () => {
    assert.strictEqual(ensureIsAbsolute("/foo", "bar"), "/foo/bar");
  });

  it("absolute path", () => {
    assert.strictEqual(ensureIsAbsolute("/foo", "/foo/bar"), "/foo/bar");
  });
});
