import React from 'react';
import ChartMessage from './ChartMessage.js';
import MarkdownRenderer from './MarkdownRenderer.js';
import { extractChartData, extractTextWithoutChart, formatChartData } from '../utils/chartUtils.js';
import './MessageList.css';

const generateMarkdownTable = (title, columns, rows) => {
  let md = `## ${title}\n\n`;
  md += `| ${columns.join(' | ')} |\n`;
  md += `| ${columns.map(() => '---').join(' | ')} |\n`;
  rows.forEach(row => {
    const rowData = columns.map(col => row[col] !== undefined ? row[col] : '');
    md += `| ${rowData.join(' | ')} |\n`;
  });
  return md;
};

const MessageList = ({ messages, isStreaming, streamingContent }) => {
  const renderMessageContent = (message) => {
    // Handle new API response structure with separate fields
    if (message.chart) {
      // New structure: separate response and chart fields
      const formattedChartData = formatChartData(message.chart.chartData, message.chart.type);

      return (
        <div className="message-with-chart">
          {message.response && (
            <div className="message-text">
              <MarkdownRenderer content={message.response} />
            </div>
          )}
          <ChartMessage
            chartData={formattedChartData}
            chartType={message.chart.type}
          />
        </div>
      );
    }

    if (message.table) {
      // Handle table display
      const { title, columns, rows } = message.table;
      const markdown = generateMarkdownTable(title, columns, rows);
      return <MarkdownRenderer content={markdown} />;
    }

    // Handle legacy structure or plain text/markdown
    const content = message.response || message.content || '';
    const chartInfo = extractChartData(content);

    if (chartInfo.hasChart) {
      const textWithoutChart = extractTextWithoutChart(content);
      const formattedChartData = formatChartData(chartInfo.chartData, chartInfo.chartType);

      return (
        <div className="message-with-chart">
          {textWithoutChart && (
            <div className="message-text">
              <MarkdownRenderer content={textWithoutChart} />
            </div>
          )}
          <ChartMessage
            chartData={formattedChartData}
            chartType={chartInfo.chartType}
          />
        </div>
      );
    }

    return <MarkdownRenderer content={content} />;
  };


  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <div key={index} className={`message ${message.role}`}>
          <div className="message-content">
            {renderMessageContent(message)}
          </div>
          <div className="message-meta">
            <span className="message-role">{message.role}</span>
            <span className="message-time">
              {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}

      {isStreaming && streamingContent && (
        <div className="message assistant streaming">
          <div className="message-content">
            <MarkdownRenderer content={streamingContent} />
            <span className="streaming-cursor">|</span>
          </div>
          <div className="message-meta">
            <span className="message-role">assistant</span>
            <span className="streaming-indicator">typing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;