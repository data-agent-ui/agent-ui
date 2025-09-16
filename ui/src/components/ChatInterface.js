import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import apiService from '../services/apiService';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const messagesEndRef = useRef(null);
  const [showMockButton, setShowMockButton] = useState(true);

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
    const mockMessage = {
      role: 'assistant',
      response: "Report completed successfully\n\nTotal Records: 41\nColumns: Outlet, Payment_Type, Num_Transactions, Num_New_Sales, Num_Balance_Payments, New_Sales_Amount, Balance_Paid_Amount, Total_Amount, pay_GST, Tax_Collected, Net_Amount\nSample Data: {'Outlet': 'MB01', 'Payment_Type': 'VISA', 'Num_Transactions': 846, 'Num_New_Sales': 0, 'Num_Balance_Payments': 0, 'New_Sales_Amount': 0.0, 'Balance_Paid_Amount': 0.0, 'Total_Amount': 318360.61, 'pay_GST': 26172.60, 'Tax_Collected': 292188.01, 'Net_Amount': 292188.01}",
      table: {
        title: "Collection Report by Payment Type",
        columns: [
          "Outlet", "Payment_Type", "Num_Transactions", "Num_New_Sales", "Num_Balance_Payments",
          "New_Sales_Amount", "Balance_Paid_Amount", "Total_Amount", "pay_GST", "Tax_Collected", "Net_Amount"
        ],
        rows: [
          {
            "Outlet": "MB01",
            "Payment_Type": "VISA",
            "Num_Transactions": 846,
            "Num_New_Sales": 0,
            "Num_Balance_Payments": 0,
            "New_Sales_Amount": 0,
            "Balance_Paid_Amount": 0,
            "Total_Amount": 318360.61,
            "pay_GST": 26172.60,
            "Tax_Collected": 292188.01,
            "Net_Amount": 292188.01
          },
          {
            "Outlet": "MB01",
            "Payment_Type": "MASTER",
            "Num_Transactions": 664,
            "Num_New_Sales": 0,
            "Num_Balance_Payments": 0,
            "New_Sales_Amount": 0,
            "Balance_Paid_Amount": 0,
            "Total_Amount": 247653.25,
            "pay_GST": 20270.50,
            "Tax_Collected": 227382.75,
            "Net_Amount": 227382.75
          },
          {
            "Outlet": "MB01",
            "Payment_Type": "PREPAID",
            "Num_Transactions": 311,
            "Num_New_Sales": 0,
            "Num_Balance_Payments": 0,
            "New_Sales_Amount": 0,
            "Balance_Paid_Amount": 0,
            "Total_Amount": 55254.31,
            "pay_GST": 0,
            "Tax_Collected": 55254.31,
            "Net_Amount": 55254.31
          },
          {
            "Outlet": "MB01",
            "Payment_Type": "AMEX",
            "Num_Transactions": 119,
            "Num_New_Sales": 0,
            "Num_Balance_Payments": 0,
            "New_Sales_Amount": 0,
            "Balance_Paid_Amount": 0,
            "Total_Amount": 49768.04,
            "pay_GST": 4109.28,
            "Tax_Collected": 45658.76,
            "Net_Amount": 45658.76
          }
        ]
      },
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, mockMessage]);
    setShowMockButton(false);  // Hide the button after adding the mock message
  };



  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'disconnected': return '#F44336';
      default: return '#FF9800';
    }
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
        <button
          className="clear-button"
          onClick={handleClearChat}
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* ✅ Dummy button to generate mock report */}
      {/* {showMockButton && (
        <button onClick={handleGenerateMockApiResponse} style={{ marginTop: "10px" }}>
          Generate API Mock Response
        </button>
      )} */}


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
