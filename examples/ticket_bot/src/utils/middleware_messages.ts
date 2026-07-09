import type { ComponentMemberPermissionMiddlewareMessageOptions, MessageOptions } from "@arcscord/middleware";
import type { ComponentContext } from "arcscord";

/**
 * Reply sent by `ComponentMemberPermissionMiddleware` when the clicking member
 * lacks the required permission. The callback receives the interaction context,
 * so the message is localized via `ctx.t`.
 */
export const manageThreadsMessage: MessageOptions<
  ComponentMemberPermissionMiddlewareMessageOptions,
  ComponentContext
> = ({ t }) => ({
  content: t($ => $.ticket.missing_manage_threads),
});
