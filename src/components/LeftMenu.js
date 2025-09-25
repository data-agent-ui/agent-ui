import React, { useEffect } from 'react';
import './LeftMenu.css';
import { IoSettings, IoTrashOutline, IoChatboxOutline, IoClose } from "react-icons/io5";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { RiChatNewLine } from "react-icons/ri";

const LeftMenu = ({
  activeItem,
  onItemClick,
  collapsed,
  setCollapsed,
  conversations = [],
  activeConversation,
  onConversationSelect,
  onNewChatView,
  onDeleteConversation,
  isMobileMenuOpen = false,
  setIsMobileMenuOpen
}) => {
  const topItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
        </svg>
      )
    },
    {
      id: 'assistant',
      label: 'New Chat',
      icon: <RiChatNewLine />
    },
  ];

  const bottomItems = [
    {
      id: 'agent-config',
      label: 'Configuration',
      icon: <IoSettings />
    },
  ];

  // Filter conversations to only show those with messages
  const conversationsWithMessages = conversations.filter(conv =>
    conv.messages && conv.messages.length > 0
  );

  // Generate conversation title from first message
  const getConversationTitle = (conversation) => {
    if (conversation.title) return conversation.title;

    const firstUserMessage = conversation.messages?.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content;
      return content.length > 30 ? content.substring(0, 30) + '...' : content;
    }

    return `Chat ${conversation.id.substring(0, 8)}`;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleDeleteConversation = (e, conversationId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(conversationId);
    }
  };

  // Close mobile menu when item is clicked
  const handleItemClick = (itemId) => {
    if (itemId === 'assistant') {
      onNewChatView();
    } else {
      onItemClick(itemId);
    }
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Close mobile menu when conversation is selected
  const handleConversationSelect = (conversationId) => {
    onConversationSelect(conversationId);
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768;

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen && setIsMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

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

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Header Bar - Only visible on mobile when menu is closed */}
      {isMobile && !isMobileMenuOpen && (
        <div className="mobile-header-bar">
          <button
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <HiOutlineMenuAlt2 />
          </button>
          <h2>AI Assistant</h2>
        </div>
      )}

      {/* Desktop Sidebar / Mobile Modal Menu */}
      <div className={`left-menu ${collapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="menu-header">
          {/* Show title based on screen size and state - Desktop only when not collapsed */}
          {!isMobile && !collapsed && <h2>AI Assistant</h2>}
          {/* Mobile: Show title and close button when menu is open */}
          {isMobile && <h2>AI Assistant</h2>}

          <button
            className="collapse-btn"
            onClick={() => {
              if (isMobile && setIsMobileMenuOpen) {
                setIsMobileMenuOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
          >
            {isMobile ? <IoClose /> : <HiOutlineMenuAlt2 />}
          </button>
        </div>

        {/* Menu Content - Only show on desktop or when mobile menu is open */}
        {(!isMobile || isMobileMenuOpen) && (
          <>
            {/* Top section */}
            <nav className="menu-nav">
              {topItems.map((item) => (
                <button
                  key={item.id}
                  className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                  title={collapsed && !isMobile ? item.label : ""}
                >
                  <span className="menu-icon">{item.icon}</span>
                  {/* Show labels on mobile or when not collapsed on desktop */}
                  {(isMobile || !collapsed) && <span className="menu-label">{item.label}</span>}
                </button>
              ))}

              {/* Conversations section - show on mobile or when not collapsed on desktop */}
              {(isMobile || !collapsed) && (
                <div className="conversations-section">
                  <div className="conversations-header">
                    <h3>Chats</h3>
                    <button
                      className="new-chat-btn"
                      title="New Chat"
                    >
                      <IoChatboxOutline />
                    </button>
                  </div>

                  <div className="conversations-list">
                    {conversationsWithMessages.length === 0 ? (
                      <div className="no-conversations">
                        <p>No conversations yet</p>
                      </div>
                    ) : (
                      conversationsWithMessages.map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`conversation-item ${activeItem === 'assistant' && activeConversation === conversation.id ? 'active' : ''
                            }`}
                          onClick={() => handleConversationSelect(conversation.id)}
                        >
                          <div className="conversation-content">
                            <div className="conversation-title">
                              {getConversationTitle(conversation)}
                            </div>
                            <div className="conversation-meta">
                              <span className="conversation-time">
                                {formatTimestamp(conversation.lastMessage)}
                              </span>
                              <span className="conversation-count">
                                {conversation.messages?.length || 0} messages
                              </span>
                            </div>
                          </div>
                          <button
                            className="delete-conversation-btn"
                            onClick={(e) => handleDeleteConversation(e, conversation.id)}
                            title="Delete conversation"
                          >
                            <RiDeleteBin6Line />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Collapsed conversations - only show on desktop when collapsed */}
              {!isMobile && collapsed && conversationsWithMessages.length > 0 && (
                <div className="conversations-collapsed">
                  <button
                    className="menu-item conversations-indicator"
                    title={`${conversationsWithMessages.length} conversations`}
                  >
                    <span className="menu-icon">
                      <IoChatboxOutline />
                    </span>
                    <span className="conversation-badge">{conversationsWithMessages.length}</span>
                  </button>
                </div>
              )}
            </nav>

            {/* Bottom section */}
            <div className="menu-bottom">
              {bottomItems.map((item) => (
                <button
                  key={item.id}
                  className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                  title={collapsed && !isMobile ? item.label : ""}
                >
                  <span className="menu-icon">{item.icon}</span>
                  {/* Show labels on mobile or when not collapsed on desktop */}
                  {(isMobile || !collapsed) && <span className="menu-label">{item.label}</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default LeftMenu;
