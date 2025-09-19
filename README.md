# AI Assistant UI

A modern React-based chat interface for interacting with an AI assistant. This application provides a clean, responsive UI for chatting with an AI assistant that supports both streaming and non-streaming responses, interactive charts, markdown rendering, and a professional dark theme.

## ✨ Features

- **🎯 Real-time Streaming Chat**: Experience live responses as the AI generates them
- **📊 Interactive Charts**: Automatically renders charts and graphs from AI responses
- **📝 Markdown Support**: Full markdown rendering with syntax highlighting and tables
- **💬 Multi-line Input**: Auto-resizing textarea with support for multiple lines
- **🔄 Auto-focus Input**: Automatically focuses input after AI responses for seamless conversation flow
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🌙 Dark Theme**: Professional dark theme with dark grey accents
- **📋 Left Navigation**: Dashboard and Assistant sections with clean navigation
- **💾 Conversation History**: View and maintain chat history across sessions
- **🔗 Connection Status**: Visual indicator showing server connection status
- **⚠️ Error Handling**: Graceful error handling with user-friendly messages
- **🎨 Modern UI**: Clean, accessible interface with smooth animations

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- The AI Assistant API server running on `localhost:5000`

### Installation

1. **Clone the repository** (if not already done)
2. **Install dependencies**:
   ```bash
   npm install
   ```

   This will install all required dependencies including:
   - React and React DOM
   - Chart.js and react-chartjs-2 for interactive charts
   - react-markdown and remark-gfm for markdown rendering
   - React Scripts for development

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open your browser** at `http://localhost:3000`

## 🔌 API Integration

This UI connects to the AI Assistant API running on `localhost:5000`. The following endpoints are used:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/chat/stream` | POST | Streaming chat responses |
| `/api/chat` | POST | Non-streaming chat responses |
| `/api/history` | GET | Get conversation history |
| `/api/clear` | POST | Clear conversation history |

## 📖 Usage Guide

### Basic Chat
1. **Navigate to Assistant**: Click "Assistant" in the left menu
2. **Type your message**: Use the multi-line input field
3. **Send message**: Press Enter or click the send button
4. **View responses**: AI responses appear in real-time with typing indicators

### Markdown Support
The application supports full markdown rendering including:

- **Headers** (H1, H2, H3)
- **Bold** and *italic* text
- **Code blocks** and `inline code`
- **Lists** (ordered and unordered)
- **Tables**
- **Blockquotes**
- **Links** (open in new tab)
- **GitHub Flavored Markdown** (GFM) features

**Example markdown content:**
```markdown
# Main Heading

This is a **bold** statement with *italic* text.

## Code Example
```javascript
function hello() {
  console.log("Hello, World!");
}
```

### Lists
- Item 1
- Item 2
- Item 3

### Table
| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |
```

### Interactive Charts
The application automatically detects and renders charts when the AI includes chart data in its responses.

**Supported Chart Types:**
- **Line Charts**: For trends and time series data
- **Bar Charts**: For comparisons and categorical data
- **Doughnut Charts**: For proportions and percentages

**Chart Data Format**: The AI should return data in this format:
```json
{
  "type": "chart",
  "chartType": "line",
  "chartData": {
    "title": "Sales Performance",
    "labels": ["Jan", "Feb", "Mar", "Apr", "May"],
    "datasets": [{
      "label": "Sales",
      "data": [12, 19, 3, 5, 2],
      "borderColor": "rgb(75, 192, 192)",
      "backgroundColor": "rgba(75, 192, 192, 0.2)"
    }]
  }
}
```

### Navigation
- **Dashboard**: Overview page with quick actions and recent activity
- **Assistant**: Main chat interface for AI conversations

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── LeftMenu.js              # Navigation sidebar
│   ├── LeftMenu.css             # Sidebar styles
│   ├── Dashboard.js             # Dashboard component
│   ├── Dashboard.css            # Dashboard styles
│   ├── ChatInterface.js         # Main chat component
│   ├── ChatInterface.css        # Chat interface styles
│   ├── MessageList.js           # Message display component
│   ├── MessageList.css          # Message list styles
│   ├── MessageInput.js          # Input component
│   ├── MessageInput.css         # Input styles
│   ├── ChartMessage.js          # Chart rendering component
│   ├── ChartMessage.css         # Chart styles
│   ├── MarkdownRenderer.js      # Markdown rendering component
│   └── MarkdownRenderer.css     # Markdown styles
├── services/
│   └── apiService.js            # API integration service
├── utils/
│   └── chartUtils.js            # Chart data processing utilities
├── App.js                       # Main app component
├── App.css                      # Global styles
└── index.js                     # Application entry point
```

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## 🎨 Design System

### Color Scheme
- **Background**: `#1a1a1a` (dark gray/black)
- **Secondary Background**: `#2a2a2a` (lighter dark gray)
- **Accent Color**: `#4b5563` (dark grey)
- **Text**: `#e5e5e5` (light gray/white)
- **Borders**: `#404040` (medium gray)

### Typography
- **Font Family**: System fonts (San Francisco, Segoe UI, etc.)
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold)

### Components
- **Left Menu**: Fixed sidebar with navigation items
- **Message Bubbles**: User messages (dark grey), Assistant messages (dark background)
- **Charts**: Dark theme compatible with professional styling
- **Markdown**: Syntax highlighting and formatted content
- **Input Field**: Auto-resizing textarea with send button

## 🔧 Key Features Explained

### Streaming Responses
- Uses Server-Sent Events (SSE) for real-time communication
- Shows typing indicators and streaming cursor
- Automatically scrolls to new messages

### Markdown Rendering
- Full GitHub Flavored Markdown (GFM) support
- Syntax highlighting for code blocks
- Responsive tables and lists
- Dark theme compatible styling

### Auto-focus Input
- Automatically focuses the input field after AI responses
- Enables seamless conversation flow without clicking
- 100ms delay ensures UI stability

### Multi-line Input
- Auto-resizing textarea that grows with content
- Enter to send, Shift+Enter for new lines
- Maximum height with scrolling for very long messages

### Error Handling
- Comprehensive error logging to browser console
- User-friendly error messages in the UI
- Connection status indicators
- Graceful fallbacks for API failures

## 🌐 Browser Support

This application works in all modern browsers including:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📱 Responsive Design

- **Desktop**: Full sidebar with 250px width
- **Tablet**: Reduced sidebar to 200px width
- **Mobile**: Sidebar becomes horizontal at top
- **Charts**: Responsive and touch-friendly
- **Markdown**: Optimized for all screen sizes

## 🚨 Troubleshooting

### Common Issues

1. **Connection Error**: Ensure the API server is running on `localhost:5000`
2. **Charts Not Rendering**: Check that chart data follows the correct JSON format
3. **Markdown Not Rendering**: Ensure markdown content is properly formatted
4. **Styling Issues**: Clear browser cache and restart the development server

### Debug Mode
- Open browser Developer Tools (F12)
- Check the Console tab for detailed error logs
- Network tab shows API request/response details

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the browser console for errors
3. Ensure the API server is running and accessible
4. Verify all dependencies are installed correctly

# crm-agent




