// App.js
import React, { useState } from 'react';
import LeftMenu from './components/LeftMenu.js';
import Dashboard from './components/Dashboard.js';
import ChatInterface from './components/ChatInterface.js';
import './App.css';
import AgentConfig from './components/AgentConfig.js';

function App() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [collapsed, setCollapsed] = useState(false); // 👈 add state

  return (
    <div className="App">
      <LeftMenu
        activeItem={activeItem}
        onItemClick={setActiveItem}
        collapsed={collapsed}
        setCollapsed={setCollapsed} // 👈 pass setter down
      />
      <div
        className={`main-content ${collapsed ? 'collapsed' : ''}`} // 👈 add collapsed class
      >
        {activeItem === 'dashboard' && <Dashboard />}
        {activeItem === 'assistant' && (
          <ChatInterface
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            setActiveItem={setActiveItem}
          />
        )}
        {activeItem === 'agent-config' && (
          <AgentConfig
            onConnected={() => {
              setConnectionStatus('connected');
              setActiveItem('assistant');
            }}
            onDisconnected={(msg) => setConnectionStatus('disconnected')}
            defaultMode="http"
          />
        )}
      </div>
    </div>
  );
}

export default App;
