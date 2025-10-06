import { authFetch } from "./apiClient.js";

const DEFAULT_HTTP_BASE_API = `${process.env.REACT_APP_BASE_URL}/api`;

class ApiService {
    async postThreads(data) {
        return authFetch(`${DEFAULT_HTTP_BASE_API}/threads`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async listConversations() {
        return authFetch(`${DEFAULT_HTTP_BASE_API}/conversations`, {
            method: 'GET'
        });
    }

    async getConversationThreads(conversationId) {
        return authFetch(`${DEFAULT_HTTP_BASE_API}/conversations/${encodeURIComponent(conversationId)}/threads`, {
            method: 'GET'
        });
    }

    async deleteThread(threadId) {
        return authFetch(`${DEFAULT_HTTP_BASE_API}/threads/${threadId}`, {
            method: 'DELETE'
        });
    }

    async deleteConversation(conversationId) {
        return authFetch(`${DEFAULT_HTTP_BASE_API}/conversations/${conversationId}`, {
            method: 'DELETE'
        });
    }
}

export default new ApiService();
