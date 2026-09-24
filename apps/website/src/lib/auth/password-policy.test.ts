import { describe, expect, it } from "vitest";
import {
  meetsPasswordPolicy,
  passwordRuleState,
  passwordStrengthScore,
} from "./password-policy";

describe("password policy", () => {
  it("requires length, mixed case, a number and a symbol", () => {
    expect(meetsPasswordPolicy("Abcdef1!")).toBe(true);
    expect(meetsPasswordPolicy("Abc1!")).toBe(false); // too short
    expect(meetsPasswordPolicy("abcdef1!")).toBe(false); // no upper case
    expect(meetsPasswordPolicy("Abcdefg!")).toBe(false); // no number
    expect(meetsPasswordPolicy("Abcdefg1")).toBe(false); // no symbol
  });

  it("reports each rule separately", () => {
    expect(passwordRuleState("abc")).toEqual([
      { id: "length", met: false },
      { id: "case", met: false },
      { id: "number", met: false },
      { id: "symbol", met: false },
    ]);
  });

  it("scores 0 when empty and adds a bonus point for 12+ characters", () => {
    expect(passwordStrengthScore("")).toBe(0);
    expect(passwordStrengthScore("Abcdef1!")).toBe(4);
    expect(passwordStrengthScore("Abcdefghij1!")).toBe(5);
  });
});
