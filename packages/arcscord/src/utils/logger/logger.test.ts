import { describe, expect, it, vi } from "vitest";
import { ArcscordError } from "#/utils/error/arcscord_error";
import { ArcLogger } from "./logger.class";
import { createErrorReport, renderJsonErrorReport } from "./logger.report";
import { resolveLogLevel } from "./logger.util";

describe("arcLogger", () => {
  it("filters logs below the configured level", () => {
    const output: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => output.push(...data), {
      level: "warn",
    });

    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warning message");

    expect(output).toHaveLength(1);
    expect(String(output[0])).toContain("warning message");
  });

  it("supports warning as a legacy alias for warn", () => {
    expect(resolveLogLevel("warning")).toBe("warn");
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

  it("merges meta fields into the JSON output", () => {
    const output: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => output.push(...data), {
      format: "json",
    });

    logger.info("started", { userId: "42" });

    expect(JSON.parse(String(output[0]))).toMatchObject({
      message: "started",
      meta: { userId: "42" },
    });
  });

  it("renders meta fields as extra lines in pretty mode", () => {
    const output: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => output.push(...data));

    logger.info("started", { userId: "42" });

    expect(output).toHaveLength(2);
    expect(String(output[1])).toContain("userId");
    expect(String(output[1])).toContain("42");
  });

  it("does not emit meta lines for a filtered-out level", () => {
    const output: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => output.push(...data), {
      level: "error",
    });

    logger.warn("warning message", { userId: "42" });

    expect(output).toHaveLength(0);
  });

  it("serializes errors without dumping raw object properties", () => {
    const error = new ArcscordError({
      code: "COMMAND_VALIDATION_FAILED",
      message: "failed",
      metadata: { rule: "test", token: "secret-token", customId: "button:test" },
    });

    const report = createErrorReport(error);

    expect(report).toMatchObject({
      level: "error",
      message: "ArcscordError [COMMAND_VALIDATION_FAILED]: failed",
      error: {
        type: "ArcscordError",
        code: "COMMAND_VALIDATION_FAILED",
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
        format: "json",
        loggerFunc: (...data) => diagnostics.push(...data),
      },
    });
    const error = new ArcscordError({
      code: "COMMAND_VALIDATION_FAILED",
      message: "failed",
      metadata: { rule: "test", command: "ping" },
    });

    logger.logError(error);

    expect(consoleOutput).toHaveLength(1);
    expect(diagnostics).toHaveLength(1);
    expect(JSON.parse(String(diagnostics[0]))).toMatchObject({
      level: "error",
      process: "test",
      debug: {
        command: "ping",
      },
    });
  });

  it("does not write diagnostics when no diagnostic sink is configured", () => {
    const consoleOutput: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => consoleOutput.push(...data));

    logger.logError(new ArcscordError({ code: "COMMAND_VALIDATION_FAILED", message: "failed", metadata: { rule: "test" } }));

    expect(consoleOutput).toHaveLength(1);
  });

  it("forces short output on the main sink even without a diagnostic sink when errorDetail is \"short\"", () => {
    const consoleOutput: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => consoleOutput.push(...data), {
      errorDetail: "short",
    });

    logger.logError(new ArcscordError({ code: "COMMAND_VALIDATION_FAILED", message: "failed", metadata: { rule: "test" } }));

    expect(String(consoleOutput[0])).not.toContain("at ");
  });

  it("keeps the full stack on the main sink even with a diagnostic sink when errorDetail is \"full\"", () => {
    const consoleOutput: unknown[] = [];
    const diagnostics: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => consoleOutput.push(...data), {
      errorDetail: "full",
      diagnostics: {
        loggerFunc: (...data) => diagnostics.push(...data),
      },
    });

    logger.logError(new ArcscordError({ code: "COMMAND_VALIDATION_FAILED", message: "failed", metadata: { rule: "test" } }));

    expect(String(consoleOutput[0])).toContain("at ");
  });

  it("keeps the full stack on the main sink when no diagnostic sink is configured", () => {
    const consoleOutput: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => consoleOutput.push(...data));

    logger.logError(new ArcscordError({ code: "COMMAND_VALIDATION_FAILED", message: "failed", metadata: { rule: "test" } }));

    expect(String(consoleOutput[0])).toContain("at ");
  });

  it("shortens the main sink output when a diagnostic sink is configured", () => {
    const consoleOutput: unknown[] = [];
    const diagnostics: unknown[] = [];
    const logger = new ArcLogger("test", (...data) => consoleOutput.push(...data), {
      diagnostics: {
        loggerFunc: (...data) => diagnostics.push(...data),
      },
    });

    logger.logError(new ArcscordError({ code: "COMMAND_VALIDATION_FAILED", message: "failed", metadata: { rule: "test" } }));

    expect(String(consoleOutput[0])).not.toContain("at ");
    expect(String(diagnostics[0])).toContain("at ");
  });

  it("merges extra meta into a logError call alongside the error's own debug values", () => {
    const diagnostics: unknown[] = [];
    const logger = new ArcLogger("test", () => {}, {
      format: "json",
      diagnostics: {
        format: "json",
        loggerFunc: (...data) => diagnostics.push(...data),
      },
    });

    logger.logError(new ArcscordError({
      code: "COMMAND_VALIDATION_FAILED",
      message: "failed",
      metadata: { rule: "test", command: "ping" },
    }), { interactionId: "1" });

    expect(JSON.parse(String(diagnostics[0]))).toMatchObject({
      debug: { command: "ping", interactionId: "1" },
    });
  });

  it("renders JSON error reports", () => {
    const error = new ArcscordError({
      code: "COMMAND_VALIDATION_FAILED",
      message: "failed",
      metadata: { rule: "test" },
    });
    const report = createErrorReport(error);

    expect(JSON.parse(renderJsonErrorReport(report, "test"))).toMatchObject({
      level: "error",
      process: "test",
      message: "ArcscordError [COMMAND_VALIDATION_FAILED]: failed",
    });
  });

  describe("child", () => {
    it("merges bound fields into every subsequent call", () => {
      const output: unknown[] = [];
      const logger = new ArcLogger("test", (...data) => output.push(...data), {
        format: "json",
      });

      const child = logger.child({ interactionId: "abc" });
      child.info("started", { extra: true });

      expect(JSON.parse(String(output[0]))).toMatchObject({
        meta: { interactionId: "abc", extra: true },
      });
    });

    it("lets call-site meta override bound fields with the same key", () => {
      const output: unknown[] = [];
      const logger = new ArcLogger("test", (...data) => output.push(...data), {
        format: "json",
      });

      const child = logger.child({ userId: "1" });
      child.info("started", { userId: "2" });

      expect(JSON.parse(String(output[0]))).toMatchObject({
        meta: { userId: "2" },
      });
    });
  });

  describe("default output routing", () => {
    it("routes warn/error/fatal to console.error when no loggerFunc is provided", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const logger = new ArcLogger("test");
      logger.warn("careful");
      logger.info("fyi");

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledTimes(1);

      errorSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
