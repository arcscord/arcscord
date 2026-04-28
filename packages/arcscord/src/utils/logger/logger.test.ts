import { BaseError } from "@arcscord/better-error";
import { describe, expect, it } from "vitest";
import { ArcLogger } from "./logger.class";
import { createErrorReport, renderJsonErrorReport } from "./logger.report";
import { resolveLogLevel } from "./logger.util";

describe("arcLogger", () => {
  it("filters logs below the configured level", () => {
    const output: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => output.push(...data), {
      level: "warning",
    });

    logger.debug("debug message");
    logger.info("info message");
    logger.warning("warning message");

    expect(output).toHaveLength(1);
    expect(String(output[0])).toContain("warning message");
  });

  it("supports warn as an alias for warning", () => {
    expect(resolveLogLevel("warn")).toBe("warning");
  });

  it("writes regular logs as JSON when configured", () => {
    const output: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => output.push(...data), {
      format: "json",
    });

    logger.info("started");

    expect(output).toHaveLength(1);
    expect(JSON.parse(String(output[0]))).toMatchObject({
      level: "info",
      process: "test",
      message: "started",
    });
  });

  it("serializes errors without dumping raw object properties", () => {
    const error = new BaseError({
      message: "failed",
      customId: "err_test",
      debugs: {
        token: "secret-token",
        customId: "button:test",
      },
    });

    const report = createErrorReport(error);

    expect(report).toMatchObject({
      id: "err_test",
      level: "error",
      message: "baseError: failed",
      error: {
        type: "baseError",
        message: "failed",
      },
      debug: {
        token: "[redacted]",
        customId: "button:test",
      },
    });
  });

  it("writes detailed reports to the diagnostic sink", () => {
    const consoleOutput: unknown[] = [];
    const diagnostics: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => consoleOutput.push(...data), {
      diagnostics: {
        enabled: true,
        format: "json",
        loggerFunc: (...data) => diagnostics.push(...data),
      },
    });
    const error = new BaseError({
      message: "failed",
      customId: "err_test",
      debugs: {
        command: "ping",
      },
    });

    logger.logError(error);

    expect(consoleOutput).toHaveLength(1);
    expect(diagnostics).toHaveLength(1);
    expect(JSON.parse(String(diagnostics[0]))).toMatchObject({
      level: "error",
      process: "test",
      errorId: "err_test",
      debug: {
        command: "ping",
      },
    });
  });

  it("does not write diagnostics when the diagnostic sink is disabled", () => {
    const consoleOutput: unknown[] = [];
    const diagnostics: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => consoleOutput.push(...data), {
      diagnostics: {
        enabled: false,
        loggerFunc: (...data) => diagnostics.push(...data),
      },
    });

    logger.logError(new BaseError("failed"));

    expect(consoleOutput).toHaveLength(1);
    expect(diagnostics).toHaveLength(0);
  });

  it("renders JSON error reports", () => {
    const error = new BaseError({
      message: "failed",
      customId: "err_test",
    });
    const report = createErrorReport(error);

    expect(JSON.parse(renderJsonErrorReport(report, "test"))).toMatchObject({
      level: "error",
      process: "test",
      errorId: "err_test",
      message: "baseError: failed",
    });
  });
});
