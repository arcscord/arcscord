import type {
  CommandBotPermissionMiddlewareMessageOptions,
  ComponentBotPermissionMiddlewareMessageOptions,
  ComponentMemberPermissionMiddlewareMessageOptions,
  MessageOptions,
} from "@arcscord/middleware";
import type { CommandContext, ComponentContext } from "arcscord";
import { localization } from "../localization";

export const commandAllowListMessage: MessageOptions<undefined, CommandContext> = ({ ctx }) => ({
  content: localization.getFixed(ctx)($ => $.middleware.command.allowList),
});

export const commandBotPermissionMessage: MessageOptions<CommandBotPermissionMiddlewareMessageOptions, CommandContext> = ({ ctx, missingPermissions }) => ({
  content: localization.getFixed(ctx)($ => $.middleware.command.botPermission, {
    permissions: missingPermissions.join(", "),
  }),
});

export const componentAuthorOnlyMessage: MessageOptions<undefined, ComponentContext> = ({ ctx }) => ({
  content: localization.getFixed(ctx)($ => $.middleware.component.authorOnly),
});

export const componentAllowListMessage: MessageOptions<undefined, ComponentContext> = ({ ctx }) => ({
  content: localization.getFixed(ctx)($ => $.middleware.component.allowList),
});

export const componentBotPermissionMessage: MessageOptions<ComponentBotPermissionMiddlewareMessageOptions, ComponentContext> = ({ ctx, missingPermissions }) => ({
  content: localization.getFixed(ctx)($ => $.middleware.component.botPermission, {
    permissions: missingPermissions.join(", "),
  }),
});

export const componentMemberPermissionMessage: MessageOptions<ComponentMemberPermissionMiddlewareMessageOptions, ComponentContext> = ({ ctx, missingPermissions }) => ({
  content: localization.getFixed(ctx)($ => $.middleware.component.memberPermission, {
    permissions: missingPermissions.join(", "),
  }),
});
