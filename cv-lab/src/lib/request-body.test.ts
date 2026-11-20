import { describe, expect, it } from "vitest";
import { readJsonBody } from "./request-body";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/profile", {
    method: "PUT", body, headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("bounded JSON requests", () => {
  it("accepts JSON at the byte boundary", async () => {
    expect(await readJsonBody(request('{"a":1}'), 7)).toEqual({ ok: true, data: { a: 1 } });
  });
  it.each<Record<string, string>>([{}, { "content-length": "1" }])("rejects excessive bytes regardless of declared size %j", async (headers) => {
    expect(await readJsonBody(request('"éééé"', headers), 8)).toMatchObject({ ok: false, status: 413 });
  });
  it("cancels a chunked stream as soon as the limit is exceeded", async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(6)); },
      cancel() { cancelled = true; },
    });
    const input = new Request("http://localhost/api/profile", {
      method: "PUT", headers: { "content-type": "application/json" }, body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readJsonBody(input, 10)).toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });
  it("returns a controlled error for malformed JSON", async () => {
    expect(await readJsonBody(request('{broken'), 100)).toMatchObject({ status: 400, error: "Invalid JSON" });
  });
  it("rejects non-JSON form bodies", async () => {
    expect(await readJsonBody(request('{}', { "Content-Type": "text/plain" }), 100)).toMatchObject({ status: 415 });
  });
});
