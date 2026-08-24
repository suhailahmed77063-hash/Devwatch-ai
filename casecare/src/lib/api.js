/**
 * Frontend API client (SIH26047 §46, §51). Talks to the backend through the
 * Vite dev proxy (`/api` → :4000), so the browser stays same-origin and the
 * httpOnly auth cookie is first-party. Unwraps the `{ ok, data }` envelope and
 * throws a typed ApiError on failure.
 */

export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const opts = { method, credentials: 'include', headers: { ...headers }, signal }
  if (body instanceof FormData) {
    opts.body = body
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`/api${path}`, opts)
  const type = res.headers.get('content-type') || ''
  const payload = type.includes('application/json') ? await res.json() : null

  if (!res.ok || (payload && payload.ok === false)) {
    const err = (payload && payload.error) || {}
    throw new ApiError(err.message || res.statusText || 'Request failed', { status: res.status, code: err.code, details: err.details })
  }
  return payload ? payload.data : null
}

export const api = {
  get: (p, o) => request(p, { ...o, method: 'GET' }),
  post: (p, body, o) => request(p, { ...o, method: 'POST', body }),
  put: (p, body, o) => request(p, { ...o, method: 'PUT', body }),
  patch: (p, body, o) => request(p, { ...o, method: 'PATCH', body }),
  del: (p, o) => request(p, { ...o, method: 'DELETE' }),
  upload: (p, formData, o) => request(p, { ...o, method: 'POST', body: formData }),
}

/** Absolute URL for links the browser opens directly (PDF, file downloads). */
export const apiUrl = (path) => `/api${path}`
