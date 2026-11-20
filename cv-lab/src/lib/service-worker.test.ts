import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../../service-worker.js", import.meta.url), "utf8");
function worker(response = new Response("ok")) {
  const handlers: Record<string, (event: any) => void> = {};
  const put = vi.fn();
  const remove = vi.fn();
  const cache = { match: vi.fn(), put };
  const fetcher = vi.fn(async () => response);
  runInNewContext(source, {
    URL,
    self: { location: { href: "https://portfolio.test/service-worker.js", origin: "https://portfolio.test" },
      addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
      clients: { claim: vi.fn() }, skipWaiting: vi.fn() },
    caches: { open: async () => cache, keys: async () => ["afm-field-notes-v15", "afm-field-notes-v16", "other-app"], delete: remove },
    fetch: fetcher,
  });
  return { handlers, put, remove, fetcher };
}

it.each(["/api/profile", "/lab", "/auth/confirm?code=secret", "/?code=secret"])("never intercepts %s", (path) => {
  const { handlers, fetcher } = worker();
  const respondWith = vi.fn();
  handlers.fetch({ request: { method: "GET", url: `https://portfolio.test${path}`, mode: "navigate" }, respondWith });
  expect(respondWith).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
it.each(["private", "no-store"])("does not cache %s responses", async (control) => {
  const { handlers, put } = worker(new Response("private data", { headers: { "Cache-Control": control } }));
  let pending: Promise<unknown> | undefined;
  handlers.fetch({ request: { method: "GET", url: "https://portfolio.test/", mode: "navigate" },
    respondWith: (promise: Promise<unknown>) => { pending = promise; }, waitUntil: vi.fn() });
  await pending;
  expect(put).not.toHaveBeenCalled();
});
it("only retires this portfolio's obsolete caches", async () => {
  const { handlers, remove } = worker();
  let pending: Promise<unknown> | undefined;
  handlers.activate({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
  await pending;
  expect(remove.mock.calls).toEqual([["afm-field-notes-v15"]]);
});
