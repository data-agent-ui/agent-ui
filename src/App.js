import React, { useState } from 'react';
import LeftMenu from './components/LeftMenu.js';
import Dashboard from './components/Dashboard.js';
import ChatInterface from './components/ChatInterface.js';
import './App.css';

function App() {
  const [activeItem, setActiveItem] = useState('dashboard');

  const handleMenuClick = (itemId) => {
    setActiveItem(itemId);
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard':
        return <Dashboard />;
      case 'assistant':
        return <ChatInterface />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App">
      <LeftMenu activeItem={activeItem} onItemClick={handleMenuClick} />
      <div className="main-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
