// components/AgentConfig.jsx
import React, { useState } from 'react';
import apiService from '../services/apiService';
import './AgentConfig.css';

export default function AgentConfig({ onConnected, onDisconnected, defaultMode = 'http' }) {
    const [mode, setMode] = useState(defaultMode); // 'websocket' | 'http' | 'mcp'
    const [endpoint, setEndpoint] = useState('http://localhost:5000');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [enableStreaming, setEnableStreaming] = useState(true);
    const [status, setStatus] = useState('idle'); // idle | checking | connected | error
    const [error, setError] = useState('');

    const connect = async (e) => {
        e.preventDefault();
        setStatus('checking');
        try {
            apiService.configure({ mode, endpoint, apiKey, model, enableStreaming });
            await apiService.checkHealth();
            setStatus('connected');
            onConnected?.();
        } catch (err) {
            setStatus('error');
            onDisconnected?.(err?.message);
        }
    };
    return (
        <div className="agent-config">
            <header className="agent-config__header">
                <h1>Configuration</h1>
                <span className={`badge ${status}`}>
                    {status === 'connected' ? 'Connected'
                        : status === 'checking' ? 'Checking...'
                            : status === 'error' ? 'Disconnected' : 'Idle'}
                </span>
            </header>

            <div className="agent-config__tabs">
                <button className={mode === 'http' ? 'tab active' : 'tab'} onClick={() => { setMode('http'); setEndpoint('http://localhost:5000'); }}>
                    HTTP API
                </button>
                <button className={mode === 'websocket' ? 'tab active' : 'tab'} onClick={() => { setMode('websocket'); setEndpoint('ws://localhost:8080'); }}>
                    WebSocket
                </button>
                <button className={mode === 'mcp' ? 'tab active' : 'tab'} onClick={() => { setMode('mcp'); setEndpoint('mcp://local'); }}>
                    MCP
                </button>
            </div>

            <form className="agent-config__form" onSubmit={connect}>
                <label>
                    Endpoint
                    <input
                        type="text"
                        placeholder={mode === 'websocket' ? 'ws://host:port' : mode === 'http' ? 'https://api.host/v1' : 'mcp://server-id'}
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                        required
                    />
                </label>

                {mode !== 'mcp' && (
                    <label>
                        API Key (optional)
                        <input
                            type="password"
                            placeholder="sk-..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                    </label>
                )}

                <label>
                    Model (optional)
                    <input
                        type="text"
                        placeholder="gpt-4o, claude-3.5, llama-3, etc."
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                    />
                </label>

                {mode !== 'mcp' && (
                    <label
                        className="checkbox"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={enableStreaming}
                            onChange={(e) => setEnableStreaming(e.target.checked)}
                            style={{ margin: 0, padding: 0 }}
                        />
                        <span style={{ lineHeight: 1 }}>Enable streaming responses</span>
                    </label>
                )}

                {mode === 'mcp' && (
                    <div className="note">Connects to an MCP server; tools/resources become available after connect.</div>
                )}

                {error && <div className="form-error">{error}</div>}

                <div className="actions">
                    <button type="submit" className="btn-primary" disabled={status === 'checking'}>
                        {status === 'checking' ? 'Connecting...' : 'Connect'}
                    </button>
                </div>
            </form>
        </div>
    );
}
