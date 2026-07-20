import type { Attachment, GuildBasedChannel, Role, User } from "discord.js";
import { describe, expectTypeOf, it } from "vitest";
import { createModal } from "../interaction/component_handler.func";
import {
  buildModal,
  modalChannelSelect,
  modalCheckbox,
  modalCheckboxGroup,
  modalFileUpload,
  modalMentionableSelect,
  modalRadioGroup,
  modalRoleSelect,
  modalStringSelect,
  modalTextInput,
  modalUserSelect,
} from "./builders";

// The parsed value carried by a field is asserted through `field.parse`'s
// return type; the `label()` override slot is asserted separately below.
describe("modal field definition value types", () => {
  it("modalTextInput required (default) returns string", () => {
    const field = modalTextInput({ label: "Title" });
    expectTypeOf(field.parse).returns.toEqualTypeOf<string>();
  });

  it("modalTextInput required: false returns string | undefined", () => {
    const field = modalTextInput({ label: "Title", required: false });
    expectTypeOf(field.parse).returns.toEqualTypeOf<string | undefined>();
  });

  it("modalTextInput required: true returns string", () => {
    const field = modalTextInput({ label: "Title", required: true });
    expectTypeOf(field.parse).returns.toEqualTypeOf<string>();
  });

  it("modalStringSelect single (default) returns string literal union", () => {
    const field = modalStringSelect({ label: "Priority", options: ["low", "medium", "high"] as const });
    expectTypeOf(field.parse).returns.toEqualTypeOf<"low" | "medium" | "high">();
  });

  it("modalStringSelect maxValues > 1 returns array of string literal union", () => {
    const field = modalStringSelect({ label: "Tags", options: ["bug", "docs", "feature"] as const, maxValues: 3 });
    expectTypeOf(field.parse).returns.toEqualTypeOf<("bug" | "docs" | "feature")[]>();
  });

  it("modalStringSelect required: false with single returns union | undefined", () => {
    const field = modalStringSelect({ label: "Status", options: ["open", "closed"] as const, required: false });
    expectTypeOf(field.parse).returns.toEqualTypeOf<"open" | "closed" | undefined>();
  });

  it("modalUserSelect single returns User", () => {
    const field = modalUserSelect({ label: "User" });
    expectTypeOf(field.parse).returns.toEqualTypeOf<User>();
  });

  it("modalUserSelect maxValues > 1 returns User[]", () => {
    const field = modalUserSelect({ label: "Users", maxValues: 3 });
    expectTypeOf(field.parse).returns.toEqualTypeOf<User[]>();
  });

  it("modalRoleSelect single returns Role", () => {
    const field = modalRoleSelect({ label: "Role" });
    expectTypeOf(field.parse).returns.toEqualTypeOf<Role>();
  });

  it("modalMentionableSelect single returns User | Role", () => {
    const field = modalMentionableSelect({ label: "Mention" });
    expectTypeOf(field.parse).returns.toEqualTypeOf<User | Role>();
  });

  it("modalChannelSelect single returns GuildBasedChannel", () => {
    const field = modalChannelSelect({ label: "Channel" });
    expectTypeOf(field.parse).returns.toEqualTypeOf<GuildBasedChannel>();
  });

  it("modalFileUpload single returns Attachment", () => {
    const field = modalFileUpload({ label: "File" });
    expectTypeOf(field.parse).returns.toEqualTypeOf<Attachment>();
  });

  it("modalRadioGroup required (default) returns string literal union", () => {
    const field = modalRadioGroup({ label: "Choice", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] as const });
    expectTypeOf(field.parse).returns.toEqualTypeOf<"a" | "b">();
  });

  it("modalCheckboxGroup returns array of string literal union", () => {
    const field = modalCheckboxGroup({ label: "Checks", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] as const });
    expectTypeOf(field.parse).returns.toEqualTypeOf<("a" | "b")[]>();
  });

  it("modalCheckbox returns boolean", () => {
    const field = modalCheckbox({ label: "Accept" });
    expectTypeOf(field.parse).returns.toEqualTypeOf<boolean>();
  });
});

describe("modal field label() override types", () => {
  it("text input label() accepts display-text overrides", () => {
    const field = modalTextInput({ label: "Title" });
    field.label({ label: "T", description: "D", placeholder: "P", value: "V" });
    // @ts-expect-error unknown override property
    field.label({ nope: "x" });
  });

  it("radio group option overrides are keyed by declared value", () => {
    const field = modalRadioGroup({ label: "Choice", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] as const });
    field.label({ label: "Choice", options: { a: { label: "AA" }, b: { description: "BB" } } });
    // @ts-expect-error "c" is not a declared option value
    field.label({ options: { c: { label: "CC" } } });
  });

  it("string select option overrides are keyed by declared value", () => {
    const field = modalStringSelect({ label: "Priority", options: ["low", "high"] as const });
    field.label({ placeholder: "pick", options: { low: { label: "Low" } } });
    // @ts-expect-error "mid" is not a declared option value
    field.label({ options: { mid: { label: "Mid" } } });
  });

  it("native select label() rejects option overrides", () => {
    const field = modalUserSelect({ label: "User" });
    field.label({ placeholder: "pick a user" });
    // @ts-expect-error native selects have no per-option overrides
    field.label({ options: { a: { label: "A" } } });
  });
});

describe("createModal ctx.values types", () => {
  it("types ctx.values from field definitions", () => {
    createModal({
      route: "test/modal",
      fields: {
        title: modalTextInput({ label: "Title" }),
        optional: modalTextInput({ label: "Optional", required: false }),
        priority: modalStringSelect({ label: "Priority", options: ["low", "high"] as const }),
        tags: modalStringSelect({ label: "Tags", options: ["bug", "feat"] as const, maxValues: 3 }),
        assignee: modalUserSelect({ label: "Assignee" }),
        role: modalRoleSelect({ label: "Role" }),
      },
      build: (id, fields) => buildModal({
        title: "Test",
        customId: id(),
        components: [fields.title.label()],
      }),
      run: (ctx) => {
        expectTypeOf(ctx.values.title).toEqualTypeOf<string>();
        expectTypeOf(ctx.values.optional).toEqualTypeOf<string | undefined>();
        expectTypeOf(ctx.values.priority).toEqualTypeOf<"low" | "high">();
        expectTypeOf(ctx.values.tags).toEqualTypeOf<("bug" | "feat")[]>();
        expectTypeOf(ctx.values.assignee).toEqualTypeOf<User>();
        expectTypeOf(ctx.values.role).toEqualTypeOf<Role>();
        return ctx.ok();
      },
    });
  });
});
