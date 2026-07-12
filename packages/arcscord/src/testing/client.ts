import type { GatewayIntentBits } from "discord-api-types/v10";
import type { ArcClient } from "#/base/client/client.class";
import type { LoggerInterface } from "#/utils/logger/logger.type";
import { IntentsBitField } from "discord.js";
import { createMockFunction } from "./mock_function";

export function createMockLogger(): LoggerInterface {
  return {
    trace: createMockFunction(),
    debug: createMockFunction(),
    info: createMockFunction(),
    warn: createMockFunction(),
    error: createMockFunction(),
    logError: createMockFunction(),
    fatal: createMockFunction() as unknown as LoggerInterface["fatal"],
    fatalError: createMockFunction() as unknown as LoggerInterface["fatalError"],
    log: createMockFunction(),
    child: createMockFunction(() => createMockLogger()),
  };
}

export type MockClientOptions = {
  intents?: (GatewayIntentBits | number)[];
  applicationId?: string;
  enableInternalTrace?: boolean;
};

export type MockArcClient = ArcClient & {
  _listenersMap: Map<string, ((...args: unknown[]) => void | Promise<void>)[]>;
  _emitMock: (event: string, ...args: unknown[]) => Promise<void>;
};

export function createMockClient(options: MockClientOptions = {}): MockArcClient {
  const listenersMap = new Map<string, ((...args: unknown[]) => void | Promise<void>)[]>();

  const client = {
    arcOptions: {
      applicationId: options.applicationId ?? "app_1",
      enableInternalTrace: options.enableInternalTrace ?? false,
    },
    application: null,
    options: {
      intents: new IntentsBitField(options.intents ?? []),
    },
    guilds: {
      cache: new Map(),
    },
    rest: {
      get: createMockFunction(),
      post: createMockFunction(),
      patch: createMockFunction(),
      put: createMockFunction(),
      delete: createMockFunction(),
    },
    localeManager: {
      enabled: false,
      availableLanguages: ["en"],
      i18n: {
        getFixedT: createMockFunction(() => (key: string) => key),
      },
      mapLanguage: createMockFunction((locale: string) => locale),
      t: createMockFunction((key: string) => key),
      detectLanguage: createMockFunction(async () => "en"),
      ready: Promise.resolve(),
    },
    getErrorMessage: createMockFunction(() => ({ content: "An error occurred." })),
    createMessageContext: createMockFunction(() => ({ t: (key: string) => key })),
    createLogger: () => createMockLogger(),
    waitReady: createMockFunction(() => Promise.resolve()),
    on: createMockFunction((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      listenersMap.set(event, [...(listenersMap.get(event) ?? []), listener]);
      return client;
    }),
    once: createMockFunction((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      const wrapped = async (...args: unknown[]): Promise<void> => {
        client.off(event, wrapped);
        await listener(...args);
      };
      listenersMap.set(event, [...(listenersMap.get(event) ?? []), wrapped]);
      return client;
    }),
    off: createMockFunction((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      listenersMap.set(
        event,
        (listenersMap.get(event) ?? []).filter(item => item !== listener),
      );
      return client;
    }),
    _listenersMap: listenersMap,
    _emitMock: async (event: string, ...args: unknown[]): Promise<void> => {
      for (const listener of [...(listenersMap.get(event) ?? [])]) {
        await listener(...args);
      }
    },
  } as unknown as MockArcClient;

  return client;
}
