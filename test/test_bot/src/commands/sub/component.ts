import { actionRow, createSubCommand } from "arcscord";
import { profileModal } from "../../components/modal";
import { simpleButton } from "../../components/simple_button";
import { stringSelectMenu } from "../../components/string_select_menu";

export const buttonComponentSubCommand = createSubCommand({
  name: "button",
  description: "Send a button",
  run: (ctx) => {
    return ctx.reply("Button :", {
      components: [actionRow(simpleButton.build())],
    });
  },
});

export const modalComponentSubCommand = createSubCommand({
  name: "modal",
  description: "show a modal",
  run: (ctx) => {
    return ctx.showModal(profileModal.build());
  },
});

export const stringSelectMenuComponentSubCommand = createSubCommand({
  name: "string-select-menu",
  description: "Send a string menu",
  run: (ctx) => {
    return ctx.reply("Button :", {
      components: [stringSelectMenu.build()],
    });
  },
});
