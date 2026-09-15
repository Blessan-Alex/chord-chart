import { describe, expect, it } from "vitest";

import { formatAuthError } from "@/lib/authErrors";

describe("formatAuthError", () => {
  it("maps common Firebase auth codes to friendly messages", () => {
    expect(formatAuthError({ code: "auth/popup-closed-by-user" })).toBe(
      "Sign-in was cancelled.",
    );
    expect(
      formatAuthError({ code: "auth/account-exists-with-different-credential" }),
    ).toBe(
      "This email already has an account. Sign in with email and password instead.",
    );
    expect(formatAuthError({ code: "auth/invalid-login-credentials" })).toBe(
      "Incorrect email or password.",
    );
  });
});
