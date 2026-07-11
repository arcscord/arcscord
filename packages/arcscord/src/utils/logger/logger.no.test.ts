import * as console from "node:console";
import { describe, expect, it } from "vitest";
import { ArcscordError, defaultLogger } from "#/utils";
import { formatLog } from "./logger.util";

describe("logs texts", () => {
  it("some logs tests", () => {
    console.log(formatLog("trace", "test"));
    console.log(formatLog("debug", "test"));
    console.log(formatLog("info", "test"));
    console.log(formatLog("warn", "test"));
    console.log(formatLog("error", "test"));
    console.log(formatLog("fatal", "test"));

    console.log(formatLog("info", "test2", "database"));

    defaultLogger.debug(["name", "zghgu"]);
    defaultLogger.error("erroooor", {
      author: "arcoz",
      server: "test",
      command: "testing",
    });

    try {
      // noinspection ExceptionCaughtLocallyJS
      throw new ArcscordError({
        code: "APPLICATION_UNAVAILABLE",
        message: "oook",
        metadata: { operation: "logger-demo" },
      });
    }
    catch (error) {
      if (error instanceof ArcscordError) {
        defaultLogger.logError(error);
      }
    }
    expect(0).toBe(0);
  });
});
