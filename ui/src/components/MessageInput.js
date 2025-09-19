import React, { useState, useRef, useEffect } from 'react';
import './MessageInput.css';

const MessageInput = ({ onSendMessage, disabled, placeholder = "Type your message here...", shouldFocus = false }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to fit content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);

  // Auto-focus textarea when AI finishes responding
  useEffect(() => {
    if (shouldFocus && textareaRef.current && !disabled) {
      // Small delay to ensure the UI has updated
      setTimeout(() => {
        textareaRef.current.focus();
      }, 100);
    }
  }, [shouldFocus, disabled]);

  return (
    <form className="message-input-form" onSubmit={handleSubmit}>
      <div className="message-input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="message-input"
          rows="1"
        />
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="send-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
