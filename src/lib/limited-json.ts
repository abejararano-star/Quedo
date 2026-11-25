export async function readLimitedJson(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length")) > maxBytes) return { status: 413 } as const;
  const reader = request.body?.getReader();
  if (!reader) return { status: 400 } as const;
  const buffer = new Uint8Array(maxBytes);
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (size + chunk.value.byteLength > maxBytes) {
        await reader.cancel();
        return { status: 413 } as const;
      }
      buffer.set(chunk.value, size);
      size += chunk.value.byteLength;
    }
    const data: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size)));
    if (!data || typeof data !== "object" || Array.isArray(data)) return { status: 400 } as const;
    return { status: 200, data: data as Record<string, unknown> } as const;
  } catch { return { status: 400 } as const; }
  finally { reader.releaseLock(); }
}
