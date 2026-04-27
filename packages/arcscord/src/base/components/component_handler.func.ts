import type {
  ButtonComponentHandler,
  ModalComponentHandler,
  SelectMenuComponentHandler,
} from "#/base/components/component_handlers.type";
import type { ComponentMiddleware } from "#/base/components/component_middleware";
import { ComponentType } from "discord-api-types/v10";
import { componentHandlerTypeEnum } from "#/base/components/component.enum";

type HandlerOptions<T> = T extends unknown ? Omit<T, "handlerType"> : never;

/**
 * Create a select menu
 *
 * @param  options - the properties to configure the select menu
 * @returns  The complete set of properties for the select menu
 * @example
 * ```ts
 * const selectMenu = createSelectMenu({
 *   type: "userSelect",
 *   matcher: "selectMenu",
 *   build: () => buildUserSelectMenu({
 *     customId: "selectMenu",
 *     maxValues: 10,
 *     minValues: 1,
 *   }),
 *   run: (ctx) => {
 *     return ctx.reply(`You select ${ctx.values.length} users`);
 *   },
 * });
 * ```
 */
export function createSelectMenu<
  O extends string[],
  M extends ComponentMiddleware[] = ComponentMiddleware[],
>(options: HandlerOptions<SelectMenuComponentHandler<O, M>>): SelectMenuComponentHandler<O, M> {
  return { ...options, handlerType: componentHandlerTypeEnum.messageComponent } as SelectMenuComponentHandler<O, M>;
}

/**
 * create a button
 *
 * @param options - The properties to configure the modal
 * @returns the complete set of properties for the button
 * @example
 * ```ts
 * const button = createButton({
 *   matcher: "button",
 *   build: () => buildClickableButton({
 *     style: "success",
 *     customId: "button",
 *     label: "Click Here",
 *   }),
 *   run: (ctx) => {
 *     return ctx.reply("You clicked !");
 *   },
 * });
 * ```
 */
export function createButton<
  O extends string[],
  M extends ComponentMiddleware[] = ComponentMiddleware[],
>(options: Omit<ButtonComponentHandler<O, M>, "type" | "handlerType">): ButtonComponentHandler<O, M> {
  return { ...options, type: ComponentType.Button, handlerType: componentHandlerTypeEnum.messageComponent };
}

/**
 * Create a modal
 *
 * @param  options - The properties to configure the modal
 * @returns The complete set of properties for the modal
 * @example
 * ```ts
 * const myFamousModal = createModal({
 *   matcher: "famousModal",
 *   build: title => buildModal(
 *     title,
 *     "famousModal",
 *     buildLabel({
 *       label: "Entry",
 *       component: buildTextInput({
 *         customId: "entry",
 *         style: "short",
 *       }),
 *     }),
 *   ),
 *   run: (ctx) => {
 *     return ctx.reply(`You reply with ${ctx.values.get("entry") || "nothing"}`);
 *   },
 * });
 * ```
 *
 */
export function createModal<
  O extends string[],
  M extends ComponentMiddleware[] = [],
>(options: Omit<ModalComponentHandler<O, M>, "handlerType">): ModalComponentHandler<O, M> {
  return { ...options, handlerType: componentHandlerTypeEnum.modal };
}
