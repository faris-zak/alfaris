import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../../service-worker.js", import.meta.url), "utf8");
const obsoleteCache = "afm-field-notes-obsolete";

function worker(response = new Response("ok")) {
  const handlers: Record<string, (event: any) => void> = {};
  const put = vi.fn();
  const remove = vi.fn();
  const cache = { match: vi.fn(), put };
  const fetcher = vi.fn(async () => response);
  const currentCache = runInNewContext(`${source}\nCACHE_NAME;`, {
    URL,
    self: { location: { href: "https://portfolio.test/service-worker.js", origin: "https://portfolio.test" },
      addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
      clients: { claim: vi.fn() }, skipWaiting: vi.fn() },
    caches: { open: async () => cache, keys: async () => [obsoleteCache, currentCache, "other-app"], delete: remove },
    fetch: fetcher,
  });
  return { handlers, match: cache.match, put, remove, fetcher };
}

it.each(["/api/profile", "/lab", "/auth/confirm?code=secret", "/?code=secret", "/ar/?code=secret"])("never intercepts %s", (path) => {
  const { handlers, fetcher } = worker();
  const respondWith = vi.fn();
  handlers.fetch({ request: { method: "GET", url: `https://portfolio.test${path}`, mode: "navigate" }, respondWith });
  expect(respondWith).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  ["/", "./index.html"],
  ["/index.html", "./index.html"],
  ["/ar/", "./ar/"],
  ["/ar", "./ar/"],
  ["/ar/index.html", "./ar/"],
  ["/cv.html", "./cv.html"],
])("opens %s offline using %s", async (path, cacheKey) => {
  const { handlers, match, put, fetcher } = worker();
  const cachedPage = new Response(cacheKey);
  fetcher.mockRejectedValueOnce(new Error("offline"));
  match.mockResolvedValueOnce(cachedPage);
  const respondWith = vi.fn();
  handlers.fetch({
    request: { method: "GET", url: `https://portfolio.test${path}`, mode: "navigate" },
    respondWith,
    waitUntil: vi.fn(),
  });

  expect(await respondWith.mock.calls[0][0]).toBe(cachedPage);
  expect(match).toHaveBeenCalledWith(cacheKey);
  expect(put).not.toHaveBeenCalled();
});

it("stores a freshly fetched Arabic homepage under the Arabic cache key", async () => {
  const { handlers, put } = worker(new Response("Arabic homepage"));
  const respondWith = vi.fn();
  const waitUntil = vi.fn();
  handlers.fetch({
    request: { method: "GET", url: "https://portfolio.test/ar/", mode: "navigate" },
    respondWith,
    waitUntil,
  });
  await respondWith.mock.calls[0][0];
  await waitUntil.mock.calls[0][0];

  expect(put).toHaveBeenCalledExactlyOnceWith("./ar/", expect.any(Response));
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
  expect(remove.mock.calls).toEqual([[obsoleteCache]]);
});
