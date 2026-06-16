import type { Debugs, DebugStringObject, ErrorOptions, GetDebugOptions, StackFormat } from "./type";
import { stringifyUnknown } from "./util";

/**
 * A custom error class
 */
export class BaseError extends Error {
  /**
   * The name of the error
   */
  name = "baseError";

  protected _debugs: Map<string, unknown> = new Map();
  protected _originalError?: BaseError | Error;
  protected _id?: string;

  /**
   * Creates a new instance of the error class.
   *
   * @param opt - The options for creating the error.
   */
  constructor(opt: string | ErrorOptions) {
    super(typeof opt === "string" ? opt : opt.message);

    if (typeof opt === "object") {
      this.name = opt.name ?? this.name;
      this._originalError = opt.originalError;
      this._initializeDebugs(opt.debugs);
      this._id = opt.customId ?? (opt.autoGenerateId ? this.generateId()._id : undefined);
    }
  }

  /**
   * Initializes the debugs map with provided debug information.
   *
   * @param debugs - The debug information to initialize.
   */
  private _initializeDebugs(debugs?: Debugs): void {
    if (debugs) {
      for (const [key, value] of Object.entries(debugs)) {
        this._debugs.set(key, value);
      }
    }
  }

  /**
   * Returns the original error associated with this error.
   *
   * @returns The original error, if available; otherwise, undefined.
   */
  get originalError(): BaseError | Error | undefined {
    return this._originalError;
  }

  /**
   * Retrieves the error id
   *
   * @returns The id of the error, or undefined if it does not have an id.
   */
  get id(): string | undefined {
    return this._id;
  }

  /**
   * Sets the error id value.
   *
   * @param value - The ID value to be set.
   */
  set id(value: string) {
    this._id = value;
  }

  /**
   * Generates a unique identifier for an object.
   *
   * @returns The current object with the generated identifier.
   */
  generateId(): this {
    this._id = crypto.randomUUID();
    return this;
  }

  /**
   * Retrieves the debug information as an object.
   *
   * @param options - An optional parameter to customize the debug object.
   * @returns The debugs object with the retrieved debug information.
   */
  getDebugsObject(options: GetDebugOptions = {}): Debugs {
    const mergedOptions = { ...this.defaultGetDebugOptions(), ...options };
    let debugs: Debugs = {};

    if (mergedOptions.id) {
      debugs.errorId = this._id || "no_id";
    }

    debugs = { ...debugs, ...Object.fromEntries(this._debugs) };

    if (mergedOptions.stack) {
      debugs = { ...debugs, ...this.getStack(mergedOptions.stackFormat) };
    }

    if (this._originalError) {
      debugs = { ...debugs, ...this._getOriginalErrorDebugs(mergedOptions) };
    }

    return debugs;
  }

  /**
   * Retrieves debug information from the original error.
   *
   * @param options - The options for retrieving original error debugs.
   * @returns The debugs object with original error information.
   */
  private _getOriginalErrorDebugs(options: GetDebugOptions): Debugs {
    let debugs: Debugs = {};

    if (this._originalError instanceof BaseError) {
      debugs.originalError = this._originalError.fullMessage();
      const originalOptions = typeof options.originalErrorDebugs === "object" ? options.originalErrorDebugs : options;

      if (options.originalErrorDebugs !== false) {
        debugs = { ...debugs, ...this._prefixDebugKeys(this._originalError.getDebugsObject(originalOptions), "originalError") };
      }
      else if (options.originalErrorStack) {
        debugs = { ...debugs, ...this._prefixDebugKeys(this._originalError.getStack(options.stackFormat), "originalError") };
      }
    }
    else {
      debugs.originalError = `${this._originalError?.name}: ${this._originalError}`;
      if (options.originalErrorStack && this._originalError?.stack) {
        debugs = { ...debugs, ...this._prefixDebugKeys(this.getStack(options.stackFormat, this._originalError.stack), "originalError") };
      }
    }

    return debugs;
  }

  /**
   * Prefixes keys in a debug object with a given prefix.
   *
   * @param debugs - The debug object to prefix.
   * @param prefix - The prefix to add to each key.
   * @returns The debug object with prefixed keys.
   */
  private _prefixDebugKeys(debugs: Debugs, prefix: string): Debugs {
    const prefixedDebugs: Debugs = {};
    for (const [key, value] of Object.entries(debugs)) {
      prefixedDebugs[`${prefix} - ${key}`] = value;
    }
    return prefixedDebugs;
  }

  /**
   * Returns a string representation of the debug information for the current object.
   *
   * @param options - Optional configuration object for fetching specific debug information.
   * @returns An object containing stringified debug information.
   */
  getDebugString(options: GetDebugOptions = {}): DebugStringObject {
    const debugs = this.getDebugsObject(options);
    const newDebug: DebugStringObject = {};

    for (const [key, value] of Object.entries(debugs)) {
      newDebug[key] = stringifyUnknown(value);
    }

    return newDebug;
  }

  /**
   * Retrieves the stack information in the specified format.
   *
   * @param stackFormat The format of the stack information. Defaults to "split".
   * @param stacks The stack information to be retrieved. If not provided, it will use the stack information of the current instance.
   *
   * @returns The stack information in the defined format.
   */
  getStack(stackFormat: StackFormat = "split", stacks?: string): DebugStringObject {
    stacks = stacks || this.stack;
    if (!stacks)
      return {};

    if (stackFormat === "default") {
      return { stack: stacks };
    }

    return stacks.split("\n").slice(1).reduce((acc, stack, index) => {
      acc[`stack${index + 1}`] = stack.trim();
      return acc;
    }, {} as DebugStringObject);
  }

  /**
   * Returns the default debug options for a debug session.
   *
   * @returns The default debug options as an object
   */
  defaultGetDebugOptions(): Required<GetDebugOptions> {
    return {
      id: true,
      originalErrorDebugs: true,
      stack: true,
      stackFormat: "split",
      originalErrorStack: true,
    };
  }

  /**
   * Returns the full message, which includes the name of the object concatenated with the message.
   * The message is returned as a string.
   *
   * @returns The full message, combining the name and the message.
   */
  fullMessage(): string {
    return `${this.name}: ${this.message}`;
  }
}
