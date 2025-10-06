import { authFetch } from "./apiClient.js";
import { clearToken } from "./apiClient.js";

const DEFAULT_HTTP_BASE_API = `${process.env.REACT_APP_BASE_URL}/user`;

class UserService {
    async userSignIn(data) {
        return authFetch(`${DEFAULT_HTTP_BASE_API}/sign-in`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async logout() {
        try {
            // If your backend supports logout API, uncomment:
            // return authFetch(`${DEFAULT_HTTP_BASE_API}/logout`, { method: 'POST' });

            return Promise.resolve();
        } finally {
            clearToken(); // Use the centralized token manager
        }
    }
}

export default new UserService();
