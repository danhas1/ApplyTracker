// Base endpoint for the backend API.
const API_URL = "http://localhost:3000";

/**
 * Reads the JWT from Chrome storage.
 * @returns {Promise<string|undefined>}
 */
function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get("token", (data) => resolve(data.token));
  });
}

/**
 * Ensures a user token exists, otherwise redirect to the login page.
 * The rejection thrown here is intentionally silent; callers should catch it.
 */
async function ensureToken() {
  // If no token exists we send users back to login.
  const token = await getToken();
  if (!token) {
    window.location.href = "login.html";
    throw new Error("AUTH_REQUIRED");
  }
  return token;
}

/**
 * Clears the stored token and redirects to login.
 */
function forceLogout() {
  // Remove the token and immediately hop back to login.
  chrome.storage.local.remove("token", () => {
    window.location.href = "login.html";
  });
}

/**
 * Wrapper around fetch that adds auth headers, normalizes JSON parsing, and
 * surfaces friendlier errors when the backend returns HTML instead of JSON.
 *
 * @param {string} path - API path beginning with a slash.
 * @param {object} options
 * @param {string} [options.method="GET"]
 * @param {object|FormData|string} [options.body]
 * @param {boolean} [options.auth=true] - Whether to attach the bearer token.
 * @param {object} [options.headers]
 */
async function apiRequest(path, { method = "GET", body, auth = true, headers = {} } = {}) {
  // Start with JSON defaults but allow callers to override.
  const finalHeaders = { Accept: "application/json", ...headers };
  let payload = body;

  if (auth) {
    try {
      const token = await ensureToken();
      finalHeaders.Authorization = `Bearer ${token}`;
    } catch (err) {
      throw err;
    }
  }

  if (payload && !(payload instanceof FormData)) {
    // Automatically stringify non-FormData payloads.
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
    if (typeof payload !== "string") {
      payload = JSON.stringify(payload);
    }
  }

  // Kick off the request.
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
  });

  // Read raw text so we can show meaningful errors when JSON parsing explodes.
  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      if (!response.ok) {
        throw new Error(`Server responded ${response.status}: ${rawText.slice(0, 80)}`);
      }
      throw new Error("Server returned invalid JSON. Check that the backend is running.");
    }
  }

  if (!response.ok) {
    // Drop back to login when auth fails so users can re-auth.
    if (response.status === 401 && auth) {
      forceLogout();
      return Promise.reject(new Error("Please log in again."));
    }
    const message = data && data.message ? data.message : `Request failed (${response.status}).`;
    throw new Error(message);
  }

  return data;
}
