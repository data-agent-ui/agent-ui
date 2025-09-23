// const API_BASE_URL = 'http://localhost:5000';

// class ApiService {
//   // Health check
//   async checkHealth() {
//     try {
//       const response = await fetch(`${API_BASE_URL}/docs`);
//       return { status: 'ok' };
//     } catch (error) {
//       throw new Error('Failed to connect to server');
//     }
//   }

//   // Non-streaming chat
//   async sendMessage(message) {
//     try {
//       const response = await fetch(`${API_BASE_URL}/query`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ query: message }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         console.error('API Error Details:', {
//           status: response.status,
//           statusText: response.statusText,
//           url: response.url,
//           errorData: errorData,
//           timestamp: new Date().toISOString()
//         });
//         throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
//       }

//       return await response.json();
//     } catch (error) {
//       console.error('Send Message Error:', error);
//       throw error;
//     }
//   }

//   // Streaming chat using EventSource (simulated for non-streaming API)
//   createStreamingConnection(message, onChunk, onComplete, onError) {
//     // Use regular query endpoint since API doesn't support streaming
//     return fetch(`${API_BASE_URL}/query`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ query: message }),
//     })
//     .then(response => {
//       if (!response.ok) {
//         // Log detailed error information
//         response.json().then(errorData => {
//           console.error('API Error Details:', {
//             status: response.status,
//             statusText: response.statusText,
//             url: response.url,
//             errorData: errorData,
//             timestamp: new Date().toISOString()
//           });
//         }).catch(() => {
//           console.error('API Error (no JSON):', {
//             status: response.status,
//             statusText: response.statusText,
//             url: response.url,
//             timestamp: new Date().toISOString()
//           });
//         });
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }

//       // Handle non-streaming response
//       return response.json();
//     })
//     .then(data => {
//       // Simulate streaming by calling onComplete with the full response
//       onComplete({
//         response: data.result,
//         table: data.table,
//         chart: null,
//         map: null,
//         dashboard: null
//       });
//     })
//     .catch(error => {
//       console.error('Streaming Connection Error:', error);
//       onError(error);
//     });
//   }

//   // Get conversation history (not supported by API, return empty)
//   async getHistory() {
//     return { history: [] };
//   }

//   // Clear conversation history (not supported by API, return success)
//   async clearHistory() {
//     return { success: true };
//   }
// }

// export default new ApiService();



// services/apiService.js
const DEFAULT_HTTP_BASE = 'http://localhost:5000';

