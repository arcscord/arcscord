import type {
  RadioGroupComponentData,
  StringSelectMenuComponentData,
  TextInputComponentData,
  UserSelectMenuComponentData,
} from "discord.js";
import { describe, expect, it } from "vitest";
import {
  modalRadioGroup,
  modalStringSelect,
  modalTextInput,
  modalUserSelect,
} from "./builders";

describe("modalTextInput label() overrides", () => {
  const field = modalTextInput({ label: "Name", description: "Static desc", placeholder: "Static ph" });

  it("keeps the static text when called without overrides", () => {
    const label = field.label();
    expect(label.label).toBe("Name");
    expect(label.description).toBe("Static desc");
    expect((label.component as TextInputComponentData).placeholder).toBe("Static ph");
  });

  it("overrides label, description, placeholder and value", () => {
    const label = field.label({ label: "Nom", description: "Desc", placeholder: "Ph", value: "V" });
    expect(label.label).toBe("Nom");
    expect(label.description).toBe("Desc");

    const component = label.component as TextInputComponentData;
    expect(component.placeholder).toBe("Ph");
    expect(component.value).toBe("V");
  });

  it("falls back to the static text for omitted override fields", () => {
    const label = field.label({ label: "Nom" });
    expect(label.label).toBe("Nom");
    expect(label.description).toBe("Static desc");
  });
});

describe("modalRadioGroup label() option overrides", () => {
  const field = modalRadioGroup({
    label: "Mood",
    options: [
      { label: "Great", value: "great" },
      { label: "Okay", value: "okay" },
    ] as const,
  });

  it("keeps the static option labels without overrides", () => {
    const options = (field.label().component as RadioGroupComponentData).options;
    expect(options).toEqual([
      { label: "Great", value: "great" },
      { label: "Okay", value: "okay" },
    ]);
  });

  it("overrides an option label by value without touching the value", () => {
    const options = (field.label({ options: { great: { label: "Excellent" } } }).component as RadioGroupComponentData).options;
    expect(options).toEqual([
      { label: "Excellent", value: "great" },
      { label: "Okay", value: "okay" },
    ]);
  });
});

describe("modalStringSelect label() overrides", () => {
  const field = modalStringSelect({ label: "Priority", options: ["low", "high"] as const, placeholder: "Pick" });

  it("expands string options to { label, value } pairs", () => {
    const component = field.label().component as StringSelectMenuComponentData;
    expect(component.placeholder).toBe("Pick");
    expect(component.options).toEqual([
      { label: "low", value: "low" },
      { label: "high", value: "high" },
    ]);
  });

  it("overrides placeholder and an option label by value", () => {
    const component = field.label({ placeholder: "Choisir", options: { low: { label: "Bas" } } }).component as StringSelectMenuComponentData;
    expect(component.placeholder).toBe("Choisir");
    expect(component.options).toEqual([
      { label: "Bas", value: "low" },
      { label: "high", value: "high" },
    ]);
  });
});

describe("modalUserSelect label() overrides", () => {
  const field = modalUserSelect({ label: "Owner", placeholder: "Static" });

  it("overrides the placeholder", () => {
    const component = field.label({ label: "Propriétaire", placeholder: "Choisir" }).component as UserSelectMenuComponentData;
    expect(component.placeholder).toBe("Choisir");
  });
});
