import http from "http";
import { AddressInfo } from "net";

import {
  closeQueue,
  defineJob,
  enqueue,
  queueHealth,
  startWorker
} from "../../../libs/queue";

const waitFor = async (check: () => boolean, timeoutMs = 10000) => {
  const started = Date.now();
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out");
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};

describe("background jobs without Redis", () => {
  const previous = process.env.REDIS_URL;

  beforeAll(() => {
    delete process.env.REDIS_URL;
  });

  afterAll(() => {
    if (previous) process.env.REDIS_URL = previous;
  });

  it("runs the job right away in the same process", async () => {
    const seen: number[] = [];
    defineJob<{ value: number }>("test.inline", async ({ value }) => {
      seen.push(value);
    });

    await enqueue("test.inline", { value: 7 });
    await waitFor(() => seen.length === 1);

    expect(seen).toEqual([7]);
    expect(await queueHealth()).toBe("inline");
  });

  it("refuses unknown jobs", async () => {
    await expect(enqueue("test.unknown", {})).rejects.toThrow("Unknown job");
  });
});

// Needs a Redis server: CI sets REDIS_TEST_URL (see .github/workflows/ci.yaml).
const redisUrl = process.env.REDIS_TEST_URL;
const describeRedis = redisUrl ? describe : describe.skip;

describeRedis("background jobs with Redis", () => {
  beforeAll(() => {
    process.env.REDIS_URL = redisUrl;
    startWorker();
  });

  afterAll(async () => {
    await closeQueue();
    delete process.env.REDIS_URL;
  });

  it("retries a failed job until it succeeds", async () => {
    const attempts: number[] = [];
    defineJob(
      "test.flaky",
      async (_data, attempt) => {
        attempts.push(attempt);
        if (attempt === 1) throw new Error("temporary failure");
      },
      { attempts: 3, backoff: { type: "fixed", delay: 100 } }
    );

    await enqueue("test.flaky", { id: Date.now() });
    await waitFor(() => attempts.length === 2);

    expect(attempts).toEqual([1, 2]);
    expect(await queueHealth()).toBe("ok");
  });

  it("delivers webhooks through the queue", async () => {
    // Imported here so the webhook job is registered with Redis enabled.
    const { DispatchWebhookEvent } = await import(
      "../../../services/WebhookServices/WebhookServices"
    );
    const Webhook = (await import("../../../models/Webhook")).default;
    const { truncate, disconnect } = await import("../../utils/database");
    await truncate();

    let calls = 0;
    const server = http.createServer((req, res) => {
      calls += 1;
      res.writeHead(204);
      res.end();
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    process.env.WEBHOOK_ALLOW_PRIVATE_URLS = "true";
    try {
      const webhook = await Webhook.create({
        name: "Fila",
        url: `http://127.0.0.1:${port}/hook`,
        secret: "segredo",
        events: ["ticket.closed"],
        companyId: 1
      });

      DispatchWebhookEvent(1, "ticket.closed", { id: 1 });
      await waitFor(() => calls === 1);
      await waitFor(() => false, 300).catch(() => undefined);

      await webhook.reload();
      expect(webhook.lastStatus).toBe(204);
    } finally {
      delete process.env.WEBHOOK_ALLOW_PRIVATE_URLS;
      server.close();
      await truncate();
      await disconnect();
    }
  });
});