class HttpClient {
  constructor({ baseUrl = DEFAULT_HTTP_BASE, apiKey, model, enableStreaming = true } = {}) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.enableStreaming = enableStreaming;
  }

  async checkHealth() {
    const res = await fetch(`${this.baseUrl}/docs`, { method: 'GET' });
    if (!res.ok) throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
    return { status: 'ok' };
  }

  async sendMessage(message) {
    const res = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({ query: message, model: this.model })
    });
    if (!res.ok) {
      let details;
      try { details = await res.json(); } catch { }
      throw new Error(details?.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  // Stream over fetch + ReadableStream if server supports it; fallback otherwise
  // async createStreamingConnection(message, onChunk, onComplete, onError) {
  //   try {
  //     // Try text/event-stream or chunked text first
  //     const res = await fetch(`${this.baseUrl}/query-stream`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Accept: 'text/event-stream',
  //         ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
  //       },
  //       body: JSON.stringify({ query: message, model: this.model })
  //     });

  //     // If streaming endpoint not available, fallback to non-streaming
  //     if (!res.ok || !res.body || res.headers.get('content-type')?.includes('application/json')) {
  //       const full = await this.sendMessage(message);
  //       onComplete({
  //         response: full.result,
  //         table: full.table,
  //         chart: full.chart ?? null,
  //         map: full.map ?? null,
  //         dashboard: full.dashboard ?? null
  //       });
  //       return;
  //     }

  //     // Parse SSE or chunked lines
  //     const reader = res.body.getReader();
  //     const decoder = new TextDecoder('utf-8');
  //     let buffer = '';
  //     while (true) {
  //       const { value, done } = await reader.read();
  //       if (done) break;
  //       buffer += decoder.decode(value, { stream: true });
  //       const parts = buffer.split('\n\n');
  //       buffer = parts.pop() || '';
  //       for (const part of parts) {
  //         // SSE format: data: ...
  //         const line = part.split('\n').find(l => l.startsWith('data:'));
  //         if (!line) continue;
  //         const payload = line.replace(/^data:\s?/, '');
  //         if (payload === '[DONE]') continue;
  //         try {
  //           const obj = JSON.parse(payload);
  //           if (obj.delta) onChunk(obj.delta);
  //         } catch {
  //           onChunk(payload);
  //         }
  //       }
  //     }
  //     onComplete({ response: '', chart: null, table: null, map: null, dashboard: null });
  //   } catch (err) {
  //     onError(err);
  //   }
  // }

  //   // Streaming chat using EventSource (simulated for non-streaming API)
  //   createStreamingConnection(message, onChunk, onComplete, onError) {
  //     // Use regular query endpoint since API doesn't support streaming
  //     return fetch(`${API_BASE_URL}/query`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ query: message }),
  //     })
  //     .then(response => {
  //       if (!response.ok) {
  //         // Log detailed error information
  //         response.json().then(errorData => {
  //           console.error('API Error Details:', {
  //             status: response.status,
  //             statusText: response.statusText,
  //             url: response.url,
  //             errorData: errorData,
  //             timestamp: new Date().toISOString()
  //           });
  //         }).catch(() => {
  //           console.error('API Error (no JSON):', {
  //             status: response.status,
  //             statusText: response.statusText,
  //             url: response.url,
  //             timestamp: new Date().toISOString()
  //           });
  //         });
  //         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  //       }

  //       // Handle non-streaming response
  //       return response.json();
  //     })
  //     .then(data => {
  //       // Simulate streaming by calling onComplete with the full response
  //       onComplete({
  //         response: data.result,
  //         table: data.table,
  //         chart: null,
  //         map: null,
  //         dashboard: null
  //       });
  //     })
  //     .catch(error => {
  //       console.error('Streaming Connection Error:', error);
  //       onError(error);
  //     });
  //   }

  // Streaming chat using EventSource (simulated for non-streaming API)
  createStreamingConnection(message, onChunk, onComplete, onError) {
    // Use regular query endpoint since API doesn't support streaming
    return fetch(`${this.baseUrl}/query`, {
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


  async getHistory() { return { history: [] }; }
  async clearHistory() { return { success: true }; }
}

class WebSocketClient {
  constructor({ url = 'ws://localhost:8080', apiKey, model, enableStreaming = true } = {}) {
    this.url = url;
    this.apiKey = apiKey;
    this.model = model;
    this.enableStreaming = enableStreaming;
    this.ws = null;
  }

  async checkHealth() {
    // Attempt short-lived connection and close
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      const timer = setTimeout(() => {
        try { ws.close(); } catch { }
        reject(new Error('WebSocket timeout'));
      }, 4000);
      ws.onopen = () => { clearTimeout(timer); ws.close(); resolve({ status: 'ok' }); };
      ws.onerror = (e) => { clearTimeout(timer); reject(new Error('WebSocket error')); };
    });
  }

  connect({ onMessage, onError }) {
    this.ws = new WebSocket(this.url, this.apiKey ? ['authorization', `Bearer ${this.apiKey}`] : undefined);
    this.ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        onMessage?.(data);
      } catch {
        onMessage?.({ delta: evt.data });
      }
    };
    this.ws.onerror = (e) => onError?.(e);
  }

  sendMessage(message, { onChunk, onComplete, onError }) {
    if (!this.ws || this.ws.readyState !== 1) {
      onError?.(new Error('WebSocket not connected'));
      return;
    }
    const payload = { type: 'chat', query: message, model: this.model, stream: this.enableStreaming };
    this.ws.send(JSON.stringify(payload));
    // Server should send chunks as { delta } and a final { done, response, table, chart, ... }
    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.delta) onChunk?.(msg.delta);
        if (msg.done) {
          onComplete?.({
            response: msg.response || '',
            table: msg.table || null,
            chart: msg.chart || null,
            map: msg.map || null,
            dashboard: msg.dashboard || null
          });
        }
      } catch {
        onChunk?.(evt.data);
      }
    };
  }

  close() { try { this.ws?.close(); } catch { } }
}

class McpClient {
  constructor({ endpoint = 'mcp://local', apiKey } = {}) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.session = null;
  }
  async checkHealth() {
    // Placeholder until MCP integration is wired: assume reachable if endpoint string exists
    if (!this.endpoint) throw new Error('MCP endpoint missing');
    return { status: 'ok' };
  }
  async connect() {
    // TODO: implement MCP handshake; for now, mark as connected
    this.session = { connected: true };
    return this.session;
  }
  async listTools() { return []; }
  async callTool(name, args) { return { name, args, result: null }; }
}

class ApiService {
  constructor() {
    this.client = new HttpClient();
    this.mode = 'http';
  }

  configure(cfg) {
    const { mode, endpoint, apiKey, model, enableStreaming } = cfg;
    this.mode = mode;
    if (mode === 'http') this.client = new HttpClient({ baseUrl: endpoint, apiKey, model, enableStreaming });
    if (mode === 'websocket') this.client = new WebSocketClient({ url: endpoint, apiKey, model, enableStreaming });
    if (mode === 'mcp') this.client = new McpClient({ endpoint, apiKey });
  }

  async checkHealth() { return this.client.checkHealth(); }
  async getHistory() { return this.client.getHistory ? this.client.getHistory() : { history: [] }; }
  async clearHistory() { return this.client.clearHistory ? this.client.clearHistory() : { success: true }; }

  // Unified interface expected by ChatInterface
  async sendMessage(message) {
    if (this.mode === 'websocket') {
      throw new Error('Use createStreamingConnection for WebSocket');
    }
    return this.client.sendMessage(message);
  }

  async createStreamingConnection(message, onChunk, onComplete, onError) {
    if (this.mode === 'websocket') {
      // Ensure connection is open
      if (!this.client.ws || this.client.ws.readyState !== 1) {
        this.client.connect({
          onMessage: () => { },
          onError
        });
        // Give it a brief moment (or await an onopen promise in a real impl)
        await new Promise(r => setTimeout(r, 150));
      }
      this.client.sendMessage(message, { onChunk, onComplete, onError });
      return;
    }
    // HTTP path
    return this.client.createStreamingConnection(message, onChunk, onComplete, onError);
  }
}

export default new ApiService();
