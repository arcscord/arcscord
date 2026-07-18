import type { JSONEncodable } from "discord.js";

/** A Discord.js builder or another object that serializes to the requested Discord API shape. */
export type ComponentBuilderLike<ApiComponent> = JSONEncodable<ApiComponent>;
