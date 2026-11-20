// Count received bytes: Content-Length can be absent or inaccurate.
export async function readJsonBody(request: Request, limit: number): Promise<
  { ok: true; data: unknown } | { ok: false; status: number; error: string }
> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return { ok: false, status: 415, error: "Expected application/json" };
  }
  if (Number(request.headers.get("content-length")) > limit) {
    return { ok: false, status: 413, error: "Request too large" };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "Invalid JSON" };
  let size = 0;
  let text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Request too large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  } finally {
    reader.releaseLock();
  }
}
