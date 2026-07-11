import type { ValidationContext } from "./validator.util";
import { error, ok } from "@arcscord/error";
import { describe, expect, it } from "vitest";
import { ArcscordError } from "#/utils";
import {
  validateLocalizations,
  validateLowercase,
  validateNumberBounds,
  validateOrderedBounds,
  validateRegex,
  validateRequiredStringLength,
  validateUniqueName,
} from "./validator.util";

const context: ValidationContext = {
  group: "testGroup",
};

describe("validateRequiredStringLength", () => {
  it("passes for a value within bounds", () => {
    const [err] = validateRequiredStringLength("hello", "name", 10, context);
    expect(err).toBeNull();
  });

  it("rejects a value shorter than the minimum length", () => {
    const [err] = validateRequiredStringLength("", "name", 10, context);
    expect(err).toBeInstanceOf(ArcscordError);
    expect(err?.message).toContain("must be between 1 and 10 characters");
  });

  it("rejects a value longer than the maximum length", () => {
    const [err] = validateRequiredStringLength("a".repeat(11), "name", 10, context);
    expect(err).toBeInstanceOf(ArcscordError);
  });

  it("accepts a value at the exact min/max boundaries", () => {
    expect(validateRequiredStringLength("ab", "name", 5, context, 2)[0]).toBeNull();
    expect(validateRequiredStringLength("abcde", "name", 5, context, 2)[0]).toBeNull();
  });
});

describe("validateRegex", () => {
  it("passes when the value matches the pattern", () => {
    const [err] = validateRegex("abc123", "name", /^[a-z0-9]+$/, "must be alphanumeric", context);
    expect(err).toBeNull();
  });

  it("rejects with the provided message when the value does not match", () => {
    const [err] = validateRegex("ABC!", "name", /^[a-z0-9]+$/, "must be alphanumeric", context);
    expect(err?.message).toBe("must be alphanumeric");
  });
});

describe("validateLowercase", () => {
  it("passes for an already-lowercase value", () => {
    expect(validateLowercase("already-lower", "name", context)[0]).toBeNull();
  });

  it("rejects a value containing uppercase letters", () => {
    const [err] = validateLowercase("HasUpper", "name", context);
    expect(err?.message).toBe("name must be lowercase when letters have lowercase variants");
  });
});

describe("validateUniqueName", () => {
  it("passes and records the first occurrence of a name", () => {
    const names = new Map<string, string>();
    const [err] = validateUniqueName(names, "ping", "ping", "command", context);
    expect(err).toBeNull();
    expect(names.get("ping")).toBe("command");
  });

  it("rejects a duplicate name already recorded under the same key", () => {
    const names = new Map<string, string>([["ping", "command"]]);
    const [err] = validateUniqueName(names, "ping", "ping", "command", context);
    expect(err?.message).toBe("duplicate command name \"ping\" in group \"testGroup\"");
  });
});

describe("validateNumberBounds", () => {
  it("passes when the value is undefined (optional field)", () => {
    expect(validateNumberBounds(undefined, "options.length", "min_length", 1, 100, context)[0]).toBeNull();
  });

  it("rejects a value below the minimum", () => {
    const [err] = validateNumberBounds(0, "options.length", "min_length", 1, 100, context);
    expect(err?.message).toBe("options.length min_length must be between 1 and 100");
  });

  it("rejects a value above the maximum", () => {
    const [err] = validateNumberBounds(200, "options.length", "min_length", 1, 100, context);
    expect(err).toBeInstanceOf(ArcscordError);
  });

  it("accepts a value at the exact bounds", () => {
    expect(validateNumberBounds(1, "options.length", "min_length", 1, 100, context)[0]).toBeNull();
    expect(validateNumberBounds(100, "options.length", "min_length", 1, 100, context)[0]).toBeNull();
  });
});

describe("validateOrderedBounds", () => {
  it("passes when min is less than or equal to max", () => {
    expect(validateOrderedBounds(1, 10, "options.length", "min_length", "max_length", context)[0]).toBeNull();
    expect(validateOrderedBounds(5, 5, "options.length", "min_length", "max_length", context)[0]).toBeNull();
  });

  it("rejects when min is greater than max", () => {
    const [err] = validateOrderedBounds(10, 1, "options.length", "min_length", "max_length", context);
    expect(err?.message).toBe("options.length min_length cannot be greater than max_length");
  });

  it("passes when either bound is undefined", () => {
    expect(validateOrderedBounds(undefined, 10, "options.length", "min_length", "max_length", context)[0]).toBeNull();
    expect(validateOrderedBounds(10, undefined, "options.length", "min_length", "max_length", context)[0]).toBeNull();
  });
});

describe("validateLocalizations", () => {
  const alwaysValid = () => ok(true as const);

  it("passes when there are no localizations", () => {
    expect(validateLocalizations(undefined, "name", context, alwaysValid)[0]).toBeNull();
  });

  it("passes for valid Discord locale keys", () => {
    const [err] = validateLocalizations({ "fr": "bonjour", "en-US": "hello" }, "name", context, alwaysValid);
    expect(err).toBeNull();
  });

  it("rejects an unsupported locale key", () => {
    const [err] = validateLocalizations({ "xx-INVALID": "???" }, "name", context, alwaysValid);
    expect(err?.message).toBe("name localization \"xx-INVALID\" is not a supported Discord locale");
  });

  it("propagates an error from the per-value validate callback", () => {
    const validate = () => error(new ArcscordError({
      code: "COMMAND_VALIDATION_FAILED",
      message: "value too long",
      metadata: { rule: "test" },
    }));

    const [err] = validateLocalizations({ fr: "bonjour" }, "name", context, validate);
    expect(err?.message).toBe("value too long");
  });
});
