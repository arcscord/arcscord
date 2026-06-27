import type { LoggerInterface } from "#/utils/logger/logger.type";
import { BaseError } from "@arcscord/better-error";
import { error, ok } from "@arcscord/error";
import { describe, expect, it, vi } from "vitest";
import { applyDiagnosticLevel, isArcscordResult, normalizeRunReturn } from "./run_normalize";

function createMockLogger(): LoggerInterface {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
    fatal: vi.fn(),
    fatalError: vi.fn(),
    log: vi.fn(),
  } as unknown as LoggerInterface;
}

describe("isArcscordResult", () => {
  it("returns true for ok result", () => {
    expect(isArcscordResult([null, "value"])).toBe(true);
  });

  it("returns true for error result", () => {
    expect(isArcscordResult([new Error("err"), null])).toBe(true);
  });

  it("returns false for a plain string", () => {
    expect(isArcscordResult("hello")).toBe(false);
  });

  it("returns false for true", () => {
    expect(isArcscordResult(true)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isArcscordResult(undefined)).toBe(false);
  });

  it("returns false for an array of the wrong length", () => {
    expect(isArcscordResult([null])).toBe(false);
    expect(isArcscordResult([null, "a", "b"])).toBe(false);
  });
});

describe("normalizeRunReturn", () => {
  it("normalizes undefined to ok(true)", () => {
    const [err, value] = normalizeRunReturn(undefined);
    expect(err).toBeNull();
    expect(value).toBe(true);
  });

  it("normalizes void (no return) to ok(true)", () => {
    const run = (): void => {};
    const [err, value] = normalizeRunReturn(run());
    expect(err).toBeNull();
    expect(value).toBe(true);
  });

  it("normalizes a string to ok(string)", () => {
    const [err, value] = normalizeRunReturn("message sent");
    expect(err).toBeNull();
    expect(value).toBe("message sent");
  });

  it("normalizes true to ok(true)", () => {
    const [err, value] = normalizeRunReturn(true);
    expect(err).toBeNull();
    expect(value).toBe(true);
  });

  it("passes through an ok Result unchanged", () => {
    const result = ok("done");
    const [err, value] = normalizeRunReturn(result);
    expect(err).toBeNull();
    expect(value).toBe("done");
  });

  it("passes through an error Result unchanged", () => {
    const originalErr = new Error("failed");
    const result = error(originalErr);
    const [err, value] = normalizeRunReturn(result);
    expect(err).toBe(originalErr);
    expect(value).toBeNull();
  });
});

describe("applyDiagnosticLevel", () => {
  it("does nothing for ignore level", () => {
    const logger = createMockLogger();
    const err = new BaseError({ message: "test" });
    applyDiagnosticLevel(logger, "ignore", err);
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warning).not.toHaveBeenCalled();
    expect(logger.logError).not.toHaveBeenCalled();
  });

  it("logs at debug level", () => {
    const logger = createMockLogger();
    const err = new BaseError({ message: "test" });
    applyDiagnosticLevel(logger, "debug", err);
    expect(logger.debug).toHaveBeenCalledWith("test");
  });

  it("logs at info level", () => {
    const logger = createMockLogger();
    const err = new BaseError({ message: "test" });
    applyDiagnosticLevel(logger, "info", err);
    expect(logger.info).toHaveBeenCalledWith("test");
  });

  it("logs at warn level", () => {
    const logger = createMockLogger();
    const err = new BaseError({ message: "test" });
    applyDiagnosticLevel(logger, "warn", err);
    expect(logger.warning).toHaveBeenCalledWith("test");
  });

  it("logs at error level and generates an id", () => {
    const logger = createMockLogger();
    const err = new BaseError({ message: "test" });
    applyDiagnosticLevel(logger, "error", err);
    expect(logger.logError).toHaveBeenCalledWith(err);
    expect(err.id).not.toBeNull();
  });

  it("throws at throw level and generates an id", () => {
    const logger = createMockLogger();
    const err = new BaseError({ message: "test" });
    expect(() => applyDiagnosticLevel(logger, "throw", err)).toThrow(err);
    expect(err.id).not.toBeNull();
  });
});
