import type {
  CommandBotPermissionMiddlewareMessageOptions,
  ComponentBotPermissionMiddlewareMessageOptions,
  ComponentMemberPermissionMiddlewareMessageOptions,
  MessageOptions,
} from "@arcscord/middleware";
import type { CommandContext, ComponentContext } from "arcscord";

export const commandAllowListMessage: MessageOptions<undefined, CommandContext> = ({ t }) => ({
  content: t($ => $.middleware.command.allowList),
});

export const commandBotPermissionMessage: MessageOptions<CommandBotPermissionMiddlewareMessageOptions, CommandContext> = ({ missingPermissions, t }) => ({
  content: t($ => $.middleware.command.botPermission, {
    permissions: missingPermissions.join(", "),
  }),
});

export const componentAuthorOnlyMessage: MessageOptions<undefined, ComponentContext> = ({ t }) => ({
  content: t($ => $.middleware.component.authorOnly),
});

export const componentAllowListMessage: MessageOptions<undefined, ComponentContext> = ({ t }) => ({
  content: t($ => $.middleware.component.allowList),
});

export const componentBotPermissionMessage: MessageOptions<ComponentBotPermissionMiddlewareMessageOptions, ComponentContext> = ({ missingPermissions, t }) => ({
  content: t($ => $.middleware.component.botPermission, {
    permissions: missingPermissions.join(", "),
  }),
});

export const componentMemberPermissionMessage: MessageOptions<ComponentMemberPermissionMiddlewareMessageOptions, ComponentContext> = ({ missingPermissions, t }) => ({
  content: t($ => $.middleware.component.memberPermission, {
    permissions: missingPermissions.join(", "),
  }),
});
