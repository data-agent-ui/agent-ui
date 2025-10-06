import { authFetch, getToken } from "./apiClient.js";

const DEFAULT_HTTP_BASE = `${process.env.REACT_APP_BASE_URL}/agent`;

class HttpClient {
  constructor({ baseUrl = DEFAULT_HTTP_BASE, apiKey, model, enableStreaming = true } = {}) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.enableStreaming = enableStreaming;
  }

  async checkHealth() {
    try {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const response = await fetch(`${this.baseUrl}/docs`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return { status: 'ok' };
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  async sendMessage(message) {
    return authFetch(`${this.baseUrl}/query`, {
      method: 'POST',
      body: JSON.stringify({ query: message, model: this.model }),
    });
  }

  async createStreamingConnection(message, onChunk, onComplete, onError) {
    try {
      const data = await authFetch(`${this.baseUrl}/query`, {
        method: 'POST',
        body: JSON.stringify({ query: message }),
      });

      onComplete({
        response: data.response,
        table: data.table,
        chart: data.chart,
        map: null,
        dashboard: null,
      });
    } catch (error) {
      console.error('Streaming Connection Error:', error);
      onError(error);
    }
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
    if (!this.endpoint) throw new Error('MCP endpoint missing');
    return { status: 'ok' };
  }
  async connect() {
    this.session = { connected: true };
    return this.session;
  }
  async listTools() { return []; }
  async callTool(name, args) { return { name, args, result: null }; }
}

class AgentService {
  constructor() {
    this.client = new HttpClient();
    this.mode = 'http';
  }

  configure(cfg) {
    const { mode, endpoint, apiKey, model, enableStreaming } = cfg;
    this.mode = mode;

    if (mode === 'http')
      this.client = new HttpClient({ baseUrl: endpoint, apiKey, model, enableStreaming });
    else if (mode === 'websocket')
      this.client = new WebSocketClient({ url: endpoint, apiKey, model, enableStreaming });
    else if (mode === 'mcp')
      this.client = new McpClient({ endpoint, apiKey });
  }

  async checkHealth() {
    return this.client.checkHealth();
  }

  async sendMessage(message) {
    if (this.mode === 'websocket') {
      throw new Error('Use createStreamingConnection for WebSocket');
    }
    return this.client.sendMessage(message);
  }

  async createStreamingConnection(message, onChunk, onComplete, onError) {
    if (this.mode === 'websocket') {
      if (!this.client.ws || this.client.ws.readyState !== 1) {
        this.client.connect({
          onMessage: () => { },
          onError
        });
        await new Promise(r => setTimeout(r, 150));
      }
      this.client.sendMessage(message, { onChunk, onComplete, onError });
      return;
    }

    return this.client.createStreamingConnection(message, onChunk, onComplete, onError);
  }
}

export default new AgentService();
