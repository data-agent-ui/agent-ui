let currentToken = null;

export function setToken(token) {
    currentToken = token;
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

export function getToken() {
    // Return in-memory token first, fallback to localStorage
    return currentToken || localStorage.getItem('token');
}

export function clearToken() {
    currentToken = null;
    localStorage.removeItem('token');
}

export async function authFetch(url, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {}),
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API call failed: ${response.status} ${text}`);
    }

    return response.json();
}
