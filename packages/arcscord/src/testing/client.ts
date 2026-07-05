import type { GatewayIntentBits } from "discord-api-types/v10";
import type { ArcClient } from "#/base/client/client.class";
import type { LoggerInterface } from "#/utils/logger/logger.type";
import { IntentsBitField } from "discord.js";
import { vi } from "vitest";

export function createMockLogger(): LoggerInterface {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logError: vi.fn(),
    fatal: vi.fn() as unknown as LoggerInterface["fatal"],
    fatalError: vi.fn() as unknown as LoggerInterface["fatalError"],
    log: vi.fn(),
    child: vi.fn(() => createMockLogger()),
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
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    localeManager: {
      enabled: false,
      availableLanguages: ["en"],
      i18n: {
        getFixedT: vi.fn(() => (key: string) => key),
      },
      mapLanguage: vi.fn((locale: string) => locale),
      t: vi.fn((key: string) => key),
      detectLanguage: vi.fn(async () => "en"),
      ready: Promise.resolve(),
    },
    getErrorMessage: vi.fn(() => ({ content: "An error occurred." })),
    createMessageContext: vi.fn(() => ({ t: (key: string) => key })),
    createLogger: () => createMockLogger(),
    waitReady: vi.fn(() => Promise.resolve()),
    on: vi.fn((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      listenersMap.set(event, [...(listenersMap.get(event) ?? []), listener]);
      return client;
    }),
    once: vi.fn((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
      const wrapped = async (...args: unknown[]): Promise<void> => {
        client.off(event, wrapped);
        await listener(...args);
      };
      listenersMap.set(event, [...(listenersMap.get(event) ?? []), wrapped]);
      return client;
    }),
    off: vi.fn((event: string, listener: (...args: unknown[]) => void | Promise<void>) => {
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
