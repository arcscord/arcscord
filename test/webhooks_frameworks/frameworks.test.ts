import type {
  RawWebhookResponse,
  WebhookDispatchResult,
  WebhookHandler,
  WebhookHandleResult,
} from "@arcscord/webhooks";
import type { WebhookTestClient } from "@arcscord/webhooks/testing";
import type { IncomingMessage } from "node:http";
import { Buffer } from "node:buffer";
import {
  createWebhookHandler,
  WebhookEventType,
} from "@arcscord/webhooks";
import { createWebhookTestClient } from "@arcscord/webhooks/testing";
import express from "express";
import Fastify from "fastify";
import { fromWebHandler, H3 } from "h3";
import { Hono } from "hono";
import Koa from "koa";
import inject from "light-my-request";
import { describe, expect, it } from "vitest";

const webhookPath = "/discord/webhooks";
const eventType = WebhookEventType.QuestUserEnrollment;

type Fixture = {
  client: WebhookTestClient;
  handler: WebhookHandler;
  completions: Array<Promise<WebhookDispatchResult>>;
  handledCount: () => number;
};

type FetchAdapter = {
  name: string;
  usesWaitUntil?: boolean;
  dispatch: (
    receive: (request: Request) => Promise<WebhookHandleResult<Response>>,
    request: Request,
    waitUntil: (promise: Promise<unknown>) => void,
  ) => Promise<Response>;
};

type InjectResponse = {
  statusCode: number;
  payload: string;
  headers: Record<string, string | string[] | number | undefined>;
};

async function createFixture(): Promise<Fixture> {
  let handled = 0;
  const completions: Array<Promise<WebhookDispatchResult>> = [];
  const client = await createWebhookTestClient({
    applicationId: "123456789012345678",
  });
  const handler = createWebhookHandler({
    publicKey: client.publicKey,
    handlers: {
      [eventType]: () => {
        handled += 1;
      },
    },
  });

  return {
    client,
    handler,
    completions,
    handledCount: () => handled,
  };
}

async function assertHandled(
  fixture: Fixture,
  response: Response,
): Promise<void> {
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
  expect(fixture.completions).toHaveLength(1);
  await expect(fixture.completions[0]).resolves.toMatchObject({
    status: "handled",
    eventType,
    known: true,
  });
  expect(fixture.handledCount()).toBe(1);
}

async function assertInjectedResponse(
  fixture: Fixture,
  response: InjectResponse,
): Promise<void> {
  expect(response.statusCode).toBe(204);
  expect(response.payload).toBe("");
  expect(String(response.headers["content-type"])).toBe("application/json; charset=utf-8");
  expect(fixture.completions).toHaveLength(1);
  await expect(fixture.completions[0]).resolves.toMatchObject({
    status: "handled",
    eventType,
    known: true,
  });
  expect(fixture.handledCount()).toBe(1);
}

function fetchReceiver(
  fixture: Fixture,
): (request: Request) => Promise<WebhookHandleResult<Response>> {
  return async (request) => {
    const result = await fixture.handler.handleRequest(request);
    fixture.completions.push(result.completion);
    return result;
  };
}

async function rawReceiver(
  fixture: Fixture,
  request: {
    body: Uint8Array;
    signature?: string;
    timestamp?: string;
  },
): Promise<WebhookHandleResult<RawWebhookResponse>> {
  const result = await fixture.handler.handleRaw(request);
  fixture.completions.push(result.completion);
  return result;
}

function eventRequest(
  fixture: Fixture,
  url: string,
): Promise<Request> {
  return fixture.client.createEventRequest(url, {
    type: eventType,
    data: undefined,
  });
}

async function injectionRequest(
  fixture: Fixture,
): Promise<{
  method: "POST";
  url: string;
  headers: Record<string, string>;
  payload: string;
}> {
  const request = await fixture.client.createEventRequest(`https://example.com${webhookPath}`, {
    type: eventType,
    data: undefined,
  });
  return {
    method: "POST",
    url: webhookPath,
    headers: Object.fromEntries(request.headers.entries()),
    payload: await request.text(),
  };
}

