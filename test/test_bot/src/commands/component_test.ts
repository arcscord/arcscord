import { Buffer } from "node:buffer";
import {
  accessory,
  actionRow,
  container,
  createCommand,
  file,
  mediaGallery,
  section,
  separator,
  text,
  thumbnail,
  v2Message,
} from "arcscord";
import { EmbedBuilder } from "discord.js";
import { channelSelectMenu } from "../components/channel_select_menu";
import { i18nButton } from "../components/i18n_button";
import { mentionableSelectMenu } from "../components/mentionable_select_menu";
import {
  middlewareAuthorOnlyButton,
  middlewareBotPermissionButton,
  middlewareMemberPermissionButton,
  middlewareUserAllowListButton,
} from "../components/middleware";
import { feedbackModal, profileModal, selectModal, surveyModal, uploadModal } from "../components/modal";
import { roleSelectMenu } from "../components/role_select_menu";
import { routeParamsButton } from "../components/route_params_button";
import { redSimpleButton, simpleButton } from "../components/simple_button";
import { stringSelectMenu } from "../components/string_select_menu";
import { typedSingleStringSelectMenu } from "../components/typed_single_string_select_menu";
import { typedStringSelectMenu } from "../components/typed_string_select_menu";
import { userSelectMenu } from "../components/user_select_menu";

