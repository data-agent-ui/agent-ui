import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your AI Assistant Dashboard</p>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-card">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
            </svg>
            Overview
          </h3>
          <p>This is your main dashboard where you can view analytics, settings, and other important information.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
            </svg>
            Quick Actions
          </h3>
          <div className="quick-actions">
            <button className="action-button">View Analytics</button>
            <button className="action-button">Settings</button>
            <button className="action-button">Help</button>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" fill="currentColor"/>
            </svg>
            Recent Activity
          </h3>
          <p>Your recent AI assistant interactions and activity will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
