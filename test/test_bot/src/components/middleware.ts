import process from "node:process";
import {
  AuthorOnlyMiddleware,
  ComponentBotPermissionMiddleware,
  ComponentMemberPermissionMiddleware,
  ComponentUserAllowListMiddleware,
} from "@arcscord/middleware";
import { button, createButton } from "arcscord";
import { MessageFlags } from "discord.js";
import {
  componentAllowListMessage,
  componentAuthorOnlyMessage,
  componentBotPermissionMessage,
  componentMemberPermissionMessage,
} from "../utils/middleware_messages";

const allowedUserIds = (process.env.MIDDLEWARE_ALLOWED_USER_IDS ?? "0")
  .split(",")
  .map(userId => userId.trim());

export const middlewareAuthorOnlyButton = createButton({
  route: "middleware_author_only",
  build: id => button({
    label: "Author only",
    style: "green",
    customId: id(),
  }),
  use: [
    new AuthorOnlyMiddleware(componentAuthorOnlyMessage),
  ],
  run: ctx => ctx.reply(ctx.t($ => $.middleware.component.ok), {
    flags: MessageFlags.Ephemeral,
  }),
});

export const middlewareUserAllowListButton = createButton({
  route: "middleware_user_allow_list",
  build: id => button({
    label: "User allowlist",
    style: "secondary",
    customId: id(),
  }),
  use: [
    new ComponentUserAllowListMiddleware(allowedUserIds, componentAllowListMessage),
  ],
  run: ctx => ctx.reply(ctx.t($ => $.middleware.component.ok), {
    flags: MessageFlags.Ephemeral,
  }),
});

export const middlewareBotPermissionButton = createButton({
  route: "middleware_bot_permission",
  build: id => button({
    label: "Bot permission",
    style: "primary",
    customId: id(),
  }),
  use: [
    new ComponentBotPermissionMiddleware(["ManageMessages"], componentBotPermissionMessage),
  ],
  run: ctx => ctx.reply(ctx.t($ => $.middleware.component.ok), {
    flags: MessageFlags.Ephemeral,
  }),
});

export const middlewareMemberPermissionButton = createButton({
  route: "middleware_member_permission",
  build: id => button({
    label: "Member permission",
    style: "red",
    customId: id(),
  }),
  use: [
    new ComponentMemberPermissionMiddleware(["ManageMessages"], componentMemberPermissionMessage),
  ],
  run: ctx => ctx.reply(ctx.t($ => $.middleware.component.ok), {
    flags: MessageFlags.Ephemeral,
  }),
});
