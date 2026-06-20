import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { createMockCommandInteraction } from "#/testing";
import {
  commandInteractionToString,
  slashCommandOptionValueToString,
} from "./command.util";

describe("command util string formatting", () => {
  it("formats slash command option values by type", () => {
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Subcommand, name: "run" } as any)).toBe("Sub<run>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.SubcommandGroup, name: "admin" } as any)).toBe("SubGroup<admin>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.String, value: "hello" } as any)).toBe("String<hello>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Integer, value: 42 } as any)).toBe("Integer<42>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Boolean, value: false } as any)).toBe("Boolean<false>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.User, value: "user_1" } as any)).toBe("User<user_1>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Channel, value: "channel_1" } as any)).toBe("Channel<channel_1>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Role, value: "role_1" } as any)).toBe("Role<role_1>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Mentionable, value: "mention_1" } as any)).toBe("Mentionable<mention_1>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Number, value: 3.14 } as any)).toBe("Number<3.14>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Attachment, value: "file_1" } as any)).toBe("Attachment<file_1>");
    expect(slashCommandOptionValueToString({ type: ApplicationCommandOptionType.Attachment, value: "x".repeat(50) } as any)).toBe("Attachment<to length>");
    expect(slashCommandOptionValueToString({ type: 999, value: "value" } as any)).toBe("Unknown<value>");
  });

  it("formats chat input commands without options by default", () => {
    const interaction = createMockCommandInteraction({
      commandName: "ping",
      commandId: "cmd_1",
      options: {
        data: [
          { type: ApplicationCommandOptionType.String, name: "target", value: "world" },
        ],
      },
    });

    expect(commandInteractionToString(interaction)).toBe("slash:ping (cmd_1)");
  });

  it("formats chat input commands with subcommands and options", () => {
    const interaction = createMockCommandInteraction({
      commandName: "admin",
      commandId: "cmd_2",
      options: {
        data: [
          {
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: "users",
            options: [
              {
                type: ApplicationCommandOptionType.Subcommand,
                name: "ban",
                options: [
                  { type: ApplicationCommandOptionType.User, name: "target", value: "user_1" },
                  { type: ApplicationCommandOptionType.String, name: "reason", value: "spam" },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(commandInteractionToString(interaction, false)).toBe(
      "slash:admin.users.ban (cmd_2) target=User<user_1> reason=String<spam>",
    );
  });

  it("formats user context menu commands", () => {
    const interaction = createMockCommandInteraction({
      kind: "userContextMenu",
      commandName: "Profile",
      commandId: "cmd_3",
      targetId: "user_1",
    });

    expect(commandInteractionToString(interaction)).toBe("user:Profile (cmd_3) targetUser=user_1");
  });

  it("formats message context menu commands", () => {
    const interaction = createMockCommandInteraction({
      kind: "messageContextMenu",
      commandName: "Info",
      commandId: "cmd_4",
      targetId: "message_1",
      targetMessage: {
        channelId: "channel_1",
        guildId: "guild_1",
      },
    });

    expect(commandInteractionToString(interaction)).toBe(
      "msg:Info (cmd_4) targetMessage=message_1 targetChannel=channel_1 targetGuild=guild_1",
    );
  });

  it("formats unknown command interactions", () => {
    const interaction = createMockCommandInteraction({
      kind: "unknown",
    });

    expect(commandInteractionToString(interaction)).toBe("Unknown Command");
  });
});
