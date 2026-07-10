import { afterEach, describe, expect, it, vi } from "vitest";
import { ArcLogger } from "./logger.class";
import {
  colorDebugValue,
  createLogger,
  formatJsonLog,
  formatLog,
  resolveDefaultLogFunc,
  resolveLogFormat,
  resolveLogLevel,
  shouldLog,
  shouldUseJsonLogs,
} from "./logger.util";

describe("logger.util", () => {
  describe("resolveLogLevel", () => {
    it.each(["trace", "debug", "info", "warn", "error", "fatal"])("passes through the valid level \"%s\" unchanged", (level) => {
      expect(resolveLogLevel(level)).toBe(level);
    });

    it("maps the legacy \"warning\" alias to \"warn\"", () => {
      expect(resolveLogLevel("warning")).toBe("warn");
    });

    it("falls back to \"info\" for an unknown level", () => {
      expect(resolveLogLevel("not-a-level")).toBe("info");
    });

    it("falls back to \"info\" when no level is given", () => {
      expect(resolveLogLevel(undefined)).toBe("info");
    });
  });

  describe("resolveLogFormat", () => {
    it("returns \"json\" only when explicitly requested", () => {
      expect(resolveLogFormat("json")).toBe("json");
    });

    it.each([undefined, "pretty", "anything-else"])("falls back to \"pretty\" for %s", (format) => {
      expect(resolveLogFormat(format)).toBe("pretty");
    });
  });

  describe("shouldUseJsonLogs", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("is true when the format argument is \"json\"", () => {
      expect(shouldUseJsonLogs("json")).toBe(true);
    });

    it("is false when the format argument is \"pretty\"", () => {
      expect(shouldUseJsonLogs("pretty")).toBe(false);
    });

    it("falls back to the ARCSCORD_LOG_FORMAT environment variable when no format is given", () => {
      vi.stubEnv("ARCSCORD_LOG_FORMAT", "json");
      vi.stubEnv("LOG_FORMAT", "");

      expect(shouldUseJsonLogs(undefined)).toBe(true);
    });
  });

  describe("shouldLog", () => {
    it.each([
      ["debug", "warn", false],
      ["fatal", "trace", true],
      ["warn", "warn", true],
      ["trace", "fatal", false],
    ] as const)("shouldLog(%s, %s) is %s", (level, configuredLevel, expected) => {
      expect(shouldLog(level, configuredLevel)).toBe(expected);
    });
  });

  describe("resolveDefaultLogFunc", () => {
    it.each(["warn", "error", "fatal"] as const)("routes \"%s\" to console.error", (level) => {
      expect(resolveDefaultLogFunc(level)).toBe(console.error);
    });

    it.each(["trace", "debug", "info"] as const)("routes \"%s\" to console.log", (level) => {
      // eslint-disable-next-line no-console
      expect(resolveDefaultLogFunc(level)).toBe(console.log);
    });
  });

  describe("formatJsonLog", () => {
    it("produces a JSON string with the expected shape", () => {
      const json = formatJsonLog("info", "started", "my-process");
      const parsed = JSON.parse(json);

      expect(parsed).toMatchObject({
        level: "info",
        process: "my-process",
        message: "started",
      });
      expect(() => new Date(parsed.time).toISOString()).not.toThrow();
    });

    it("defaults the process name to \"main\"", () => {
      const parsed = JSON.parse(formatJsonLog("info", "started"));
      expect(parsed.process).toBe("main");
    });

    it("merges meta fields under a \"meta\" key when provided", () => {
      const parsed = JSON.parse(formatJsonLog("info", "started", "my-process", { userId: "42" }));
      expect(parsed.meta).toEqual({ userId: "42" });
    });

    it("omits the \"meta\" key when no meta is provided", () => {
      const parsed = JSON.parse(formatJsonLog("info", "started"));
      expect(parsed.meta).toBeUndefined();
    });
  });

  describe("formatLog", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("formats the timestamp in the process local time", () => {
      const now = new Date(2026, 0, 2, 3, 4, 5);
      vi.useFakeTimers();
      vi.setSystemTime(now);

      expect(formatLog("info", "started")).toContain("[2026-01-02 03:04:05]");
    });
  });

  describe("colorDebugValue", () => {
    it("formats a key/value pair as \"key : value\"", () => {
      expect(colorDebugValue(["userId", "42"])).toContain("userId : ");
      expect(colorDebugValue(["userId", "42"])).toContain("42");
    });

    it("does not throw for an empty value", () => {
      expect(() => colorDebugValue(["flag", ""])).not.toThrow();
    });
  });

  describe("createLogger", () => {
    it("creates a working logger instance using the provided constructor and logFunc", () => {
      const output: unknown[] = [];
      const logger = createLogger(ArcLogger, "test-process", (...data) => output.push(...data));

      logger.info("hello");

      expect(output).toHaveLength(1);
      expect(String(output[0])).toContain("hello");
    });

    it("defaults to console.log when no logFunc is provided", () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const logger = createLogger(ArcLogger, "test-process");
      logger.info("via console");

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
