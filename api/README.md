# AI-Powered CRM Query System

A FastAPI-based CRM system that provides intelligent database querying capabilities using OpenAI's GPT-4o model. The system supports both hardcoded queries for instant responses and AI-generated queries for flexible data exploration.

## 🚀 Features

- **Dual Query System**: Fast hardcoded queries + AI-powered dynamic queries
- **SQL Server Integration**: Direct connection to MumsAndBabies4SUTD database
- **Structured JSON Responses**: Consistent API response format
- **Performance Monitoring**: Built-in response time tracking
- **Smart Query Detection**: Automatic routing between hardcoded and AI queries

## 📋 Requirements

### System Requirements
- Python 3.8+
- SQL Server with ODBC Driver 18
- OpenAI API Key

### Python Dependencies
```
langchain
langchain-community
langchain-openai
openai
sqlalchemy
pandas
python-dotenv
pyodbc
fastapi
uvicorn
python-multipart
```

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AI-CRM
```

### 2. Create Virtual Environment
```bash
python -m venv sqlqa_env
```

### 3. Activate Virtual Environment

**Windows:**
```bash
sqlqa_env\Scripts\activate
```

**Linux/Mac:**
```bash
source sqlqa_env/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Environment Configuration
Create a `.env` file in the project root:
```bash
cp env_template.txt .env
```

Edit `.env` with your configuration:
```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DB_SERVER=your_sql_server_name
DB_NAME=MumsAndBabies4SUTD
DB_USER=your_username
DB_PASSWORD=your_password

# For Windows Authentication (leave DB_USER and DB_PASSWORD empty)
# DB_SERVER=DESKTOP-L7BVFJN
# DB_NAME=MumsAndBabies4SUTD
# DB_USER=
# DB_PASSWORD=
```

## 🚀 Running the API

### Start the Server
```bash
python main.py
```

The API will start on:
- **URL**: http://localhost:5000
- **Documentation**: http://localhost:5000/docs
- **Alternative docs**: http://localhost:5000/redoc

### API Endpoints

#### POST `/query`
Process natural language queries and generate reports.

**Request Body:**
```json
{
  "query": "show me outlet performance",
  "include_table": true
}
```

**Response Format:**
```json
{
  "success": true,
  "query": "show me outlet performance",
  "result": "Report completed successfully\n\nTotal Records: 2\nColumns: Outlet, Total_Transactions...",
  "table": {
    "columns": ["Outlet", "Total_Transactions", "Total_Revenue", ...],
    "rows": [
      {
        "Outlet": "MB01",
        "Total_Transactions": 14757,
        "Total_Revenue": 2683019.05,
        ...
      }
    ],
    "title": "Outlet Performance Summary"
  },
  "timestamp": "2025-09-15T15:30:00.000000"
}
```

## 📊 Available Hardcoded Queries

The system includes pre-optimized queries for instant responses:

### Customer Queries
- `"show me customer analysis"`
- `"list all customers with their total outstanding amounts"`

### Payment & Collection Reports
- `"generate a comprehensive collection report by payment type"`
- `"payment summary report"`
- `"generates a payment summary report grouped by outlet and payment type"`

### Business Reports
- `"show me outlet performance"`
- `"show me employee performance"`
- `"show me product sales analysis"`

### Invoice Reports
- `"list all invoices their total amount and how much has been paid by payment type"`

### Database Information
- `"show me database structure"`

## 🤖 AI Query Examples

For queries not in the hardcoded list, the AI agent generates SQL dynamically:

- `"What are the top 5 customers by total spending?"`
- `"Show me sales trends for the last 3 months"`
- `"Which products have the highest profit margins?"`
- `"Find customers who haven't made a purchase in 6 months"`
- `"Compare outlet performance by region"`

## ⚡ Performance

### Hardcoded Queries
- **Response Time**: 0.1-0.5 seconds
- **Process**: Direct SQL execution
- **Use Case**: Common business reports

### AI Queries
- **Response Time**: 5-10 seconds
- **Process**: LLM + SQL generation + execution
- **Use Case**: Custom analysis and exploration

## 🏗️ Project Structure

```
AI-CRM/
├── main.py                 # FastAPI server and main endpoint
├── src/
│   └── langchain_chain.py  # AI agent and database connection
├── hardcoded_queries.py    # Pre-defined SQL queries
├── requirements.txt        # Python dependencies
├── env_template.txt       # Environment variables template
├── README.md              # This file
└── sqlqa_env/            # Virtual environment
```

## 🔧 Configuration

### Database Connection
The system supports both SQL Server authentication methods:
- **Username/Password**: Set `DB_USER` and `DB_PASSWORD`
- **Windows Authentication**: Leave `DB_USER` and `DB_PASSWORD` empty

### Query Routing
The system automatically determines whether to use:
1. **Hardcoded queries** for exact matches and common patterns
2. **AI agent** for complex or custom queries

## 📝 Usage Examples

### Using curl
```bash
curl -X POST "http://localhost:5000/query" \
     -H "Content-Type: application/json" \
     -d '{"query": "show me outlet performance"}'
```

### Using Python requests
```python
import requests

response = requests.post(
    "http://localhost:5000/query",
    json={"query": "show me outlet performance", "include_table": True}
)
data = response.json()
print(data["table"]["rows"])
```

### Using the Interactive Docs
1. Navigate to http://localhost:5000/docs
2. Click on the `/query` endpoint
3. Click "Try it out"
4. Enter your query in the request body
5. Click "Execute"

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Error**
- Verify SQL Server is running
- Check ODBC Driver 18 installation
- Validate connection credentials in `.env`

**2. OpenAI API Error**
- Verify API key is correct and has credits
- Check internet connectivity

**3. Slow Response Times**
- Hardcoded queries should be fast (< 1 second)
- AI queries take longer (5-10 seconds) due to LLM processing

**4. Empty Results**
- Check database has data in relevant tables
- Verify query syntax matches database schema

### Debug Information
The API provides detailed console output:
- Query type detection (Hardcoded vs AI)
- Response time measurements
- Database execution details
- Error messages and stack traces

## 📈 Monitoring

The system logs performance metrics:
```
⚡ HARDCODED QUERY: show me outlet performance
Database execution time: 0.23 seconds
TOTAL RESPONSE TIME: 0.28 seconds
```

## 🔒 Security

- API keys stored in environment variables
- Database credentials in `.env` file (not committed to version control)
- SQL injection protection through parameterized queries
- Input validation through Pydantic models

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add new hardcoded queries to `hardcoded_queries.py`
4. Test your changes
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review console debug output
3. Create an issue in the repository