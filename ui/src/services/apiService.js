const API_BASE_URL = 'http://localhost:5000';

class ApiService {
  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/docs`);
      return { status: 'ok' };
    } catch (error) {
      throw new Error('Failed to connect to server');
    }
  }

  // Non-streaming chat
  async sendMessage(message) {
    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData: errorData,
          timestamp: new Date().toISOString()
        });
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Send Message Error:', error);
      throw error;
    }
  }

  // Streaming chat using EventSource (simulated for non-streaming API)
  createStreamingConnection(message, onChunk, onComplete, onError) {
    // Use regular query endpoint since API doesn't support streaming
    return fetch(`${API_BASE_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: message }),
    })
    .then(response => {
      if (!response.ok) {
        // Log detailed error information
        response.json().then(errorData => {
          console.error('API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorData: errorData,
            timestamp: new Date().toISOString()
          });
        }).catch(() => {
          console.error('API Error (no JSON):', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            timestamp: new Date().toISOString()
          });
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle non-streaming response
      return response.json();
    })
    .then(data => {
      // Simulate streaming by calling onComplete with the full response
      onComplete({
        response: data.result,
        table: data.table,
        chart: null,
        map: null,
        dashboard: null
      });
    })
    .catch(error => {
      console.error('Streaming Connection Error:', error);
      onError(error);
    });
  }

  // Get conversation history (not supported by API, return empty)
  async getHistory() {
    return { history: [] };
  }

  // Clear conversation history (not supported by API, return success)
  async clearHistory() {
    return { success: true };
  }
}

export default new ApiService();
