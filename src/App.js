import React, { useState, useEffect } from 'react';
import LeftMenu from './components/LeftMenu';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import './App.css';
import AgentConfig from './components/AgentConfig';

function App() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Conversation management state
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [pendingNewChat, setPendingNewChat] = useState(false);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('ai_assistant_conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed);

        // Set the most recent conversation as active if exists
        if (parsed.length > 0) {
          const mostRecent = parsed.sort((a, b) => b.lastMessage - a.lastMessage)[0];
          setActiveConversation(mostRecent.id);
        }
      } catch (error) {
        console.error('Failed to load conversations from localStorage:', error);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ai_assistant_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Create a new conversation from first message
  const createConversationFromFirstMessage = (firstMessage) => {
    const newConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messages: [firstMessage],
      title: firstMessage.role === 'user'
        ? (firstMessage.content.length > 30
          ? firstMessage.content.substring(0, 30) + '...'
          : firstMessage.content)
        : null,
      created: Date.now(),
      lastMessage: Date.now()
    };

    setConversations(prev => [newConversation, ...prev]);
    setActiveConversation(newConversation.id);
    setPendingNewChat(false);
    return newConversation.id;
  };

  // Handle "New Chat" button - just switch to chat view without creating conversation
  const handleNewChatView = () => {
    setActiveConversation(null);
    setPendingNewChat(true);
    setActiveItem('assistant');
  };

  // Select a conversation
  const handleConversationSelect = (conversationId) => {
    setActiveConversation(conversationId);
    setPendingNewChat(false);
    setActiveItem('assistant');
  };

  // Delete a conversation
  const handleDeleteConversation = (conversationId) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));

    // If deleted conversation was active, select another or reset
    if (activeConversation === conversationId) {
      const remaining = conversations.filter(conv => conv.id !== conversationId);
      if (remaining.length > 0) {
        const mostRecent = remaining.sort((a, b) => b.lastMessage - a.lastMessage)[0];
        setActiveConversation(mostRecent.id);
      } else {
        setActiveConversation(null);
        setPendingNewChat(false);
      }
    }
  };

  // Update conversation with new messages
  const updateConversation = (conversationId, newMessage) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        const updatedMessages = [...conv.messages, newMessage];
        return {
          ...conv,
          messages: updatedMessages,
          lastMessage: Date.now(),
          // Set title from first user message if not already set
          title: conv.title || (newMessage.role === 'user' && updatedMessages.length === 1
            ? (newMessage.content.length > 30
              ? newMessage.content.substring(0, 30) + '...'
              : newMessage.content)
            : conv.title)
        };
      }
      return conv;
    }));
  };

  // Get current conversation data
  const getCurrentConversation = () => {
    return conversations.find(conv => conv.id === activeConversation);
  };

  // Ensure conversation exists when first message is sent
  const ensureConversationOnFirstMessage = (firstUserMessage) => {
    if (!activeConversation && pendingNewChat) {
      return createConversationFromFirstMessage(firstUserMessage);
    }
    return activeConversation;
  };

  return (
    <div className="App">
      <LeftMenu
        activeItem={activeItem}
        onItemClick={setActiveItem}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        conversations={conversations}
        activeConversation={activeConversation}
        onConversationSelect={handleConversationSelect}
        onNewChatView={handleNewChatView}
        onDeleteConversation={handleDeleteConversation}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <div
        className={`main-content ${collapsed ? 'collapsed' : ''}`}
      >
        {activeItem === 'dashboard' && <Dashboard />}
        {activeItem === 'assistant' && (
          <ChatInterface
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            setActiveItem={setActiveItem}
            // Pass conversation management props
            currentConversation={getCurrentConversation()}
            onMessageUpdate={updateConversation}
            activeConversationId={activeConversation}
            ensureConversationOnFirstMessage={ensureConversationOnFirstMessage}
            pendingNewChat={pendingNewChat}
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
