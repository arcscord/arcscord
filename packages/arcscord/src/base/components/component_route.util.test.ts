import { describe, expect, it } from "vitest";
import {
  compileComponentRoute,
  createRouteId,
  matchComponentRoute,
  readCustomIdParts,
  readRouteParts,
  validateComponentRoute,
} from "./component_route.util";

describe("component route utils", () => {
  it("validates supported route formats", () => {
    expect(validateComponentRoute("test")).toBeNull();
    expect(validateComponentRoute("test/info/{userId}/{filter}")).toBeNull();
    expect(validateComponentRoute("test_info-1/{userId}")).toBeNull();

    expect(validateComponentRoute("/test")).not.toBeNull();
    expect(validateComponentRoute("test/")).not.toBeNull();
    expect(validateComponentRoute("test//info")).not.toBeNull();
    expect(validateComponentRoute("test/{123}")).not.toBeNull();
    expect(validateComponentRoute("test/{user-id}")).not.toBeNull();
    expect(validateComponentRoute("modal:profile")).not.toBeNull();
  });

  it("rejects $ in route declarations", () => {
    expect(validateComponentRoute("$test")).not.toBeNull();
    expect(validateComponentRoute("test/$value")).not.toBeNull();
    expect(validateComponentRoute("test/{user$id}")).not.toBeNull();
    expect(() => compileComponentRoute("test/$value")).toThrow("cannot contain $");
  });

  it("rejects route declarations longer than the Discord custom ID limit", () => {
    const route = "a".repeat(101);

    expect(() => compileComponentRoute(route)).toThrow("route cannot exceed 100 characters, got 101");
  });

  it("returns precise route validation errors", () => {
    expect(validateComponentRoute("")).toBe("route cannot be empty");
    expect(validateComponentRoute("/test")).toBe("route cannot start with /");
    expect(validateComponentRoute("test/")).toBe("route cannot end with /");
    expect(validateComponentRoute("test//info")).toBe("route segment 2 cannot be empty");
    expect(validateComponentRoute("test/{userId")).toBe("route segment \"{userId\" has an incomplete dynamic parameter, expected {name}");
    expect(validateComponentRoute("test/userId}")).toBe("route segment \"userId}\" has an incomplete dynamic parameter, expected {name}");
    expect(validateComponentRoute("test/{}")).toBe("route parameter name cannot be empty");
    expect(validateComponentRoute("test/{123}")).toBe("route parameter \"123\" is invalid, expected letters, numbers, or _, and cannot start with a number");
    expect(validateComponentRoute("test/info:full")).toBe("route segment \"info:full\" is invalid, expected letters, numbers, _, or -");
    expect(validateComponentRoute("test/info")).toBeNull();
  });

  it("reads static and dynamic route parts", () => {
    expect(readRouteParts("test/info/{userId}/{filter}")).toEqual([
      { type: "static", value: "test" },
      { type: "static", value: "info" },
      { type: "param", name: "userId" },
      { type: "param", name: "filter" },
    ]);
  });

  it("builds canonical routes for duplicate detection", () => {
    expect(compileComponentRoute("test/info/{userId}/{filter}").canonical).toBe("test/info/$/$");
    expect(compileComponentRoute("test/info/{id}/{kind}").canonical).toBe("test/info/$/$");
    expect(compileComponentRoute("test/{section}/{id}").canonical).toBe("test/$/$");
  });

  it("creates custom IDs with encoded dynamic values", () => {
    const id = createRouteId("test/info/{userId}/{filter}");

    expect(id({ userId: "82882", filter: "all/active + pinned" })).toBe("test/info/$82882/$all%2Factive%20%2B%20pinned");
  });

  it("throws when a generated custom ID exceeds the Discord custom ID limit", () => {
    const id = createRouteId("test/{value}");

    expect(() => id({ value: "a".repeat(96) })).toThrow("exceeds 100 characters");
  });

  it("throws when a dynamic route parameter is missing", () => {
    const id = createRouteId("test/info/{userId}/{filter}");

    expect(() => id({ userId: "82882" } as { userId: string; filter: string })).toThrow("Missing route parameter filter");
  });

  it("matches routes and decodes params", () => {
    const route = compileComponentRoute("test/info/{userId}/{filter}");

    expect(matchComponentRoute(route, "test/info/$82882/$all%2Factive")).toEqual({
      userId: "82882",
      filter: "all/active",
    });
  });

  it("does not match when dynamic values are not prefixed", () => {
    const route = compileComponentRoute("test/info/{userId}/{filter}");

    expect(matchComponentRoute(route, "test/info/82882/all")).toBeNull();
  });

  it("does not match malformed encoded values", () => {
    const route = compileComponentRoute("test/info/{userId}");

    expect(matchComponentRoute(route, "test/info/$%E0%A4%A")).toBeNull();
  });

  it("splits custom IDs without using route matching", () => {
    expect(readCustomIdParts("test/info/$82882/$all")).toEqual(["test", "info", "$82882", "$all"]);
  });
});
