export async function readBoundedJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown | null> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return null;
  }
  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength && Number(declaredLength) > maxBytes) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body),
    );
  } catch {
    return null;
  }
}
