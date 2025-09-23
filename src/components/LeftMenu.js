import React from 'react';
import './LeftMenu.css';
import { IoSettings } from "react-icons/io5";
import { HiOutlineMenuAlt2 } from "react-icons/hi";

const LeftMenu = ({ activeItem, onItemClick, collapsed, setCollapsed }) => {
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
      label: 'Assistant',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 
               10 10 10 10-4.48 10-10S17.52 2 
               12 2zm-2 15l-5-5 1.41-1.41L10 
               14.17l7.59-7.59L19 8l-9 9z"
            fill="currentColor"
          />
        </svg>
      )
    },
  ];

  const bottomItems = [
    {
      id: 'agent-config',
      label: 'Configuration',
      icon: <IoSettings />
    },
  ];

  return (
    <div className={`left-menu ${collapsed ? 'collapsed' : ''}`}>
      <div className="menu-header">
        {!collapsed && <h2>AI Assistant</h2>}
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          <HiOutlineMenuAlt2 />
        </button>
      </div>

      {/* Top section */}
      <nav className="menu-nav">
        {topItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => onItemClick(item.id)}
            title={collapsed ? item.label : ""}
          >
            <span className="menu-icon">{item.icon}</span>
            {!collapsed && <span className="menu-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="menu-bottom">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => onItemClick(item.id)}
            title={collapsed ? item.label : ""}
          >
            <span className="menu-icon">{item.icon}</span>
            {!collapsed && <span className="menu-label">{item.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeftMenu;
