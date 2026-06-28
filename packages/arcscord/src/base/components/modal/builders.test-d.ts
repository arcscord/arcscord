import type { Attachment, GuildBasedChannel, Role, User } from "discord.js";
import type { ModalFieldDefinition } from "#/base/components/shared/component_definer.type";
import { describe, expectTypeOf, it } from "vitest";
import { createModal } from "../interaction/component_handler.func";
import { buildModal, modalChannelSelect, modalCheckbox, modalCheckboxGroup, modalFileUpload, modalMentionableSelect, modalRadioGroup, modalRoleSelect, modalStringSelect, modalTextInput, modalUserSelect } from "./builders";

describe("modal field definition types", () => {
  it("modalTextInput required (default) returns string", () => {
    const field = modalTextInput({ label: "Title" });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<string>>();
  });

  it("modalTextInput required: false returns string | undefined", () => {
    const field = modalTextInput({ label: "Title", required: false });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<string | undefined>>();
  });

  it("modalTextInput required: true returns string", () => {
    const field = modalTextInput({ label: "Title", required: true });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<string>>();
  });

  it("modalStringSelect single (default) returns string literal union", () => {
    const field = modalStringSelect({ label: "Priority", options: ["low", "medium", "high"] as const });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<"low" | "medium" | "high">>();
  });

  it("modalStringSelect maxValues > 1 returns array of string literal union", () => {
    const field = modalStringSelect({ label: "Tags", options: ["bug", "docs", "feature"] as const, maxValues: 3 });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<("bug" | "docs" | "feature")[]>>();
  });

  it("modalStringSelect required: false with single returns union | undefined", () => {
    const field = modalStringSelect({ label: "Status", options: ["open", "closed"] as const, required: false });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<"open" | "closed" | undefined>>();
  });

  it("modalUserSelect single returns User", () => {
    const field = modalUserSelect({ label: "User" });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<User>>();
  });

  it("modalUserSelect maxValues > 1 returns User[]", () => {
    const field = modalUserSelect({ label: "Users", maxValues: 3 });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<User[]>>();
  });

  it("modalRoleSelect single returns Role", () => {
    const field = modalRoleSelect({ label: "Role" });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<Role>>();
  });

  it("modalMentionableSelect single returns User | Role", () => {
    const field = modalMentionableSelect({ label: "Mention" });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<User | Role>>();
  });

  it("modalChannelSelect single returns GuildBasedChannel", () => {
    const field = modalChannelSelect({ label: "Channel" });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<GuildBasedChannel>>();
  });

  it("modalFileUpload single returns Attachment", () => {
    const field = modalFileUpload({ label: "File" });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<Attachment>>();
  });

  it("modalRadioGroup required (default) returns string literal union", () => {
    const field = modalRadioGroup({ label: "Choice", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] as const });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<"a" | "b">>();
  });

  it("modalCheckboxGroup returns array of string literal union", () => {
    const field = modalCheckboxGroup({ label: "Checks", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] as const });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<("a" | "b")[]>>();
  });

  it("modalCheckbox returns boolean", () => {
    const field = modalCheckbox({ label: "Accept" });
    expectTypeOf(field).toEqualTypeOf<ModalFieldDefinition<boolean>>();
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
