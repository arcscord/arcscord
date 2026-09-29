import type {
  CommandBotPermissionMiddlewareMessageOptions,
  ComponentBotPermissionMiddlewareMessageOptions,
  ComponentMemberPermissionMiddlewareMessageOptions,
  MessageOptions,
} from "@arcscord/middleware";
import type { CommandContext, ComponentContext } from "arcscord";
import { localization } from "../localization";

export const commandAllowListMessage: MessageOptions<undefined, CommandContext> = ({ ctx }) => ({
  content: localization.getFixed(ctx).middleware_command_allow_list(),
});

export const commandBotPermissionMessage: MessageOptions<CommandBotPermissionMiddlewareMessageOptions, CommandContext> = ({ ctx, missingPermissions }) => ({
  content: localization.getFixed(ctx).middleware_command_bot_permission({
    permissions: missingPermissions.join(", "),
  }),
});

export const componentAuthorOnlyMessage: MessageOptions<undefined, ComponentContext> = ({ ctx }) => ({
  content: localization.getFixed(ctx).middleware_component_author_only(),
});

export const componentAllowListMessage: MessageOptions<undefined, ComponentContext> = ({ ctx }) => ({
  content: localization.getFixed(ctx).middleware_component_allow_list(),
});

export const componentBotPermissionMessage: MessageOptions<ComponentBotPermissionMiddlewareMessageOptions, ComponentContext> = ({ ctx, missingPermissions }) => ({
  content: localization.getFixed(ctx).middleware_component_bot_permission({
    permissions: missingPermissions.join(", "),
  }),
});

export const componentMemberPermissionMessage: MessageOptions<ComponentMemberPermissionMiddlewareMessageOptions, ComponentContext> = ({ ctx, missingPermissions }) => ({
  content: localization.getFixed(ctx).middleware_component_member_permission({
    permissions: missingPermissions.join(", "),
  }),
});
