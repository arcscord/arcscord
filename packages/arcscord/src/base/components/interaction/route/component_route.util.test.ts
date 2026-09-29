import { describe, expect, it } from "vitest";
import {
  compileComponentRoute,
  createComponentRoute,
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

  it("rejects duplicate route parameters", () => {
    expect(validateComponentRoute("test/{userId}/{userId}")).toBe("route parameter \"userId\" is declared more than once");
    expect(() => compileComponentRoute("test/{filter}/info/{filter}")).toThrow("route parameter \"filter\" is declared more than once");
  });

  it("rejects invalid characters in route declarations", () => {
    expect(validateComponentRoute("test/info full")).toBe("route segment \"info full\" is invalid, expected letters, numbers, _, or -");
    expect(validateComponentRoute("test/info%full")).toBe("route segment \"info%full\" is invalid, expected letters, numbers, _, or -");
    expect(validateComponentRoute("test/info.full")).toBe("route segment \"info.full\" is invalid, expected letters, numbers, _, or -");
    expect(validateComponentRoute("test/{user.id}")).toBe("route parameter \"user.id\" is invalid, expected letters, numbers, or _, and cannot start with a number");
    expect(validateComponentRoute("test/{user id}")).toBe("route parameter \"user id\" is invalid, expected letters, numbers, or _, and cannot start with a number");
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
    const id = createRouteId("test/info/{userId}/{filter}", { userId: "82882", filter: "all/active + pinned" });

    expect(id()).toBe("test/info/$82882/$all%2Factive%20%2B%20pinned");
  });

  it("builds and matches custom IDs through the public route codec", () => {
    const route = createComponentRoute("ticket/{ticketId}/{filter}");
    const customId = route.build({ ticketId: "42/#", filter: "café % pinned" });

    expect(route.pattern).toBe("ticket/{ticketId}/{filter}");
    expect(customId).toBe("ticket/$42%2F%23/$caf%C3%A9%20%25%20pinned");
    expect(route.match(customId)).toEqual({ ticketId: "42/#", filter: "café % pinned" });
    expect(route.match("ticket/$42/$%E0%A4%A")).toBeNull();
    expect(route.match("other/$42/$all")).toBeNull();
  });

  it("supports first-segment and prototype-named route parameters", () => {
    const leading = createComponentRoute("{id}/action");
    expect(leading.match(leading.build({ id: "42" }))).toEqual({ id: "42" });

    const prototypeNamed = createComponentRoute("x/{__proto__}");
    const params = { ["__proto__"]: "safe" };
    const matched = prototypeNamed.match(prototypeNamed.build(params));

    expect(matched).toEqual({ ["__proto__"]: "safe" });
    expect(Object.hasOwn(matched!, "__proto__")).toBe(true);
  });

  it("supports static public route codecs", () => {
    const route = createComponentRoute("ticket/create");

    expect(route.build()).toBe("ticket/create");
    expect(route.match("ticket/create")).toEqual({});
  });

  it("validates public route codecs and generated custom IDs", () => {
    expect(() => createComponentRoute("ticket/{ticket-id}"))
      .toThrow("route parameter \"ticket-id\" is invalid");

    const route = createComponentRoute("ticket/{ticketId}");
    expect(() => route.build({} as { ticketId: string })).toThrow("Missing route parameter ticketId");
    expect(() => route.build({ ticketId: "a".repeat(96) })).toThrow("exceeds 100 characters");
  });

  it("throws when a generated custom ID exceeds the Discord custom ID limit", () => {
    const id = createRouteId("test/{value}", { value: "a".repeat(96) });

    expect(() => id()).toThrow("exceeds 100 characters");
  });

  it("throws when a dynamic route parameter is missing", () => {
    const id = createRouteId("test/info/{userId}/{filter}");

    expect(() => id()).toThrow("Missing route parameter userId");
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