describe("node framework integrations", () => {
  it("executes the Express raw-body adapter", async () => {
    const fixture = await createFixture();
    const app = express();

    app.post(
      webhookPath,
      express.raw({ type: "application/json" }),
      async (request, response) => {
        const result = await rawReceiver(fixture, {
          body: request.body,
          signature: request.get("x-signature-ed25519"),
          timestamp: request.get("x-signature-timestamp"),
        });
        writeExpressResponse(response, result.response);
      },
    );

    const response = await inject(app, await injectionRequest(fixture));
    await assertInjectedResponse(fixture, response);
  });

  it("executes the Fastify buffer content-type parser adapter", async () => {
    const fixture = await createFixture();
    const app = Fastify();
    app.removeContentTypeParser("application/json");
    app.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => done(null, body),
    );
    app.post<{ Body: Buffer }>(webhookPath, async (request, reply) => {
      const result = await rawReceiver(fixture, {
        body: request.body,
        signature: headerValue(request.headers["x-signature-ed25519"]),
        timestamp: headerValue(request.headers["x-signature-timestamp"]),
      });
      reply.code(result.response.status).headers(result.response.headers);
      return result.response.body === null
        ? reply.send()
        : reply.send(result.response.body);
    });

    const response = await app.inject(await injectionRequest(fixture));
    await assertInjectedResponse(fixture, response);
    await app.close();
  });

  it("executes the Koa unparsed request-stream adapter", async () => {
    const fixture = await createFixture();
    const app = new Koa();

    app.use(async (context) => {
      if (context.method !== "POST" || context.path !== webhookPath) {
        context.status = 404;
        return;
      }

      const result = await rawReceiver(fixture, {
        body: await readRawBody(context.req),
        signature: context.get("x-signature-ed25519"),
        timestamp: context.get("x-signature-timestamp"),
      });
      context.respond = false;
      context.res.statusCode = result.response.status;
      for (const [name, value] of Object.entries(result.response.headers))
        context.res.setHeader(name, value);
      context.res.end(result.response.body ?? undefined);
    });

    const response = await inject(app.callback(), await injectionRequest(fixture));
    await assertInjectedResponse(fixture, response);
  });
});

describe("fetch-native framework integrations", () => {
  it("executes the Hono Request/Response adapter", async () => {
    const fixture = await createFixture();
    const receive = fetchReceiver(fixture);
    const app = new Hono();
    app.post(webhookPath, async context => (await receive(context.req.raw)).response);

    const request = await eventRequest(fixture, `https://example.com${webhookPath}`);
    await assertHandled(fixture, await app.request(request));
  });

  it("executes the H3/Nitro v2 web-handler adapter", async () => {
    const fixture = await createFixture();
    const receive = fetchReceiver(fixture);
    const app = new H3().post(
      webhookPath,
      fromWebHandler(async request => (await receive(request)).response),
    );

    const request = await eventRequest(fixture, `https://example.com${webhookPath}`);
    await assertHandled(fixture, await app.request(request));
  });
});

const fetchAdapters: FetchAdapter[] = [
  {
    name: "Next.js App Router",
    dispatch: async (receive, request) => {
      const route = {
        POST: async (routeRequest: Request) => (await receive(routeRequest)).response,
      };
      return route.POST(request);
    },
  },
  {
    name: "SvelteKit",
    dispatch: async (receive, request) => {
      const route = {
        POST: async ({ request: routeRequest }: { request: Request }) =>
          (await receive(routeRequest)).response,
      };
      return route.POST({ request });
    },
  },
  {
    name: "React Router / Remix",
    dispatch: async (receive, request) => {
      const action = async ({ request: routeRequest }: { request: Request }) =>
        (await receive(routeRequest)).response;
      return action({ request });
    },
  },
  {
    name: "Astro",
    dispatch: async (receive, request) => {
      const endpoint = {
        POST: async ({ request: routeRequest }: { request: Request }) =>
          (await receive(routeRequest)).response,
      };
      return endpoint.POST({ request });
    },
  },
  {
    name: "Cloudflare Workers",
    usesWaitUntil: true,
    dispatch: async (receive, request, waitUntil) => {
      const worker = {
        fetch: async (workerRequest: Request) => {
          const result = await receive(workerRequest);
          waitUntil(result.completion);
          return result.response;
        },
      };
      return worker.fetch(request);
    },
  },
];

describe.each(fetchAdapters)("$name Fetch contract", ({ dispatch, usesWaitUntil }) => {
  it("passes the untouched signed Request and returns the acknowledgement", async () => {
    const fixture = await createFixture();
    const backgroundTasks: Array<Promise<unknown>> = [];
    const request = await eventRequest(fixture, `https://example.com${webhookPath}`);
    const response = await dispatch(
      fetchReceiver(fixture),
      request,
      promise => backgroundTasks.push(promise),
    );

    expect(backgroundTasks).toEqual(usesWaitUntil ? fixture.completions : []);
    await assertHandled(fixture, response);
    await Promise.all(backgroundTasks);
  });
});

function writeExpressResponse(
  response: express.Response,
  acknowledgement: RawWebhookResponse,
): void {
  response.status(acknowledgement.status);
  for (const [name, value] of Object.entries(acknowledgement.headers))
    response.setHeader(name, value);

  if (acknowledgement.body === null)
    response.end();
  else
    response.send(acknowledgement.body);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function readRawBody(request: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request)
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}
