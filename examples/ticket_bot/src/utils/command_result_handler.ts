import type { CommandResultHandler } from "arcscord";
import { prisma } from "#/utils/prisma";

/**
 * Custom command result handler wired through `managers.command.resultHandler`.
 *
 * It records the invocation in the `CommandUsage` table (read back by `/stats`),
 * then delegates to the framework default (`manager.defaultResultHandler`) for
 * the usual logging + user-facing error reply — no need to reimplement it.
 */
export const commandResultHandler: CommandResultHandler = async (infos, manager) => {
  const name = infos.interaction.commandName;

  await prisma.commandUsage.upsert({
    where: { name },
    create: { name, count: 1 },
    update: { count: { increment: 1 } },
  });

  return manager.defaultResultHandler(infos);
};
