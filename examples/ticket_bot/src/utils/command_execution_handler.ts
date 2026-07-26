import type { CommandExecutionHandler } from "arcscord";
import { prisma } from "#/utils/prisma";

/**
 * Custom command execution handler wired through
 * `managers.command.executionHandlers`.
 *
 * It lets the command pipeline complete, then records the invocation in the
 * `CommandUsage` table (read back by `/stats`). The default execution handler
 * wraps this handler and applies Arcscord's normal logging and error reply.
 */
export const commandUsageExecutionHandler: CommandExecutionHandler = async (execution, next) => {
  const outcome = await next();
  const name = execution.interaction.commandName;

  await prisma.commandUsage.upsert({
    where: { name },
    create: { name, count: 1 },
    update: { count: { increment: 1 } },
  });

  return outcome;
};
