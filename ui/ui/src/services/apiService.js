const API_BASE_URL = 'http://localhost:5000';

class ApiService {
  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('Failed to connect to server');
    }
  }

  // Non-streaming chat
  async sendMessage(message) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
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

  // Streaming chat using EventSource
  createStreamingConnection(message, onChunk, onComplete, onError) {
    // Since EventSource doesn't support POST, we'll use fetch with ReadableStream
    return fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    })
    .then(response => {
      if (!response.ok) {
        // Log detailed error information for streaming
        response.json().then(errorData => {
          console.error('Streaming API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorData: errorData,
            timestamp: new Date().toISOString()
          });
        }).catch(() => {
          console.error('Streaming API Error (no JSON):', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            timestamp: new Date().toISOString()
          });
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const readStream = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'chunk':
                    onChunk(data.content);
                    break;
                  case 'complete':
                    // Handle new response structure with separate fields
                    onComplete({
                      response: data.response,
                      chart: data.chart,
                      table: data.table,
                      map: data.map,
                      dashboard: data.dashboard
                    });
                    return;
                  case 'error':
                    console.error('Streaming Error from Server:', data.error);
                    onError(data.error);
                    return;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, 'Raw line:', line);
              }
            }
          }

          readStream();
        }).catch(error => {
          console.error('Streaming Read Error:', error);
          onError(error);
        });
      };

      readStream();
    })
    .catch(error => {
      console.error('Streaming Connection Error:', error);
      onError(error);
    });
  }

  // Get conversation history
  async getHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('History API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData: errorData,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Failed to get history: HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Get History Error:', error);
      throw error;
    }
  }

  // Clear conversation history
  async clearHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clear`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Clear History API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData: errorData,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Failed to clear history: HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Clear History Error:', error);
      throw error;
    }
  }
}

export default new ApiService();
