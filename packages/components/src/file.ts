import type { APIFileComponent } from "discord-api-types/v10";
import type { FileComponentData } from "discord.js";
import type { ComponentBuilderLike } from "./component";
import { ComponentType } from "discord-api-types/v10";
import { normalizeFile } from "./internal/normalize-display";

/** Discord.js data, builder, or raw API file component accepted by layout helpers. */
export type FileComponentInput
  = | FileComponentData
    | APIFileComponent
    | ComponentBuilderLike<APIFileComponent>;

/** Options for {@link file}, derived from Discord.js component data. */
export type FileOptions = Omit<FileComponentData, "type">;

/**
 * Creates a file display component.
 *
 * @param options - Required uploaded-file reference plus optional `spoiler` and `id`.
 * Files have no children.
 * @example
 * ```ts
 * file({ file: { url: "attachment://report.pdf" }, spoiler: true })
 * ```
 */
export function file(options: FileOptions): FileComponentData {
  return normalizeFile({ ...options, type: ComponentType.File });
}
