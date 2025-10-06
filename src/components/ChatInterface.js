import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MessageList from './MessageList.js';
import MessageInput from './MessageInput.js';
import agentService from '../services/agentService.js';
import apiService from '../services/apiService.js';
import './ChatInterface.css';
import { IoChatboxOutline, IoSparkles, IoAnalytics, IoDocument } from "react-icons/io5";
import { useConversationContext } from '../context/ConversationContext.js';

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="loading-message">
    <div className="loading-message-header">
      <div className="loading-avatar shimmer"></div>
      <div className="loading-name shimmer"></div>
    </div>
    <div className="loading-text-line long shimmer"></div>
    <div className="loading-text-line medium shimmer"></div>
    <div className="loading-text-line short shimmer"></div>
  </div>
);

// Typing indicator component
const TypingIndicator = () => (
  <div className="typing-indicator">
    <div className="loading-avatar shimmer"></div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '14px', color: '#64748b' }}>AI is thinking</span>
      <div className="typing-dots">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
    </div>
  </div>
);

const ChatInterface = ({ connectionStatus, setConnectionStatus, setActiveItem }) => {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const {
    activeConversation,
    pendingNewChat,
    messages,
    setMessages,
    setActiveConversation,
    updateConversation,
    ensureConversationOnFirstMessage,
    loadConversations,
    conversations
  } = useConversationContext();

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);

  const currentConversation = conversations.find(c => c.id === activeConversation);
  const messagesEndRef = useRef(null);

  const conversationStarters = [
    {
      icon: <IoAnalytics />,
      title: "Generate Charts",
      subtitle: "Create interactive line, bar, or doughnut charts",
      prompt: "Create a chart showing monthly sales data with interactive features"
    },
    {
      icon: <IoDocument />,
      title: "Markdown Content",
      subtitle: "Format text with headers, tables, and code blocks",
      prompt: "Help me create a markdown document with tables, code examples, and properly formatted headers"
    },
  ];

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(scrollToBottom, [messages, streamingContent]);

  // Sync URL parameter with active conversation
  useEffect(() => {
    if (conversationId && conversationId !== activeConversation) {
      setActiveConversation(conversationId);
    }
  }, [conversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      setMessages(currentConversation.messages || []);
    } else if (pendingNewChat) {
      setMessages([]);
    }
  }, [currentConversation, pendingNewChat]);

  useEffect(() => {
    checkServerHealth();
  }, []);

  useEffect(() => {
    if (shouldFocusInput) setShouldFocusInput(false);
  }, [shouldFocusInput]);

 const checkServerHealth = async () => {
  try {
    const response = await agentService.checkHealth();
    setConnectionStatus('connected');
  } catch (error) {
    console.error('Health check failed:', error);
    setConnectionStatus('disconnected');
    setError('Unable to connect to AI server. Make sure it is running on localhost:5000');
  }
};


  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    setError(null);
    setIsLoading(true);
    setIsStreaming(false);
    setStreamingContent('');

    const userMessage = { role: 'user', content: messageText, timestamp: Date.now() };

    let convId = currentConversation?.id;

    if (!convId && pendingNewChat) {
      convId = ensureConversationOnFirstMessage(userMessage);
      navigate(`/chat/${convId}`, { replace: true });
    } else if (convId) {
      updateConversation(convId, userMessage);
    } else {
      setError('No active conversation.');
      setIsLoading(false);
      return;
    }

    setMessages(prev => [...prev, userMessage]);

    try {
      setIsStreaming(true);
      await agentService.createStreamingConnection(
        messageText,
        chunk => setStreamingContent(prev => prev + chunk),
        async (completeData) => {
          setStreamingContent('');
          setIsStreaming(false);
          setIsLoading(false);

          const assistantMessage = {
            role: 'assistant',
            response: completeData.response,
            chart: completeData.chart,
            table: completeData.table,
            map: completeData.map,
            dashboard: completeData.dashboard,
            timestamp: Date.now()
          };

          setMessages(prev => [...prev, assistantMessage]);
          updateConversation(convId, assistantMessage);
          setShouldFocusInput(true);

          try {
            const threadPayload = {
              conversationId: convId,
              timestamp: Date.now(),
              messages: [
                { role: 'user', content: messageText },
                {
                  role: 'assistant', content: completeData.response || '', meta: {
                    hasChart: !!completeData.chart,
                    hasTable: !!completeData.table,
                    hasMap: !!completeData.map,
                    hasDashboard: !!completeData.dashboard,
                    chartType: completeData.chart?.type || null,
                  }
                }
              ],
              meta: { source: 'ui', version: '1.0' }
            };
            await apiService.postThreads(threadPayload);
          } catch (err) {
            console.error('Failed to store conversation:', err);
          }
        },
        error => {
          console.error('Chat error:', error);
          setError(error?.message || 'Failed to get AI response');
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingContent('');
        }
      );
    } catch (error) {
      console.error('Chat send error:', error);
      setError(error?.message || 'Failed to send message');
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleClearChat = () => setMessages([]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#F44336';
      case 'checking': return '#FF9800';
      default: return '#64748b';
    }
  };

  const getConversationTitle = () => {
    if (pendingNewChat && !currentConversation) return 'New Chat';
    if (!currentConversation) return 'No Conversation';
    if (currentConversation.title) return currentConversation.title;

    const firstUserMessage = currentConversation.messages?.find(msg => msg.role === 'user');
    const firstContent = firstUserMessage?.content || '';
    if (firstContent) {
      return firstContent.length > 40
        ? firstContent.substring(0, 40) + '...'
        : firstContent;
    }

    return `Chat ${currentConversation.id?.substring(5, 13) || ''}`;
  };

  const showWelcomeInterface = (currentConversation || pendingNewChat) && (messages?.length || 0) === 0;

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="header-content">
          <div className="conversation-info">
            <h1>{getConversationTitle()}</h1>
            <span className='conversation-info-span'>
              {currentConversation ? new Date(currentConversation.created).toLocaleDateString() : ''}
            </span>
          </div>
          <div className="connection-status">
            <div className="status-indicator" style={{ backgroundColor: getStatusColor() }} />
            <span className="status-text">{connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}</span>
          </div>
        </div>
        <div className="header-actions">
          {connectionStatus === 'connected' && (
            <button
              className="disconnect-button"
              onClick={() => {
                setIsStreaming(false);
                setIsLoading(false);
                setStreamingContent('');
                setConnectionStatus('disconnected');
                setError(null);
              }}
              aria-label="Disconnect assistant"
              title="Disconnect"
            >
              Disconnect
            </button>
          )}
          <button
            className="clear-button"
            onClick={handleClearChat}
            disabled={(messages?.length || 0) === 0}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showWelcomeInterface && (
        <div className="welcome-interface">
          <div className="welcome-content">
            <div className="welcome-header">
              <div className="welcome-icon"><IoSparkles /></div>
              <h2>Welcome to AI Assistant</h2>
              <p>Your intelligent companion for charts, markdown, and real-time conversations</p>
            </div>

            <div className="conversation-starters">
              {conversationStarters.map((starter, index) => (
                <button
                  key={index}
                  className="starter-card"
                  onClick={() => handleSendMessage(starter.prompt)}
                  disabled={isLoading}
                >
                  <div className="starter-icon">{starter.icon}</div>
                  <div className="starter-content">
                    <h3>{starter.title}</h3>
                    <p>{starter.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="welcome-features">
              <div className="feature-highlight">
                <span className="feature-badge">🎯</span>
                <span>Real-time streaming responses</span>
              </div>
              <div className="feature-highlight">
                <span className="feature-badge">📊</span>
                <span>Interactive charts & visualizations</span>
              </div>
              <div className="feature-highlight">
                <span className="feature-badge">📝</span>
                <span>Full markdown rendering support</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(currentConversation || pendingNewChat) && messages.length > 0 && (
        <>
          <div className="messages-container">
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
            />
            {(isLoading || isStreaming) && !streamingContent && <LoadingSkeleton />}
            {isStreaming && streamingContent && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      {(currentConversation || pendingNewChat) && (
        <div className="input-container">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading || connectionStatus !== 'connected'}
            shouldFocus={shouldFocusInput}
            placeholder={
              isLoading
                ? 'AI is thinking...'
                : connectionStatus === 'disconnected'
                  ? 'Connect to server to send messages...'
                  : 'Type your message here...'
            }
          />
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
