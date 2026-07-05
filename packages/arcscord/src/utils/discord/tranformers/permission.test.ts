import { PermissionFlagsBits } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { permissionToAPI } from "./permission";

describe("permissionToAPI", () => {
  it("converts a single permission string to its bitfield value", () => {
    expect(permissionToAPI("Administrator")).toBe(PermissionFlagsBits.Administrator.toString(10));
  });

  it("combines multiple permission strings into one bitfield value", () => {
    const expected = (PermissionFlagsBits.KickMembers | PermissionFlagsBits.BanMembers).toString(10);

    expect(permissionToAPI(["KickMembers", "BanMembers"])).toBe(expected);
  });

  it("returns \"0\" for an empty array of permissions", () => {
    expect(permissionToAPI([])).toBe("0");
  });
});
