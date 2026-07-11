import { describe, expect, it } from "vitest";
import { ArcscordError } from "#/utils/error/arcscord_error";
import { createErrorReport, renderErrorReport } from "./logger.report";

describe("logger.report", () => {
  describe("sanitizeValue (via createErrorReport debugs)", () => {
    it("replaces a circular reference with [Circular] instead of overflowing the stack", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      const error = new ArcscordError({
        code: "COMMAND_VALIDATION_FAILED",
        message: "failed",
        metadata: { rule: "test", circular },
      });

      const report = createErrorReport(error);

      expect(report.debug.circular).toMatchObject({ self: "[Circular]" });
    });

    it("truncates nested objects past the max depth", () => {
      const error = new ArcscordError({
        code: "COMMAND_VALIDATION_FAILED",
        message: "failed",
        metadata: { rule: "test", a: { b: { c: { d: "too deep" } } } },
      });

      const report = createErrorReport(error);

      expect((report.debug.a as { b: { c: unknown } }).b.c).toBe("[Object]");
    });

    it("truncates arrays to the max number of items", () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const error = new ArcscordError({
        code: "COMMAND_VALIDATION_FAILED",
        message: "failed",
        metadata: { rule: "test", items },
      });

      const report = createErrorReport(error);

      expect(report.debug.items).toHaveLength(20);
      expect(report.debug.items).toEqual(items.slice(0, 20));
    });

    it("truncates objects with too many keys and records the truncated count", () => {
      const bigObject = Object.fromEntries(
        Array.from({ length: 35 }, (_, i) => [`key${i}`, i]),
      );
      const error = new ArcscordError({
        code: "COMMAND_VALIDATION_FAILED",
        message: "failed",
        metadata: { rule: "test", bigObject },
      });

      const report = createErrorReport(error);
      const sanitized = report.debug.bigObject as Record<string, unknown>;

      expect(Object.keys(sanitized)).toHaveLength(31); // 30 kept keys + __truncatedKeys
      expect(sanitized.__truncatedKeys).toBe(5);
    });

    it("redacts authorization, password, and cookie keys in addition to token", () => {
      const error = new ArcscordError({
        code: "COMMAND_VALIDATION_FAILED",
        message: "failed",
        metadata: { rule: "test", authorization: "Bearer secret", password: "hunter2", cookie: "session=abc", safe: "not sensitive" },
      });

      const report = createErrorReport(error);

      expect(report.debug).toMatchObject({
        authorization: "[redacted]",
        password: "[redacted]",
        cookie: "[redacted]",
        safe: "not sensitive",
      });
    });

    it("serializes Map and Set debug values as arrays", () => {
      const error = new ArcscordError({
        code: "COMMAND_VALIDATION_FAILED",
        message: "failed",
        metadata: { rule: "test", map: new Map([["a", 1], ["b", 2]]), set: new Set([1, 2, 3]) },
      });

      const report = createErrorReport(error);

      expect(report.debug.map).toEqual([["a", 1], ["b", 2]]);
      expect(report.debug.set).toEqual([1, 2, 3]);
    });
  });

  describe("stringifyValue (via renderErrorReport)", () => {
    it("falls back to String() when JSON.stringify cannot serialize the value", () => {
      const error = new ArcscordError({
        code: "COMMAND_VALIDATION_FAILED",
        message: "failed",
        metadata: { rule: "test", big: 123n },
      });

      const report = createErrorReport(error);
      const rendered = renderErrorReport(report, "test");

      expect(rendered).toContain("big : ");
      expect(rendered).toContain("123");
    });
  });

  describe("serializeError", () => {
    it("follows a chained native cause across two levels", () => {
      const inner = new Error("inner cause");
      const outer = new Error("outer failure", { cause: inner });

      const report = createErrorReport(outer);

      expect(report.error.type).toBe("Error");
      expect(report.error.message).toBe("outer failure");
      expect(report.error.cause).toMatchObject({
        type: "Error",
        message: "inner cause",
      });
    });

    it("wraps a non-Error thrown value as a NonError report", () => {
      const report = createErrorReport("plain string failure");

      expect(report.error).toEqual({ type: "NonError", message: "plain string failure" });
      expect(report.message).toBe("NonError: plain string failure");
    });
  });

  describe("renderErrorReport", () => {
    it("renders a \"Caused by\" line for every level of a chained cause", () => {
      const root = new Error("root cause");
      const middle = new Error("middle failure", { cause: root });
      const outer = new Error("outer failure", { cause: middle });

      const rendered = renderErrorReport(createErrorReport(outer), "test");

      expect(rendered).toContain("Caused by: Error: middle failure");
      expect(rendered).toContain("Caused by: Error: root cause");
    });
  });

  describe("createErrorReport", () => {
    it("uses only the first error when given an array of errors", () => {
      const report = createErrorReport([new Error("first"), new Error("second")]);

      expect(report.error.message).toBe("first");
    });
  });
});
