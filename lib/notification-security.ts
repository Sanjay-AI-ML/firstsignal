/** Read a bounded raw body before parsing or verifying provider signatures. */
export async function notificationBody(request: Request, maximumBytes: number) {
  if (Number(request.headers.get('content-length') ?? 0) > maximumBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0, body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) { await reader.cancel(); return null; }
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally { reader.releaseLock(); }
}

/** WebCrypto verifies an HMAC of a fixed message instead of comparing secrets. */
export async function notificationTokenMatches(provided: string, expected: string) {
  if (expected.length < 32 || expected.length > 256 || provided.length < 32 || provided.length > 256) return false;
  const bytes = new TextEncoder(), algorithm = { name: 'HMAC', hash: 'SHA-256' };
  const candidate = await crypto.subtle.importKey('raw', bytes.encode(provided), algorithm, false, ['sign']);
  const verifier = await crypto.subtle.importKey('raw', bytes.encode(expected), algorithm, false, ['verify']);
  const content = bytes.encode('findin-notification-dispatch-v1');
  return crypto.subtle.verify('HMAC', verifier, await crypto.subtle.sign('HMAC', candidate, content), content);
}

export async function verifyResendSignature(body: string, headers: Headers, secret: string, currentTime = Date.now()) {
  const id = headers.get('svix-id') ?? '', timestamp = headers.get('svix-timestamp') ?? '', signatures = headers.get('svix-signature') ?? '';
  if (!/^whsec_[A-Za-z0-9+/=_-]+$/.test(secret) || !/^[A-Za-z0-9_-]{1,200}$/.test(id) || !/^\d{10,12}$/.test(timestamp) || signatures.length > 2048) return false;
  if (Math.abs(currentTime / 1000 - Number(timestamp)) > 300) return false;
  try {
    const bytes = Uint8Array.from(atob(secret.slice(6)), character => character.charCodeAt(0));
    if (bytes.length < 16) return false;
    const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const content = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
    for (const signature of signatures.split(' ').slice(0, 8)) {
      if (!signature.startsWith('v1,')) continue;
      try {
        const value = Uint8Array.from(atob(signature.slice(3)), character => character.charCodeAt(0));
        if (value.length === 32 && await crypto.subtle.verify('HMAC', key, value, content)) return true;
      } catch { /* A rotated signature may still be valid. */ }
    }
  } catch { return false; }
  return false;
}
