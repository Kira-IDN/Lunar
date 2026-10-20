/**
 * LUNAR Asynchronous API & Data Loading Utility (api.js)
 * Clean, lightweight wrapper over native fetch() with explicit HTTP error status checks,
 * JSON validation, timeout support, and descriptive error classes.
 */

export class HttpError extends Error {
  constructor(status, statusText, url) {
    super(`HTTP ${status} (${statusText || 'Error'}): Failed to load ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

export class ParseError extends Error {
  constructor(message, originalError, url) {
    super(`Payload Parsing Error: ${message} from ${url}`);
    this.name = 'ParseError';
    this.originalError = originalError;
    this.url = url;
  }
}

export class NetworkError extends Error {
  constructor(message, originalError, url) {
    super(`Network Failure: ${message} while requesting ${url}`);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.url = url;
  }
}

/**
 * Fetch and parse JSON with explicit HTTP status and format validation
 * @param {string} url - Target URL
 * @param {RequestInit & { timeout?: number }} [options] - Optional fetch init options + timeout ms
 * @returns {Promise<any>}
 */
export async function fetchJson(url, options = {}) {
  const { timeout = 8000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // If caller provided an external abort signal, chain it
  if (fetchOptions.signal) {
    fetchOptions.signal.addEventListener('abort', () => controller.abort());
  }
  fetchOptions.signal = controller.signal;

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new NetworkError(`Request timed out after ${timeout}ms`, err, url);
    }
    throw new NetworkError(err.message || 'Network connection failed or host unreachable', err, url);
  }

  clearTimeout(timeoutId);

  // Explicit HTTP status validation (native fetch() does NOT reject on 4xx / 5xx)
  if (!response.ok) {
    throw new HttpError(response.status, response.statusText, url);
  }

  try {
    const data = await response.json();
    return data;
  } catch (err) {
    throw new ParseError('Malformed or non-JSON content received', err, url);
  }
}

// Global exposure for headless testing and non-module compatibility
if (typeof window !== 'undefined') {
  window.LunarApi = {
    fetchJson,
    HttpError,
    ParseError,
    NetworkError
  };
}
