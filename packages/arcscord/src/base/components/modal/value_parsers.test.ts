import type { ModalFieldParseInput } from "../shared/component_definer.type";
import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import {
  readCheckboxGroupValue,
  readCheckboxValue,
  readFilesSingleOrMany,
  readOptionalTextInputValue,
  readRadioValue,
  readResolvedSingleOrMany,
  readSingleOrManyStrings,
  readTextInputValue,
} from "./value_parsers";

function input(customId: string, field: unknown, value?: unknown): ModalFieldParseInput {
  return { customId, field, value };
}

describe("readTextInputValue", () => {
  it("returns the raw string value when the field is present", () => {
    const field = { type: ComponentType.TextInput, value: "hello" };
    expect(readTextInputValue(input("name", field, "hello"))).toBe("hello");
  });

  it("throws an explicit error when the field is missing", () => {
    expect(() => readTextInputValue(input("name", undefined))).toThrow(
      "Missing modal field \"name\"",
    );
  });

  it("throws when the underlying Discord component type does not match", () => {
    const field = { type: ComponentType.Checkbox, value: "hello" };
    expect(() => readTextInputValue(input("name", field, "hello"))).toThrow(TypeError);
  });
});

describe("readOptionalTextInputValue", () => {
  it("returns undefined when the field is absent", () => {
    expect(readOptionalTextInputValue(input("name", undefined))).toBeUndefined();
  });

  it("returns undefined when the field is present but empty", () => {
    const field = { type: ComponentType.TextInput, value: "" };
    expect(readOptionalTextInputValue(input("name", field, ""))).toBeUndefined();
  });

  it("returns the value when the field is present and non-empty", () => {
    const field = { type: ComponentType.TextInput, value: "hello" };
    expect(readOptionalTextInputValue(input("name", field, "hello"))).toBe("hello");
  });
});

describe("readSingleOrManyStrings", () => {
  const allowedValues = ["low", "medium", "high"] as const;

  it("returns a single value when maxValues is 1 (default)", () => {
    const field = { type: ComponentType.StringSelect, values: ["low"] };
    const result = readSingleOrManyStrings(input("priority", field), ComponentType.StringSelect, {
      allowedValues,
    });
    expect(result).toBe("low");
  });

  it("throws when more than one value is selected but maxValues is 1", () => {
    const field = { type: ComponentType.StringSelect, values: ["low", "high"] };
    expect(() => readSingleOrManyStrings(input("priority", field), ComponentType.StringSelect, {
      allowedValues,
    })).toThrow(TypeError);
  });

  it("throws when a selected value is not in the allowed set", () => {
    const field = { type: ComponentType.StringSelect, values: ["extreme"] };
    expect(() => readSingleOrManyStrings(input("priority", field), ComponentType.StringSelect, {
      allowedValues,
    })).toThrow(/received invalid values/);
  });

  it("returns an array of values when maxValues is greater than 1", () => {
    const field = { type: ComponentType.StringSelect, values: ["low", "high"] };
    const result = readSingleOrManyStrings(input("priority", field), ComponentType.StringSelect, {
      allowedValues,
      maxValues: 2,
    });
    expect(result).toEqual(["low", "high"]);
  });

  it("returns undefined when optional and no value was selected", () => {
    const field = { type: ComponentType.StringSelect, values: [] };
    const result = readSingleOrManyStrings(input("priority", field), ComponentType.StringSelect, {
      allowedValues,
      required: false,
    });
    expect(result).toBeUndefined();
  });
});

describe("readResolvedSingleOrMany", () => {
  it("resolves each selected id to a value using readValues", () => {
    const field = { type: ComponentType.UserSelect, values: ["u1", "u2"] };
    const result = readResolvedSingleOrMany(input("assignees", field), ComponentType.UserSelect, {
      maxValues: 2,
      readValues: (_field, ids) => ids.map(id => ({ id })),
    });
    expect(result).toEqual([{ id: "u1" }, { id: "u2" }]);
  });

  it("throws when readValues does not resolve every selected id", () => {
    const field = { type: ComponentType.UserSelect, values: ["u1", "u2"] };
    expect(() => readResolvedSingleOrMany(input("assignees", field), ComponentType.UserSelect, {
      maxValues: 2,
      readValues: (_field, ids) => ids.slice(0, 1).map(id => ({ id })),
    })).toThrow(/expected resolved values for every selected id/);
  });

  it("returns a single resolved value when maxValues is 1", () => {
    const field = { type: ComponentType.UserSelect, values: ["u1"] };
    const result = readResolvedSingleOrMany(input("assignee", field), ComponentType.UserSelect, {
      readValues: (_field, ids) => ids.map(id => ({ id })),
    });
    expect(result).toEqual({ id: "u1" });
  });
});

