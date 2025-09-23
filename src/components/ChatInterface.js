import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList.js';
import MessageInput from './MessageInput.js';
import apiService from '../services/apiService.js';
import './ChatInterface.css';
import {
  generateMockApiResponse, generateMockLineChart,
  generateMockBarChart,
  generateMockDoughnutChart,
  generateMockPieChart
} from '../utils/testResponse.js';
import { IoChatboxOutline } from "react-icons/io5";

const ChatInterface = ({ connectionStatus, setConnectionStatus, setActiveItem }) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [connectionStatus, setConnectionStatus] = useState('checking');
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const messagesEndRef = useRef(null);
  const [showMockButton, setShowMockButton] = useState(true);
  const [showChartMockButtons, setShowChartMockButtons] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    // Check server health on component mount
    checkServerHealth();
    loadHistory();
  }, []);

  // Reset focus trigger after it's been used
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

  const loadHistory = async () => {
    try {
      const historyData = await apiService.getHistory();
      if (historyData.history) {
        setMessages(historyData.history.map(msg => ({
          ...msg,
          timestamp: Date.now()
        })));
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleSendMessage = async (messageText) => {
    if (connectionStatus !== 'connected') {
      setError('Not connected. Configure connection first.');
      return;
    }
    if (!messageText.trim()) return;

    setError(null);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    // Add user message to the list
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Use streaming for better UX
      await apiService.createStreamingConnection(
        messageText,
        // onChunk
        (chunk) => {
          setStreamingContent(prev => prev + chunk);
        },
        // onComplete
        (completeData) => {
          setStreamingContent('');
          setIsStreaming(false);
          setIsLoading(false);

          // Add assistant message to the list with new response structure
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

          // Trigger focus on input after AI responds
          setShouldFocusInput(true);
        },
        // onError
        (error) => {
          console.error('Chat Interface Error:', {
            error: error,
            message: messageText,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
          setError(error || 'Failed to get response from AI assistant');
          setIsStreaming(false);
          setIsLoading(false);
          setStreamingContent('');
        }
      );
    } catch (error) {
      console.error('Chat Interface Catch Error:', {
        error: error,
        message: messageText,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      setError(error.message || 'Failed to send message');
      setIsStreaming(false);
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleClearChat = async () => {
    try {
      await apiService.clearHistory();
      setMessages([]);
      setError(null);
    } catch (error) {
      setError('Failed to clear chat history');
    }
  };

  // ✅ New handler to add mock report message
  const handleGenerateMockApiResponse = () => {
    const mockMessage = generateMockApiResponse();
    setMessages(prev => [...prev, mockMessage]);
    setShowMockButton(false);
    setShowChartMockButtons(false);
  };

  // Line Chart Mock
  const handleGenerateMockLineChart = () => {
    const mockMessage = generateMockLineChart();
    setMessages(prev => [...prev, mockMessage]);
    setShowChartMockButtons(false);
    setShowMockButton(false);
  };

  // Bar Chart Mock
  const handleGenerateMockBarChart = () => {
    const mockMessage = generateMockBarChart();
    setMessages(prev => [...prev, mockMessage]);
    setShowChartMockButtons(false);
    setShowMockButton(false);
  };

  // Doughnut Chart Mock
  const handleGenerateMockDoughnutChart = () => {
    const mockMessage = generateMockDoughnutChart();
    setMessages(prev => [...prev, mockMessage]);
    setShowChartMockButtons(false);
    setShowMockButton(false);
  };

  // Pie Chart Mock
  const handleGenerateMockPieChart = () => {
    const mockMessage = generateMockPieChart();
    setMessages(prev => [...prev, mockMessage]);
    setShowChartMockButtons(false);
    setShowMockButton(false);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#F44336';
      case 'checking': return '#FF9800';
      default: return '#64748b'; // idle
    }
  };

  const goToConfig = () => {
    setActiveItem('agent-config'); // navigate to config page
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="header-content">
          {/* <h1>AI Assistant</h1> */}
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
                // stop any pending activity
                setIsStreaming(false);
                setIsLoading(false);
                setStreamingContent('');
                // mark app as disconnected
                setConnectionStatus('disconnected');
                // optional: notify user
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

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "50px" }}>
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

      </div>

      {connectionStatus !== 'connected' && (
        <div className="disconnected-card">
          <div className="disconnected-icon-wrap">
            <IoChatboxOutline className="disconnected-icon" />
          </div>
          <h1 className="disconnected-title">Connect to an AI agent to start chatting</h1>
          <p className="disconnected-subtitle">Supports HTTP API, WebSocket and MCP connections</p>
          <button className="disconnected-button" onClick={() => setActiveItem('agent-config')}>
            Configure Connection
          </button>
          {connectionStatus === 'checking' && <div className="disconnected-hint">Attempting to connect...</div>}
          {connectionStatus === 'idle' && <div className="disconnected-hint">No connection configured yet.</div>}
        </div>
      )}

      <div className="messages-container">
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
        />
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isLoading || connectionStatus === 'disconnected'}
          shouldFocus={shouldFocusInput}
          placeholder={
            connectionStatus === 'disconnected'
              ? 'Cannot send messages - server disconnected'
              : isLoading
                ? 'AI is thinking...'
                : 'Type your message here...'
          }
        />
      </div>
    </div>
  );
};

export default ChatInterface;
