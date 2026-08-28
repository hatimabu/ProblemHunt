import { describe, expect, it } from "vitest";
import { isRecoveryCallback } from "../recovery";

describe("recovery callback detection", () => {
  it("recognizes a PKCE code callback without a type parameter", () => {
    expect(isRecoveryCallback({ search: "?code=pkce-code", hash: "" })).toBe(true);
  });

  it("recognizes an implicit-flow token callback in the hash", () => {
    expect(isRecoveryCallback({ search: "?type=recovery", hash: "#access_token=token&refresh_token=refresh" })).toBe(true);
  });

  it("does not treat a normal homepage URL as a callback", () => {
    expect(isRecoveryCallback({ search: "", hash: "" })).toBe(false);
  });
});