describe("readFilesSingleOrMany", () => {
  function attachmentsField(entries: Record<string, unknown>, ids: string[]): unknown {
    return {
      type: ComponentType.FileUpload,
      values: ids,
      attachments: { get: (id: string) => entries[id] },
    };
  }

  it("returns a single attachment when maxValues is 1", () => {
    const field = attachmentsField({ f1: { id: "f1", name: "a.png" } }, ["f1"]);
    const result = readFilesSingleOrMany(input("upload", field), {});
    expect(result).toEqual({ id: "f1", name: "a.png" });
  });

  it("returns an array of attachments when maxValues is greater than 1", () => {
    const field = attachmentsField({
      f1: { id: "f1" },
      f2: { id: "f2" },
    }, ["f1", "f2"]);
    const result = readFilesSingleOrMany(input("upload", field), { maxValues: 2 });
    expect(result).toEqual([{ id: "f1" }, { id: "f2" }]);
  });

  it("returns undefined when optional and no file was uploaded", () => {
    const field = attachmentsField({}, []);
    const result = readFilesSingleOrMany(input("upload", field), { required: false });
    expect(result).toBeUndefined();
  });

  it("throws when an uploaded id has no resolved attachment", () => {
    const field = attachmentsField({}, ["missing-id"]);
    expect(() => readFilesSingleOrMany(input("upload", field), {})).toThrow(
      /expected resolved attachments for every uploaded file id/,
    );
  });
});

describe("readRadioValue", () => {
  const allowedValues = [{ value: "yes" }, { value: "no" }] as const;

  it("returns the selected value when it is allowed", () => {
    const field = { type: ComponentType.RadioGroup, value: "yes" };
    expect(readRadioValue(input("confirm", field, "yes"), { allowedValues })).toBe("yes");
  });

  it("throws when the selected value is not in the allowed set", () => {
    const field = { type: ComponentType.RadioGroup, value: "maybe" };
    expect(() => readRadioValue(input("confirm", field, "maybe"), { allowedValues })).toThrow(TypeError);
  });

  it("returns undefined when optional and no field was submitted", () => {
    expect(readRadioValue(input("confirm", undefined), { allowedValues, required: false })).toBeUndefined();
  });
});

describe("readCheckboxValue", () => {
  it("returns true when the checkbox field value is true", () => {
    const field = { type: ComponentType.Checkbox, value: true };
    expect(readCheckboxValue(input("accept", field, true))).toBe(true);
  });

  it("returns false when the checkbox field value is false", () => {
    const field = { type: ComponentType.Checkbox, value: false };
    expect(readCheckboxValue(input("accept", field, false))).toBe(false);
  });

  it("throws when the field value is not a boolean", () => {
    const field = { type: ComponentType.Checkbox, value: "yes" };
    expect(() => readCheckboxValue(input("accept", field, "yes"))).toThrow(
      "modal field \"accept\" expected a boolean value",
    );
  });
});

describe("readCheckboxGroupValue", () => {
  const allowedValues = [{ value: "a" }, { value: "b" }, { value: "c" }] as const;

  it("returns every checked value", () => {
    const field = { type: ComponentType.CheckboxGroup, values: ["a", "c"] };
    expect(readCheckboxGroupValue(input("options", field), { allowedValues })).toEqual(["a", "c"]);
  });

  it("returns an empty array when nothing is checked", () => {
    const field = { type: ComponentType.CheckboxGroup, values: [] };
    expect(readCheckboxGroupValue(input("options", field), { allowedValues })).toEqual([]);
  });

  it("throws when a checked value is not in the allowed set", () => {
    const field = { type: ComponentType.CheckboxGroup, values: ["z"] };
    expect(() => readCheckboxGroupValue(input("options", field), { allowedValues })).toThrow(
      /received invalid values/,
    );
  });
});
