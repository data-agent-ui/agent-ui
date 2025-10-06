import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { setToken as saveToken, clearToken } from '../services/apiClient.js';

// Shape of decoded token is app-specific; minimally { id, userId, exp }
function safeDecode(token) {
    try {
        return jwtDecode(token);
    } catch {
        return null;
    }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => {
        const storedToken = localStorage.getItem('token');
        saveToken(storedToken); // Initialize module variable
        return storedToken;
    });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user from token on mount or token change
    useEffect(() => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        const decoded = safeDecode(token);

        // Check if token is valid
        if (!decoded) {
            clearToken();
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
        }

        // Check expiration with buffer (5 minutes before actual expiry)
        if (decoded?.exp) {
            const expiryTime = decoded.exp * 1000;
            const bufferTime = 5 * 60 * 1000; // 5 minutes
            const currentTime = Date.now();

            if (expiryTime - bufferTime < currentTime) {
                clearToken();
                setToken(null);
                setUser(null);
                setLoading(false);
                return;
            }
        }

        // Set user from decoded token
        setUser({
            id: decoded?.id,
            userId: decoded?.userId,
            ...decoded // Include any other claims
        });
        setLoading(false);
    }, [token]);

    const signIn = useCallback(({ token: newToken, user: serverUser }) => {
        setToken(newToken);
        saveToken(newToken); // Update module variable immediately
        const decoded = safeDecode(newToken);
        setUser(serverUser ?? decoded ?? null);
    }, []);

    const signOut = useCallback(() => {
        setToken(null);
        setUser(null);
        clearToken(); // Clear from module variable and localStorage
    }, []);

    // Authenticated fetch helper available via context
    const authFetch = useCallback(async (url, options = {}) => {
        if (!token) {
            throw new Error('No authentication token available');
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
            Authorization: `Bearer ${token}`,
        };

        const resp = await fetch(url, { ...options, headers });

        // Handle 401 Unauthorized - token might be invalid
        if (resp.status === 401) {
            signOut();
            throw new Error('Unauthorized - please sign in again');
        }

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`API call failed: ${resp.status} ${text}`);
        }

        return resp.json();
    }, [token, signOut]);

    const value = useMemo(() => ({
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        signIn,
        signOut,
        authFetch,
    }), [token, user, loading, signIn, signOut, authFetch]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
