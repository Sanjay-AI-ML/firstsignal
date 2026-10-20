/**
 * Reads a bounded streaming request body.
 * Aborts early with HTTP 413 before oversized payloads consume server memory.
 */

function decodeBytes(bytes: Uint8Array): string {
  try {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
  } catch {
    throw new Error('Malformed UTF-8 request body');
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('utf8');
  }
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}

export async function readBoundedBody(
  request: Request,
  maximumBytes: number
): Promise<{ ok: true; body: string } | { ok: false; error: string; status: number }> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > maximumBytes) {
    return { ok: false, error: 'This request is too large.', status: 413 };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: true, body: '' };
  }

  let totalBytes = 0;
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel('Payload too large');
        return { ok: false, error: 'This request is too large.', status: 413 };
      }
      chunks.push(value);
    }

    if (chunks.length === 0) return { ok: true, body: '' };
    if (chunks.length === 1) return { ok: true, body: decodeBytes(chunks[0]) };

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, body: decodeBytes(merged) };
  } catch {
    return { ok: false, error: 'Unable to read your request.', status: 400 };
  } finally {
    reader.releaseLock();
  }
}
