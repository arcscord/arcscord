import type { APIFileComponent } from "discord-api-types/v10";
import type { FileComponentData } from "discord.js";
import type { CanonicalComponentData, ComponentBuilderLike } from "./component";
import { ComponentType } from "discord-api-types/v10";
import { rootContext } from "./validation/context";
import { decodeFile } from "./validation/display";

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
export function file(options: FileOptions): CanonicalComponentData<FileComponentData, ComponentType.File> {
  return decodeFile({ ...options, type: ComponentType.File }, rootContext("file"));
}
