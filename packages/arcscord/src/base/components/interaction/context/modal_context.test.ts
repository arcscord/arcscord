import type { Attachment, GuildBasedChannel, ModalSubmitInteraction, Role, User } from "discord.js";
import { ComponentType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import {
  modalChannelSelect,
  modalCheckbox,
  modalCheckboxGroup,
  modalFileUpload,
  modalMentionableSelect,
  modalRoleSelect,
  modalStringSelect,
  modalTextInput,
  modalUserSelect,
} from "../../modal";
import { withModalFieldIds } from "../../modal/builders";
import { parseModalFieldValues, readModalRawValues } from "./modal_context";

function collection<T extends { id: string }>(values: T[]): Map<string, T> {
  return new Map(values.map(value => [value.id, value]));
}

function createModalSubmitInteraction(fields: Record<string, Record<string, unknown>>): ModalSubmitInteraction {
  return {
    fields: {
      fields: new Map(Object.entries(fields).map(([customId, field]) => [customId, { customId, ...field }])),
    },
  } as unknown as ModalSubmitInteraction;
}

describe("modal context values", () => {
  it("parses raw modal submit fields through typed field definitions", () => {
    const fields = withModalFieldIds({
      title: modalTextInput({
        label: "Title",
        required: true,
      }),
      optional: modalTextInput({
        label: "Optional",
        required: false,
      }),
      priority: modalStringSelect({
        label: "Priority",
        options: ["low", "medium", "high"],
      }),
      tags: modalStringSelect({
        label: "Tags",
        maxValues: 3,
        options: ["bug", "docs", "feature"],
      }),
      accepted: modalCheckbox({
        label: "Accepted",
      }),
      checks: modalCheckboxGroup({
        label: "Checks",
        options: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
        ],
      }),
      assignee: modalUserSelect({
        label: "Assignee",
      }),
      reviewers: modalUserSelect({
        label: "Reviewers",
        maxValues: 3,
      }),
      role: modalRoleSelect({
        label: "Role",
      }),
      mention: modalMentionableSelect({
        label: "Mention",
      }),
      channel: modalChannelSelect({
        label: "Channel",
      }),
      file: modalFileUpload({
        label: "File",
      }),
    });

    const user = { id: "user_1", username: "Ada" } as User;
    const reviewer = { id: "user_2", username: "Grace" } as User;
    const role = { id: "role_1", name: "Maintainer" } as Role;
    const channel = { id: "channel_1", name: "support" } as GuildBasedChannel;
    const file = { id: "attachment_1", name: "trace.txt" } as Attachment;
    const interaction = createModalSubmitInteraction({
      accepted: { type: ComponentType.Checkbox, value: true },
      assignee: { type: ComponentType.UserSelect, users: collection([user]), values: ["user_1"] },
      channel: { channels: collection([channel]), type: ComponentType.ChannelSelect, values: ["channel_1"] },
      checks: { type: ComponentType.CheckboxGroup, values: ["a", "b"] },
      file: { attachments: collection([file]), type: ComponentType.FileUpload, values: ["attachment_1"] },
      mention: { roles: collection([role]), type: ComponentType.MentionableSelect, users: collection([]), values: ["role_1"] },
      optional: { type: ComponentType.TextInput, value: "" },
      priority: { type: ComponentType.StringSelect, values: ["high"] },
      reviewers: { type: ComponentType.UserSelect, users: collection([user, reviewer]), values: ["user_1", "user_2"] },
      role: { roles: collection([role]), type: ComponentType.RoleSelect, values: ["role_1"] },
      tags: { type: ComponentType.StringSelect, values: ["bug", "docs"] },
      title: { type: ComponentType.TextInput, value: "Crash report" },
    });

    const rawValues = readModalRawValues(interaction);
    const parsed = parseModalFieldValues(fields, rawValues, new Map(interaction.fields.fields.entries()));

    const priority: "low" | "medium" | "high" = parsed.priority;
    const tags: Array<"bug" | "docs" | "feature"> = parsed.tags;
    const assignee: User = parsed.assignee;
    const reviewers: User[] = parsed.reviewers;
    const selectedRole: Role = parsed.role;
    const mention: User | Role = parsed.mention;
    const selectedChannel: GuildBasedChannel = parsed.channel;
    const uploadedFile: Attachment = parsed.file;

    expect(priority).toBe("high");
    expect(tags).toEqual(["bug", "docs"]);
    expect(assignee).toBe(user);
    expect(reviewers).toEqual([user, reviewer]);
    expect(selectedRole).toBe(role);
    expect(mention).toBe(role);
    expect(selectedChannel).toBe(channel);
    expect(uploadedFile).toBe(file);
    expect(parsed).toEqual({
      accepted: true,
      assignee: user,
      channel,
      checks: ["a", "b"],
      file,
      mention: role,
      optional: undefined,
      priority: "high",
      reviewers: [user, reviewer],
      role,
      tags: ["bug", "docs"],
      title: "Crash report",
    });
  });

  it("throws when Discord returns a mismatched field type", () => {
    const fields = withModalFieldIds({
      title: modalTextInput({
        label: "Title",
      }),
    });
    const interaction = createModalSubmitInteraction({
      title: { type: ComponentType.StringSelect, values: ["wrong"] },
    });

    expect(() => parseModalFieldValues(
      fields,
      readModalRawValues(interaction),
      new Map(interaction.fields.fields.entries()),
    )).toThrow("expected Discord component type");
  });

  it("throws when a typed string select receives an undeclared value", () => {
    const fields = withModalFieldIds({
      priority: modalStringSelect({
        label: "Priority",
        options: ["low", "medium", "high"],
      }),
    });
    const interaction = createModalSubmitInteraction({
      priority: { type: ComponentType.StringSelect, values: ["urgent"] },
    });

    expect(() => parseModalFieldValues(
      fields,
      readModalRawValues(interaction),
      new Map(interaction.fields.fields.entries()),
    )).toThrow("received invalid values");
  });
});
