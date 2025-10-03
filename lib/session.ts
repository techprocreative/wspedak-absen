// Shared helpers for signing and verifying admin session cookies using Web Crypto (Edge/Node compatible)
// Produces a compact base64url payload.signature format

export type AdminSessionUser = {
  id: string
  email: string
  role: 'employee' | 'admin' | 'hr' | 'manager'
  name?: string
}

export type AdminSessionPayload = {
  user: AdminSessionUser
  iat: number // issued at (ms)
  exp: number // expiry (ms)
  token?: string // optional access token reference
}

// Base64url utilities
function base64urlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input)
  } else if (input instanceof Uint8Array) {
    bytes = input
  } else {
    bytes = new Uint8Array(input)
  }
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const b64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4)
  const binary = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret)
  // @ts-ignore - globalThis.crypto exists in Edge and Node 18+
  return await globalThis.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signSessionCookie(payload: AdminSessionPayload, secret: string): Promise<string> {
  const payloadJson = JSON.stringify(payload)
  const payloadPart = base64urlEncode(payloadJson)
  const key = await importHmacKey(secret)
  // @ts-ignore
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart))
  const signaturePart = base64urlEncode(sig)
  return `${payloadPart}.${signaturePart}`
}

export async function verifySessionCookie(cookieValue: string, secret: string): Promise<AdminSessionPayload | null> {
  if (!cookieValue || !secret) return null
  const [payloadPart, signaturePart] = cookieValue.split('.')
  if (!payloadPart || !signaturePart) return null

  try {
    const key = await importHmacKey(secret)
    const data = new TextEncoder().encode(payloadPart)
    const signature = base64urlDecode(signaturePart)
    // @ts-ignore
    const valid = await globalThis.crypto.subtle.verify('HMAC', key, signature, data)
    if (!valid) return null

    const jsonBytes = base64urlDecode(payloadPart)
    const json = new TextDecoder().decode(jsonBytes)
    const payload = JSON.parse(json) as AdminSessionPayload
    if (!payload?.user?.role || !payload?.exp) return null
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

