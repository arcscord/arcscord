import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { ArcClient } from "arcscord";
import {
  createWebhookHandler,
  webhookEvents,
} from "@arcscord/webhooks";
import { createServer } from "node:http";

const webhookPath = "/discord/webhooks";

type WebhookServerOptions = {
  host: string;
  port: number;
};

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readRawBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", chunk => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function writeResponse(
  response: ServerResponse,
  status: number,
  headers: Readonly<Record<string, string>>,
  body: string | null,
): void {
  response.writeHead(status, headers);
  response.end(body ?? undefined);
}

export function startWebhookServer(
  client: ArcClient,
  publicKey: string,
  options: WebhookServerOptions,
): Promise<Server> {
  const logger = client.createLogger("webhooks");
  const webhooks = createWebhookHandler({
    publicKey,
    dispatch: client.eventManager.dispatcher(webhookEvents),
    onUnknownEvent: (delivery) => {
      logger.warn("Received an unknown Discord Webhook Event", {
        event: delivery.event.type,
      });
    },
    onError: (error, delivery) => {
      logger.logError(error, {
        source: "webhookDispatch",
        event: delivery.event.type,
      });
    },
  });

  const server = createServer((request, response) => {
    void (async () => {
      const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
      if (pathname !== webhookPath) {
        response.writeHead(404, {
          "content-type": "application/json; charset=utf-8",
        });
        response.end(JSON.stringify({ error: "not found" }));
        return;
      }

      try {
        const result = await webhooks.handleRaw({
          method: request.method,
          body: await readRawBody(request),
          signature: headerValue(request.headers["x-signature-ed25519"]),
          timestamp: headerValue(request.headers["x-signature-timestamp"]),
        });
        writeResponse(
          response,
          result.response.status,
          result.response.headers,
          result.response.body,
        );
        void result.completion.then((completion) => {
          if (completion.status === "unhandled") {
            logger.warn("No Arcscord handler is registered for Webhook Event", {
              event: completion.eventType,
            });
          }
        });
      }
      catch (error) {
        logger.logError(error, { source: "webhookHttpAdapter" });
        writeResponse(
          response,
          400,
          { "content-type": "application/json; charset=utf-8" },
          JSON.stringify({ error: "invalid request body" }),
        );
      }
    })();
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      const address = server.address();
      const listeningPort = address && typeof address !== "string"
        ? address.port
        : options.port;
      const listeningHost = options.host.includes(":")
        ? `[${options.host}]`
        : options.host;
      logger.info(`Discord Webhook Events listening on http://${listeningHost}:${listeningPort}${webhookPath}`);
      resolve(server);
    });
  });
}