export const componentTestCommand = createCommand({
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
            name: "typed_string_select",
            value: "typed_string_select",
          },
          {
            name: "typed_single_string_select",
            value: "typed_single_string_select",
          },
          {
            name: "select",
            value: "select",
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
            name: "modal_upload",
            value: "modal_upload",
          },
          {
            name: "modal_selects",
            value: "modal_selects",
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
          {
            name: "components_v2_practical",
            value: "components_v2_practical",
          },
          {
            name: "components_v2_i18n",
            value: "components_v2_i18n",
          },
          {
            name: "components_v2_migration",
            value: "components_v2_migration",
          },
          {
            name: "route_params",
            value: "route_params",
          },
          "middleware",
        ],
      } as const,
    },
  },
  run: async (ctx) => {
    switch (ctx.options.component) {
      case "simple_button":
        return ctx.reply({
          components: [actionRow(simpleButton.build())],
          content: ctx.options.component,
        });
      case "typed_string_select":
        return ctx.reply({
          components: [typedStringSelectMenu.build()],
          content: ctx.options.component,
        });
      case "typed_single_string_select":
        return ctx.reply({
          components: [typedSingleStringSelectMenu.build()],
          content: ctx.options.component,
        });
      case "select":
        return ctx.reply(v2Message(
          "# Select a value",
          stringSelectMenu.build("fun", "happy", "arcscord"),
          separator({ divider: false }),
          "Select a user",
          userSelectMenu.build(),
          separator({ spacing: "small" }),
          "# Select a role",
          roleSelectMenu.build("Select a role"),
          separator({ spacing: "large" }),
          "# Select a mentionable",
          mentionableSelectMenu.build(),
          separator({ divider: true }),
          "# Select a channel",
          channelSelectMenu.build(),
        ));
      case "modal_profile":
        // object build args: override the displayed labels at build time
        return ctx.showModal(profileModal.build({ title: "Profil", name: "Nom", age: "Âge" }));
      case "modal_feedback":
        return ctx.showModal(feedbackModal.build());
      case "modal_survey":
        // override the radio group label + one option label (keyed by value)
        return ctx.showModal(surveyModal.build({ moodLabel: "Humeur", great: "Excellent" }));
      case "modal_upload":
        return ctx.showModal(uploadModal.build());
      case "modal_selects":
        return ctx.showModal(selectModal.build());
      case "components_v2_layout":
        return ctx.reply(
          v2Message(
            text("## Components v2 - layout\nText display, container, section, thumbnail, separator, and action row."),
            section({
              id: 1,
            }, "Top-level section with a thumbnail accessory.", accessory(
              thumbnail({
                media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" },
                description: "Default Discord avatar",
              }),
            )),
            separator({
              divider: true,
              spacing: "large",
            }),
            container(
              { accentColor: 0x5865F2 },
              "Container content can group text, sections, separators, and action rows.",
              section(
                "A section can place text next to an accessory.",
                accessory(
                  thumbnail({
                    media: { url: "https://cdn.discordapp.com/embed/avatars/0.png" },
                    description: "Default Discord avatar",
                  }),
                ),
              ),
              separator({ divider: true, spacing: "large" }),
              actionRow(simpleButton.build()),
            ),
          ),
        );
      case "components_v2_media":
        return ctx.reply(v2Message({
          files: [
            {
              attachment: Buffer.from("This file is rendered by a Components v2 File component.\n"),
              name: "components-v2-note.txt",
            },
          ],
        }, text("## Components v2 - media\nMedia gallery and file component with an uploaded attachment."), mediaGallery({
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
        }), file({
          file: { url: "attachment://components-v2-note.txt" },
        })));
      case "components_v2_complete":
        return ctx.reply(v2Message({
          files: [
            {
              attachment: Buffer.from("Complete Components v2 example attachment.\n"),
              name: "components-v2-complete.txt",
            },
          ],
        }, text("## Components v2 - complete\nA denser payload that combines every message-only v2 component shape."), container(
          { accentColor: 0x57F287, spoiler: false },
          "Inside a container: text display, section, gallery, file, separator, and action row.",
          section(
            "Section accessory can also be an interactive button.",
            accessory(simpleButton.build()),
          ),
          mediaGallery({
            items: [
              {
                media: { url: "https://cdn.discordapp.com/embed/avatars/3.png" },
                description: "Nested gallery image",
              },
            ],
          }),
          file({
            file: { url: "attachment://components-v2-complete.txt" },
          }),
          separator({ divider: false, spacing: "small" }),
          actionRow(redSimpleButton.build()),
        )));
      case "components_v2_practical":
        return ctx.reply(
          v2Message(
            container(
              section(
                "Support",
                "Click to open a support ticket.",
                accessory(simpleButton.build()),
              ),
              separator({ spacing: "large" }),
              section(
                "Bug",
                "Report a bug to the team.",
                accessory(redSimpleButton.build()),
              ),
            ),
          ),
        );
      case "components_v2_i18n":
        return ctx.reply(
          v2Message(
            container(
              section(
                ctx.t($ => $.componentsV2.i18n.support.title),
                ctx.t($ => $.componentsV2.i18n.support.description),
                accessory(i18nButton.build()),
              ),
              separator({ spacing: "large" }),
              section(
                ctx.t($ => $.componentsV2.i18n.bug.title),
                ctx.t($ => $.componentsV2.i18n.bug.description),
                accessory(redSimpleButton.build()),
              ),
            ),
          ),
        );
      case "components_v2_migration": {
        const legacyReply = await ctx.reply({
          content: "Legacy message content that must be cleared.",
          embeds: [
            new EmbedBuilder()
              .setTitle("Legacy embed")
              .setDescription("This embed should disappear during the Components V2 migration."),
          ],
        });
        if (legacyReply[0] !== null) {
          return legacyReply;
        }
        return ctx.editReply(v2Message(
          { content: null, embeds: [] },
          container(
            { accentColor: 0x57F287 },
            "## Components V2 migration succeeded",
            "The legacy content and embed were cleared before enabling `IsComponentsV2`.",
          ),
        ));
      }
      case "middleware":
        return ctx.reply({
          components: [
            actionRow(
              middlewareAuthorOnlyButton.build(),
              middlewareUserAllowListButton.build(),
              middlewareBotPermissionButton.build(),
              middlewareMemberPermissionButton.build(),
            ),
          ],
          content: ctx.options.component,
        });
      case "route_params":
        return ctx.reply({
          components: [actionRow(routeParamsButton.build({ userId: ctx.user.id, filter: "all/active" }))],
          content: ctx.options.component,
        });
      default:
        return ctx.reply("No component found");
    }
  },
});
