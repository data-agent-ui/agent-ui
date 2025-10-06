import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './LeftMenu.css';
import { IoSettings, IoChatboxOutline, IoClose } from "react-icons/io5";
import { HiOutlineMenuAlt2 } from "react-icons/hi";
import { RiDeleteBin6Line, RiChatNewLine } from "react-icons/ri";
import { useConversationContext } from '../context/ConversationContext.js';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import userService from '../services/userService.js';
import { useAuth } from '../context/AuthContext.js';

const LeftMenu = ({
  connectionStatus,
  activeItem,
  onItemClick,
  collapsed,
  setCollapsed,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onConversationSelect
}) => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    setPendingNewChat,
    handleDeleteConversation
  } = useConversationContext();

  const { user, signOut } = useAuth();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();

  const topItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" /></svg>) },
    { id: 'assistant', label: 'New Chat', icon: <RiChatNewLine /> },
  ];

  const bottomItems = [];

  const userData = {
    initials: user?.userId ? user.userId.substring(0, 2).toUpperCase() : 'U',
    userId: user?.userId || 'User',
    plan: 'Free Plan' // You can update this based on actual plan data if available
  };

  const conversationsWithMessages = conversations.filter(conv => conv.messages?.length > 0);

  const getConversationTitle = (conversation) => {
    if (conversation.title) return conversation.title;
    const firstUserMessage = conversation.messages?.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content;
      return content.length > 30 ? content.substring(0, 30) + '...' : content;
    }
    return `Chat ${conversation.id.substring(0, 8)}`;
  };

  const formatTimestamp = (timestamp) => {
    const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const d = new Date(ts);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };


  const handleDelete = (e, convId) => {
    e.stopPropagation();
    confirmAlert({
      customUI: ({ onClose }) => {
        return (
          <div className="ca-backdrop">
            <div className="ca-card">
              <h3 className="ca-title">Delete Conversation</h3>
              <p className="ca-message">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              <div className="ca-actions">
                <button className="ca-btn cancel" onClick={onClose}>Cancel</button>
                <button
                  className="ca-btn confirm"
                  onClick={() => {
                    handleDeleteConversation(convId);
                    onClose();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      },
    });
  };

  const handleItemClick = (itemId) => {
    if (itemId === 'assistant') {
      setActiveConversation(null);
      setPendingNewChat(true);
    }
    onItemClick(itemId);
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      // Optionally call backend logout if implemented
      // await userService.logout();
    } finally {
      signOut();
      navigate('/login');
    }
  };

  const handleConversationClick = (id) => {
    if (onConversationSelect) {
      onConversationSelect(id);
    }
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

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
      {/* Mobile backdrop - only show on mobile when menu is open */}
      {isMobileMenuOpen && <div className="mobile-menu-backdrop" onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)} />}

      {/* Mobile header bar - always visible on mobile */}
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

      {/* Left menu sidebar */}
      <div className={`left-menu ${collapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="menu-header">
          <h2>AI Assistant</h2>
          <button
            className="collapse-btn"
            onClick={() => {
              if (window.innerWidth <= 992) {
                setIsMobileMenuOpen && setIsMobileMenuOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            aria-label="Close menu"
          >
            {window.innerWidth <= 992 ? <IoClose /> : <HiOutlineMenuAlt2 />}
          </button>
        </div>

        <nav className="menu-nav">
          {topItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
              title={collapsed ? item.label : ""}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}

          <div className="conversations-section">
            <div className="conversations-header">
              <h3>Chats</h3>
              <button className="new-chat-btn" onClick={() => handleItemClick('assistant')} title="New Chat">
                <IoChatboxOutline />
              </button>
            </div>

            <div className="conversations-list">
              {conversationsWithMessages.length === 0 ? (
                <div className="no-conversations"><p>No conversations yet</p></div>
              ) : (
                conversationsWithMessages.map((conv) => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${(activeItem === 'assistant' && activeConversation === conv.id) ? 'active' : ''}`}
                    onClick={() => handleConversationClick(conv.id)}
                  >
                    <div className="conversation-content">
                      <div className="conversation-title">{getConversationTitle(conv)}</div>
                      <div className="conversation-meta">
                        <span className="conversation-time">{formatTimestamp(conv.lastMessage)}</span>
                        <span className="conversation-count">{conv.messages?.length || 0} messages</span>
                      </div>
                    </div>
                    <button className="delete-conversation-btn" onClick={(e) => handleDelete(e, conv.id)} title="Delete conversation">
                      <RiDeleteBin6Line />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {collapsed && conversationsWithMessages.length > 0 && (
            <div className="conversations-collapsed">
              <button className="menu-item conversations-indicator" title={`${conversationsWithMessages.length} conversations`}>
                <span className="menu-icon"><IoChatboxOutline /></span>
                <span className="conversation-badge">{conversationsWithMessages.length}</span>
              </button>
            </div>
          )}
        </nav>

        <div className="menu-bottom">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
              title={collapsed ? item.label : ""}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
            </button>
          ))}

          <button
            className="menu-item profile-item"
            onClick={() => setIsProfileModalOpen(!isProfileModalOpen)}
            title={collapsed ? "Profile" : ""}
          >
            <span className="menu-icon profile-avatar">
              {userData.initials}
            </span>
            <div className="profile-info">
              <span className="profile-name">{userData.userId}</span>
              <span className="profile-plan">{userData.plan}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Profile modal */}
      {isProfileModalOpen && (
        <>
          <div className="profile-modal-backdrop" onClick={() => setIsProfileModalOpen(false)} />
          <div className="profile-modal">
            <div className="profile-modal-header">
              <div className="profile-modal-avatar">
                {userData.initials}
              </div>
              <div className="profile-modal-info">
                <div className="profile-modal-name">{userData.userId}</div>
                {/* <div className="profile-modal-email">{userData.email}</div> */}
              </div>
            </div>
            <div className="profile-modal-divider" />
            <div className="profile-modal-actions">
              <button className="profile-modal-item">
                <span>Profile Settings</span>
              </button>
              <button className="profile-modal-item" onClick={handleLogout}>
                <span>Log out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default LeftMenu;
