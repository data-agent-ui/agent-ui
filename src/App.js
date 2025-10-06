import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LeftMenu from './components/LeftMenu.js';
import Dashboard from './components/Dashboard.js';
import ChatInterface from './components/ChatInterface.js';
import AgentConfig from './components/AgentConfig.js';
import { useConversationContext } from './context/ConversationContext.js';
import './App.css';
import SignIn from './components/SignIn.js';
import ProtectedRoute from './routes/ProtectedRoute.js';
import { useAuth } from './context/AuthContext.js';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const {
    conversations,
    activeConversation,
    pendingNewChat,
    isLoadingConversations,
    setActiveConversation,
    setPendingNewChat,
    updateConversation,
    getCurrentConversation,
    ensureConversationOnFirstMessage,
    loadConversations,
  } = useConversationContext();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);

      // Auto-close mobile menu on desktop (1024px+)
      if (window.innerWidth >= 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }

      // Reset collapsed state on mobile/tablet (below 1024px)
      if (window.innerWidth < 1024) {
        setCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const getActiveItem = () => {
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname.startsWith('/chat')) return 'assistant';
    if (location.pathname === '/configuration') return 'agent-config';
    return 'dashboard';
  };

  const handleNewChatView = () => {
    setActiveConversation(null);
    setPendingNewChat(true);
    navigate('/chat');
  };

  const handleConversationSelect = (conversationId) => {
    setActiveConversation(conversationId);
    setPendingNewChat(false);
    navigate(`/chat/${conversationId}`);
  };

  const handleItemClick = (itemId) => {
    if (itemId === 'dashboard') navigate('/dashboard');
    else if (itemId === 'assistant') {
      setActiveConversation(null);
      setPendingNewChat(true);
      navigate('/chat');
    } else if (itemId === 'agent-config') navigate('/configuration');
  };

  // Show loading while auth initializes
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a'
      }}>
        <div style={{
          color: '#fff',
          fontSize: '18px'
        }}>
          Initializing...
        </div>
      </div>
    );
  }

  // Render public login route
  if (location.pathname === '/login') {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }
    return <SignIn />;
  }

  // All other routes are protected
  return (
    <ProtectedRoute isAuthenticated={isAuthenticated}>
      <div className="App">
        <LeftMenu
          activeItem={getActiveItem()}
          onItemClick={handleItemClick}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          conversations={conversations}
          activeConversation={activeConversation}
          onConversationSelect={handleConversationSelect}
          onNewChatView={handleNewChatView}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          isLoadingConversations={isLoadingConversations}
          connectionStatus={connectionStatus}
        />

        <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            <Route
              path="/chat"
              element={
                <ChatInterface
                  connectionStatus={connectionStatus}
                  setConnectionStatus={setConnectionStatus}
                  setActiveItem={handleItemClick}
                  currentConversation={getCurrentConversation()}
                  onMessageUpdate={updateConversation}
                  activeConversationId={activeConversation}
                  ensureConversationOnFirstMessage={ensureConversationOnFirstMessage}
                  pendingNewChat={pendingNewChat}
                  loadConversations={loadConversations}
                />
              }
            />

            <Route
              path="/chat/:conversationId"
              element={
                <ChatInterface
                  connectionStatus={connectionStatus}
                  setConnectionStatus={setConnectionStatus}
                  setActiveItem={handleItemClick}
                  currentConversation={getCurrentConversation()}
                  onMessageUpdate={updateConversation}
                  activeConversationId={activeConversation}
                  ensureConversationOnFirstMessage={ensureConversationOnFirstMessage}
                  pendingNewChat={pendingNewChat}
                  loadConversations={loadConversations}
                />
              }
            />

            {/* Uncomment and add back AgentConfig if needed */}
            {/* <Route
              path="/configuration"
              element={
                <AgentConfig
                  onConnected={() => {
                    setConnectionStatus('connected');
                    navigate('/chat');
                  }}
                  onDisconnected={() => setConnectionStatus('disconnected')}
                  defaultMode="http"
                />
              }
            /> */}

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default App;