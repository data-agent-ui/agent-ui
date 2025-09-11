# Streaming Agent API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
No authentication required for this implementation. In production, consider adding API keys or JWT tokens.

## Endpoints

### 1. Health Check
Check if the server is running and healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "OK",
  "message": "Streaming Agent is running"
}
```

**Example:**
```bash
curl http://localhost:5000/health
```

---

### 2. Streaming Chat
Send a message and receive a real-time streaming response.

**Endpoint:** `POST /api/chat/stream`

**Request Body:**
```json
{
  "message": "Your message here"
}
```

**Response:** Server-Sent Events (SSE) stream

**Event Types:**
- `chunk`: Partial response content
- `complete`: Full response completed
- `error`: Error occurred

**Example Events:**
```
data: {"type": "chunk", "content": "Hello"}

data: {"type": "chunk", "content": " there!"}

data: {"type": "complete", "content": "Hello there!"}

```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me a joke"}'
```

**JavaScript Example:**
```javascript
const eventSource = new EventSource('/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Hello!' })
});

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'chunk':
      console.log('Chunk:', data.content);
      break;
    case 'complete':
      console.log('Complete:', data.content);
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.error);
      eventSource.close();
      break;
  }
};
```

---

### 3. Non-Streaming Chat
Send a message and receive a complete response.

**Endpoint:** `POST /api/chat`

**Request Body:**
```json
{
  "message": "Your message here"
}
```

**Response:**
```json
{
  "response": "Complete response from the agent"
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?"}'
```

**Response:**
```json
{
  "response": "2 + 2 equals 4."
}
```

---

### 4. Get Conversation History
Retrieve the current conversation history.

**Endpoint:** `GET /api/history`

**Response:**
```json
{
  "history": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    },
    {
      "role": "assistant", 
      "content": "Hello! I'm doing well, thank you for asking."
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:5000/api/history
```

---

### 5. Clear Conversation History
Clear the current conversation history.

**Endpoint:** `POST /api/clear`

**Response:**
```json
{
  "message": "Conversation history cleared"
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/clear
```

---

## Error Responses

All endpoints may return error responses in the following format:

**HTTP Status:** `400 Bad Request` or `500 Internal Server Error`

**Response:**
```json
{
  "error": "Error message description"
}
```

**Common Error Scenarios:**
- Missing `message` field in request body
- Invalid JSON in request body
- OpenAI API errors (rate limits, invalid API key, etc.)
- Server internal errors

---

## Rate Limits

Currently no rate limiting is implemented. Consider adding rate limiting in production to prevent abuse.

## CORS

CORS is enabled for all origins (`*`). In production, configure specific allowed origins.

## WebSocket Alternative

For real-time bidirectional communication, consider implementing WebSocket support:

```javascript
// Future WebSocket implementation example
const ws = new WebSocket('ws://localhost:5000/ws');
ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  // Handle streaming response
};
```

## Testing

Use the included test script to verify functionality:

```bash
node test-agent.js
```

## Environment Variables

Required environment variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
PORT=5000
```

## Response Times

- **Streaming responses:** Start streaming immediately, complete in 2-10 seconds depending on response length
- **Non-streaming responses:** 1-5 seconds for complete response
- **History/clear endpoints:** < 100ms

## Best Practices

1. **Use streaming for long responses** to improve user experience
2. **Handle errors gracefully** in your client implementation
3. **Close EventSource connections** when done to prevent memory leaks
4. **Implement retry logic** for network failures
5. **Monitor conversation history** to avoid context length limits
