import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import apiService from '../services/apiService';
import './ChatInterface.css';
// import {
//   generateMockApiResponse, generateMockLineChart,
//   generateMockBarChart,
//   generateMockDoughnutChart,
//   generateMockPieChart
// } from '../utils/testResponse';
import { IoChatboxOutline, IoSparkles, IoCodeSlash, IoAnalytics, IoDocument, IoSearch } from "react-icons/io5";

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

const ChatInterface = ({
  connectionStatus,
  setConnectionStatus,
  setActiveItem,
  currentConversation,
  onMessageUpdate,
  activeConversationId,
  ensureConversationOnFirstMessage,
  pendingNewChat,
}) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const messagesEndRef = useRef(null);
  // const [showMockButton, setShowMockButton] = useState(true);
  // const [showChartMockButtons, setShowChartMockButtons] = useState(true);

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
    // {
    //   icon: <IoCodeSlash />,
    //   title: "Code Analysis",
    //   subtitle: "Review and optimize React components",
    //   prompt: "Analyze my React component code for performance improvements and best practices"
    // },
    // {
    //   icon: <IoSearch />,
    //   title: "API Integration",
    //   subtitle: "Troubleshoot streaming responses and connections",
    //   prompt: "Help me debug streaming chat responses and optimize real-time communication"
    // }
  ];

  // const handleGenerateMockApiResponse = () => {
  //   const mockMessage = generateMockApiResponse();
  //   setMessages(prev => [...prev, mockMessage]);
  //   setShowMockButton(false);
  // };

  // const handleGenerateMockLineChart = () => {
  //   const mockMessage = generateMockLineChart();
  //   setMessages(prev => [...prev, mockMessage]);
  //   setShowChartMockButtons(false);
  //   setShowMockButton(false);
  // };

  // // Bar Chart Mock
  // const handleGenerateMockBarChart = () => {
  //   const mockMessage = generateMockBarChart();
  //   setMessages(prev => [...prev, mockMessage]);
  //   setShowChartMockButtons(false);
  //   setShowMockButton(false);
  // };

  // // Doughnut Chart Mock
  // const handleGenerateMockDoughnutChart = () => {
  //   const mockMessage = generateMockDoughnutChart();
  //   setMessages(prev => [...prev, mockMessage]);
  //   setShowChartMockButtons(false);
  //   setShowMockButton(false);
  // };

  // // Pie Chart Mock
  // const handleGenerateMockPieChart = () => {
  //   const mockMessage = generateMockPieChart();
  //   setMessages(prev => [...prev, mockMessage]);
  //   setShowChartMockButtons(false);
  //   setShowMockButton(false);
  // };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (currentConversation) {
      setMessages(currentConversation.messages || []);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  useEffect(() => {
    checkServerHealth();
  }, []);

  useEffect(() => {
    if (shouldFocusInput) {
      setShouldFocusInput(false);
    }
  }, [shouldFocusInput]);

  const checkServerHealth = async () => {
    try {
      await apiService.checkHealth();
      setConnectionStatus('connected');
    } catch (error) {
      setConnectionStatus('disconnected');
      setError('Unable to connect to the AI assistant server. Please make sure the server is running on localhost:5000');
    }
  };

  const handleSuggestionClick = (prompt) => {
    handleSendMessage(prompt);
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    setError(null);
    setIsLoading(true);
    setIsStreaming(false);
    setStreamingContent('');

    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    };

    let convId = activeConversationId;
    if (!convId && pendingNewChat) {
      convId = ensureConversationOnFirstMessage(userMessage);
    } else if (convId) {
      onMessageUpdate(convId, userMessage);
    } else {
      setError('No active conversation. Please create a new conversation.');
      setIsLoading(false);
      return;
    }

    setMessages(prev => [...prev, userMessage]);

    // if (connectionStatus !== 'connected') {
    //   try {
    //     // Simulate loading delay for demo
    //     await new Promise(resolve => setTimeout(resolve, 2000));
    //     const dummy = generateDummyResponse(messageText);
    //     const assistantMessage = {
    //       role: 'assistant',
    //       response: dummy.response || '',
    //       chart: dummy.chart || null,
    //       table: dummy.table || null,
    //       map: dummy.map || null,
    //       dashboard: dummy.dashboard || null,
    //       timestamp: Date.now()
    //     };

    //     setMessages(prev => [...prev, assistantMessage]);
    //     onMessageUpdate(convId, assistantMessage);
    //     setShouldFocusInput(true);
    //   } catch (e) {
    //     setError('Failed to generate response');
    //   } finally {
    //     setIsLoading(false);
    //   }
    //   return;
    // }

    try {
      setIsStreaming(true);
      await apiService.createStreamingConnection(
        messageText,
        (chunk) => {
          setStreamingContent(prev => prev + chunk);
        },
        (completeData) => {
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
          onMessageUpdate(convId, assistantMessage);
          setShouldFocusInput(true);
        },
        (error) => {
          console.error('Chat Interface Error:', {
            error: error?.message || error,
            message: messageText,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
          setError(error?.message || error?.toString() || 'Failed to get response from AI assistant');
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingContent('');
        }
      );
    } catch (error) {
      console.error('Chat Interface Catch Error:', {
        error: error?.message || error,
        message: messageText,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      setError(error?.message || error?.toString() || 'Failed to send message');
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleClearChat = async () => {
    if (!activeConversationId) return;

    try {
      setMessages([]);
      setError(null);
    } catch (error) {
      setError('Failed to clear chat history');
    }
  };

  // const generateDummyResponse = (messageText) => {
  //   const responses = {
  //     'hi': 'Hello! This is a dummy response for testing purposes. The API is currently disconnected.',
  //     'hello': 'Hi there! This is a test response since the server is not available.',
  //     'test': 'Testing successful! This dummy response confirms the chat interface is working.',
  //     'help': 'This is a dummy help response. Available commands: hi, hello, test, help, report',
  //     'report': 'Generating dummy report...'
  //   };

  //   const lowerMessage = messageText.toLowerCase().trim();

  //   if (lowerMessage.includes('report')) {
  //     return {
  //       response: "Dummy Report Generated Successfully\n\nThis is a test report with sample data for development purposes.\n\nTotal Records: 25\nProcessing Time: 0.5 seconds\nStatus: Complete",
  //       table: {
  //         title: "Sample Test Data",
  //         columns: ["ID", "Name", "Status", "Amount", "Date"],
  //         rows: [
  //           { "ID": 1, "Name": "Test Item 1", "Status": "Active", "Amount": 100.50, "Date": "2024-01-15" },
  //           { "ID": 2, "Name": "Test Item 2", "Status": "Pending", "Amount": 250.00, "Date": "2024-01-16" },
  //           { "ID": 3, "Name": "Test Item 3", "Status": "Complete", "Amount": 75.25, "Date": "2024-01-17" }
  //         ]
  //       }
  //     };
  //   }

  //   return {
  //     response: responses[lowerMessage] || `You said: "${messageText}". This is a dummy response for testing when API is disconnected.`
  //   };
  // };

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

    if (currentConversation.messages && currentConversation.messages.length > 0) {
      const firstUserMessage = currentConversation.messages.find(msg => msg.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.content;
        return content.length > 40 ? content.substring(0, 40) + '...' : content;
      }
    }

    return `Chat ${currentConversation.id.substring(5, 13)}`;
  };

  const showWelcomeInterface = (activeConversationId || pendingNewChat) && messages.length === 0;

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="header-content">
          <div className="conversation-info">
            <h1>{getConversationTitle()}</h1>
            {currentConversation && (
              <span className="conversation-meta">
                {messages.length} messages • {new Date(currentConversation.created).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="connection-status">
            <div
              className="status-indicator"
              style={{ backgroundColor: getStatusColor() }}
            />
            <span className="status-text">
              {connectionStatus === 'connected' ? 'Connected' :
                connectionStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
            </span>
          </div>
        </div>
        <div>
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
              style={{ marginLeft: 8 }}
              aria-label="Disconnect assistant"
              title="Disconnect"
            >
              Disconnect
            </button>
          )}
          <button
            className="clear-button"
            onClick={handleClearChat}
            disabled={messages.length === 0}
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

      {!activeConversationId && !pendingNewChat && (
        <div className="no-conversation">
          <div className="no-conversation-content">
            <IoChatboxOutline className="no-conversation-icon" />
            <h2>No conversation selected</h2>
            <p>Select a conversation from the sidebar or create a new one to start chatting.</p>
          </div>
        </div>
      )}

      {showWelcomeInterface && (
        <div className="welcome-interface">
          <div className="welcome-content">
            <div className="welcome-header">
              <div className="welcome-icon">
                <IoSparkles />
              </div>
              <h2>Welcome to AI Assistant</h2>
              <p>Your intelligent companion for charts, markdown, and real-time conversations</p>
            </div>

            <div className="conversation-starters">
              {conversationStarters.map((starter, index) => (
                <button
                  key={index}
                  className="starter-card"
                  onClick={() => handleSuggestionClick(starter.prompt)}
                  disabled={isLoading}
                >
                  <div className="starter-icon">
                    {starter.icon}
                  </div>
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

      {/* ✅ Dummy button to generate mock report */}
      {/* {showMockButton && (
        <button onClick={handleGenerateMockApiResponse} style={{ marginTop: "50px", width: "250px", backgroundColor: "blueviolet" }}>
          Generate API Mock Response
        </button>
      )} */}

      {/* Chart Testing Buttons */}
      {/* {showChartMockButtons && (
        <div style={{
          marginTop: "10px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          padding: "10px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          // backgroundColor: "#f9fafb"
        }}>
          <div style={{ width: "100%", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>
            Test Chart Types:
          </div>
          <button
            onClick={() => { handleGenerateMockLineChart(); setShowChartMockButtons(false); }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4b5563",
              color: "white",
              border: "none",
              borderRadius: "4px"
            }}
          >
            📈 Line Chart
          </button>
          <button
            onClick={() => { handleGenerateMockBarChart(); setShowChartMockButtons(false); }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#10a37f",
              color: "white",
              border: "none",
              borderRadius: "4px"
            }}
          >
            📊 Bar Chart
          </button>
          <button
            onClick={() => { handleGenerateMockDoughnutChart(); setShowChartMockButtons(false); }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "4px"
            }}
          >
            🍩 Doughnut Chart
          </button>
          <button
            onClick={() => { handleGenerateMockPieChart(); setShowChartMockButtons(false); }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "4px"
            }}
          >
            🥧 Pie Chart
          </button>
        </div>
      )} */}

      {(activeConversationId || pendingNewChat) && messages.length > 0 && (
        <>
          <div className="messages-container">
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
            />
            {/* Show loading skeleton when AI is processing */}
            {(isLoading || isStreaming) && !streamingContent && (
              <LoadingSkeleton />
            )}

            {/* Show typing indicator when streaming content */}
            {isStreaming && streamingContent && (
              <TypingIndicator />
            )}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      {(activeConversationId || pendingNewChat) && (
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