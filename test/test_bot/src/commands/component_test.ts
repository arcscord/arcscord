import { Buffer } from "node:buffer";
import {
  buildButtonActionRow,
  buildContainer,
  buildFile,
  buildMediaGallery,
  buildSection,
  buildSeparator,
  buildTextDisplay,
  createCommand,
} from "arcscord";
import { ComponentType, MessageFlags } from "discord.js";
import { channelSelectMenu } from "../components/channel_select_menu";
import { mentionableSelectMenu } from "../components/mentionable_select_menu";
import { middleWareButton } from "../components/middleware";
import { feedbackModal, profileModal, surveyModal } from "../components/modal";
import { roleSelectMenu } from "../components/role_select_menu";
import { redSimpleButton, simpleButton } from "../components/simple_button";
import { stringSelectMenu } from "../components/string_select_menu";
import { userSelectMenu } from "../components/user_select_menu";

export const componentTestCommand = createCommand({
  build: {
    slash: {
      name: "component-test",
      description: "Components tests",
      options: {
        component: {
          description: "Component to send",
          type: "string",
          required: true,
          choices: [
            {
              name: "simple_button",
              value: "simple_button",
            },
            {
              name: "string_select",
              value: "string_select",
            },
            {
              name: "user_select",
              value: "user_select",
            },
            {
              name: "role_select",
              value: "role_select",
            },
            {
              name: "mentionable_select",
              value: "mentionable_select",
            },
            {
              name: "channel_select",
              value: "channel_select",
            },
            {
              name: "modal_profile",
              value: "modal_profile",
            },
            {
              name: "modal_feedback",
              value: "modal_feedback",
            },
            {
              name: "modal_survey",
              value: "modal_survey",
            },
            {
              name: "components_v2_layout",
              value: "components_v2_layout",
            },
            {
              name: "components_v2_media",
              value: "components_v2_media",
            },
            {
              name: "components_v2_complete",
              value: "components_v2_complete",
            },
            "middleware",
          ],
        } as const,
      },
    },
  },
  run: async (ctx) => {
    switch (ctx.options.component) {
      case "simple_button":
        return ctx.reply({
          components: [buildButtonActionRow(simpleButton.build())],
          content: ctx.options.component,
        });
      case "string_select":
        return ctx.reply({
          components: [stringSelectMenu.build("fun", "happy")],
          content: ctx.options.component,
        });
      case "user_select":
        return ctx.reply({
          components: [userSelectMenu.build()],
          content: ctx.options.component,
        });
      case "role_select":
        return ctx.reply({
          components: [roleSelectMenu.build("Select a role")],
          content: ctx.options.component,
        });
      case "mentionable_select":
        return ctx.reply({
          components: [mentionableSelectMenu.build()],
          content: ctx.options.component,
        });
      case "channel_select":
        return ctx.reply({
          components: [channelSelectMenu.build()],
          content: ctx.options.component,
        });
      case "modal_profile":
        return ctx.showModal(profileModal.build("Profile"));
      case "modal_feedback":
        return ctx.showModal(feedbackModal.build("Feedback"));
      case "modal_survey":
        return ctx.showModal(surveyModal.build("Survey"));
      case "components_v2_layout":
        return ctx.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            buildTextDisplay({
              content: "## Components v2 - layout\nText display, container, section, thumbnail, separator, and action row.",
            }),
            buildSection({
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: "Top-level section with a thumbnail accessory.",
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" },
                description: "Default Discord avatar",
              },
            }),
            buildSeparator({
              divider: true,
              spacing: "large",
            }),
            buildContainer({
              accentColor: 0x5865F2,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: "Container content can group text, sections, separators, and action rows.",
                },
                {
                  type: ComponentType.Section,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content: "A section can place text next to an accessory.",
                    },
                  ],
                  accessory: {
                    type: ComponentType.Thumbnail,
                    media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" },
                    description: "Default Discord avatar",
                  },
                },
                {
                  type: ComponentType.Separator,
                  divider: true,
                  spacing: "large",
                },
                buildButtonActionRow(simpleButton.build()),
              ],
            }),
          ],
        });
      case "components_v2_media":
        return ctx.reply({
          flags: MessageFlags.IsComponentsV2,
          files: [
            {
              attachment: Buffer.from("This file is rendered by a Components v2 File component.\n"),
              name: "components-v2-note.txt",
            },
          ],
          components: [
            buildTextDisplay({
              content: "## Components v2 - media\nMedia gallery and file component with an uploaded attachment.",
            }),
            buildMediaGallery({
              items: [
                {
                  media: { url: "https://cdn.discordapp.com/embed/avatars/1.png" },
                  description: "Gallery image 1",
                },
                {
                  media: { url: "https://cdn.discordapp.com/embed/avatars/2.png" },
                  description: "Gallery image 2",
                  spoiler: true,
                },
              ],
            }),
            buildFile({
              file: { url: "attachment://components-v2-note.txt" },
            }),
          ],
        });
      case "components_v2_complete":
        return ctx.reply({
          flags: MessageFlags.IsComponentsV2,
          files: [
            {
              attachment: Buffer.from("Complete Components v2 example attachment.\n"),
              name: "components-v2-complete.txt",
            },
          ],
          components: [
            buildTextDisplay({
              content: "## Components v2 - complete\nA denser payload that combines every message-only v2 component shape.",
            }),
            buildContainer({
              accentColor: 0x57F287,
              spoiler: false,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: "Inside a container: text display, section, gallery, file, separator, and action row.",
                },
                {
                  type: ComponentType.Section,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content: "Section accessory can also be an interactive button.",
                    },
                  ],
                  accessory: simpleButton.build(),
                },
                {
                  type: ComponentType.MediaGallery,
                  items: [
                    {
                      media: { url: "https://cdn.discordapp.com/embed/avatars/3.png" },
                      description: "Nested gallery image",
                    },
                  ],
                },
                {
                  type: ComponentType.File,
                  file: { url: "attachment://components-v2-complete.txt" },
                },
                {
                  type: ComponentType.Separator,
                  divider: false,
                  spacing: "small",
                },
                buildButtonActionRow(redSimpleButton.build()),
              ],
            }),
          ],
        });
      case "middleware":
        return ctx.reply({
          components: [buildButtonActionRow(middleWareButton.build())],
          content: ctx.options.component,
        });
      default:
        return ctx.reply("No component found");
    }
  },
});
