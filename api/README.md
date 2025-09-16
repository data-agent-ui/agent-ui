# CRM API - Two-Tier Query System

A FastAPI-based CRM system with intelligent two-tier query processing:
1. **Tier 1**: Hardcoded queries for instant responses
2. **Tier 2**: AI-generated SQL queries based on schema understanding

## 🚀 Features

- **Two-Tier System**: Hardcoded queries first, then AI-generated SQL
- **Intelligent Routing**: Automatically chooses the best approach
- **Database Integration**: Connects to SQL Server database for real-time data access
- **Schema Understanding**: AI understands the three core tables (pos_haud, pos_daud, pos_taud)
- **Payment Type Focus**: Specialized for payment type reporting and analysis
- **Greeting Support**: Handles small talk and greetings naturally
- **Table Data Support**: Returns structured data for frontend consumption
- **CORS Support**: Configured for React frontend integration
- **Single Endpoint**: Only `/query` endpoint for simplicity

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
.\sqlqa_env\Scripts\Activate.ps1
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
Create a `.env` file in the `api` directory:
```env
# OpenAI API Key (Required)
OPENAI_API_KEY=your_openai_api_key

# SQL Server Database Connection (Required)
DB_SERVER=localhost
DB_NAME=MumsAndBabies4SUTD
DB_USER=your_username
DB_PASSWORD=your_password

# SQL Driver Configuration (Optional)
DB_DRIVER=ODBC+Driver+18+for+SQL+Server
DB_CONNECTION_TIMEOUT=30
DB_COMMAND_TIMEOUT=60
DB_TRUST_SERVER_CERTIFICATE=yes
DB_MAX_STRING_LENGTH=1000
```

### SQL Driver Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_DRIVER` | `ODBC+Driver+18+for+SQL+Server` | SQL Server ODBC driver name |
| `DB_CONNECTION_TIMEOUT` | `30` | Connection timeout in seconds |
| `DB_COMMAND_TIMEOUT` | `60` | Command timeout in seconds |
| `DB_TRUST_SERVER_CERTIFICATE` | `yes` | Trust server certificate (yes/no) |
| `DB_MAX_STRING_LENGTH` | `1000` | Maximum string length for results |

**Common Driver Options:**
- `ODBC+Driver+18+for+SQL+Server` (Recommended)
- `ODBC+Driver+17+for+SQL+Server`
- `SQL+Server+Native+Client+11.0`

## 🚀 Usage

### Start the API Server
```bash
cd api
python main.py
```

The API will be available at `http://localhost:5000`

## 📡 API Endpoints

### Main Query Endpoint
```
POST /query
{
  "query": "show me VISA payments",
  "include_table": true
}
```

## 🎯 Two-Tier Query System

### **Tier 1: Hardcoded Queries (Instant)**
For predefined queries, the system returns instant responses:

#### Collection Reports
- `show me comprehensive collection report`
- `generate payment summary report`

#### Performance Reports
- `show me outlet performance report`
- `generate customer analysis report`

#### Product Analysis
- `what are the top selling products?`

#### Master Data
- `show me all customers`
- `list all employees`
- `show me product categories`
- `list all outlets`
- `show me payment types`
- `list transaction statuses`

#### Period-Based Transactions
- `show me transactions from last month`
- `show me transactions from last quarter`
- `show me transactions from last year`
- `show me transactions from last 15 days`
- `show me recent transactions`

### **Tier 2: AI-Generated Queries (Smart)**
For new queries, the AI generates SQL based on schema understanding:

#### Payment Analysis
- `show me VISA payments`
- `what are the MasterCard transactions?`
- `show me Cash payments only`
- `list Credit Card payments`

#### Product Analysis
- `what are the top products by sales?`
- `show me products with highest quantities sold`
- `list best performing items`

#### Transaction Analysis
- `show me recent transactions`
- `list transactions from last month`
- `show me customer balances`
- `what about outstanding amounts?`

#### Combined Analysis
- `show me VISA payments with product details`
- `list customers with outstanding balances`
- `show me staff who made the most sales`

## 🗄️ Database Schema Understanding

The AI understands three core tables:

### **pos_haud** → Transaction Header (Invoice Header)
- **Purpose**: One row per invoice/receipt
- **Key Fields**: `sa_transacno`, `sa_custno`, `sa_custname`, `sa_date`, `sa_TransacAmt`, `Total_Outstanding`

### **pos_daud** → Transaction Details (Line Items)
- **Purpose**: Line items per transaction (invoice lines/cart items)
- **Key Fields**: `sa_transacno`, `dt_itemdesc`, `dt_qty`, `dt_price`, `dt_amt`, `dt_StaffName`

### **pos_taud** → Transaction Payments
- **Purpose**: Payment details per transaction (payment ledger)
- **Key Fields**: `sa_transacno`, `pay_Desc`, `pay_actamt`, `pay_type`, `ItemSite_Code`

### **Table Relationships**
```
pos_haud.sa_transacno = pos_daud.sa_transacno = pos_taud.sa_transacno
```

## 🔧 Query Processing Flow

1. **Greeting Detection**: Checks if the query is a greeting or small talk
2. **Tier 1 Check**: Uses LLM to intelligently match user queries with hardcoded queries
3. **Fallback Matching**: If LLM unavailable, uses keyword matching only for period-based queries
4. **Tier 2 Fallback**: If no hardcoded query match found, uses AI to generate SQL
5. **Schema Analysis**: AI analyzes the three core tables
6. **SQL Generation**: Creates appropriate SQL based on query intent
7. **Database Execution**: Executes the generated SQL
8. **Result Validation**: AI validates if results match user intent
9. **Response Formatting**: Returns structured JSON response with debugging info

## 📝 Response Format

```json
{
  "success": true,
  "query": "show me VISA payments",
  "result": "Based on your query, here are the VISA payment transactions:\n\nTotal VISA Payments: 45\nTotal Amount: $12,450.00\nAverage Payment: $276.67\n\nKey Insights:\n- VISA is the most popular payment method\n- Peak usage during business hours\n- Average transaction value is $276.67",
  "table": {
    "columns": ["Transaction_ID", "Customer_Name", "Amount", "Date", "Outlet"],
    "rows": [
      {
        "Transaction_ID": "TXN001",
        "Customer_Name": "John Smith",
        "Amount": 150.00,
        "Date": "2024-01-15",
        "Outlet": "MB01"
      }
    ],
    "title": "VISA Payment Transactions"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🧪 Testing

### **Two-Tier System Testing**
```bash
cd api
python test_two_tier_system.py
```

### **Period-Based Queries Testing**
```bash
cd api
python test_period_queries.py
```

### **LLM Query Matching Testing**
```bash
cd api
python test_llm_query_matching.py
```

## 🎯 Key Benefits

1. **✅ Instant Responses**: Hardcoded queries provide immediate results
2. **✅ Flexible**: AI handles any new query type
3. **✅ Intelligent**: Understands payment types, products, and transactions
4. **✅ Accurate**: Proper table relationships and field mappings
5. **✅ Fast**: Optimized for both speed and flexibility
6. **✅ Schema-Aware**: AI understands the three core tables

## 🏗️ Architecture

```
User Query → Greeting Check → Hardcoded Query Lookup → Database → Response
     ↓
AI Query Analysis → Schema Understanding → SQL Generation → Database → Response
```

The system intelligently routes between hardcoded queries for instant responses and AI-generated queries for flexible data exploration.

## 📁 Project Structure

```
api/
├── main.py                      # Main FastAPI application
├── hardcoded_queries.py         # Predefined SQL queries with LLM matching (Tier 1)
├── src/
│   └── smart_query_agent.py     # AI query agent with validation (Tier 2)
├── test_two_tier_system.py      # Test script for two-tier system
├── test_period_queries.py       # Test script for period-based queries
├── test_llm_query_matching.py   # Test script for LLM query matching
├── requirements.txt             # Python dependencies
├── .env                         # Environment configuration
└── README.md                    # This file
```

## 🔒 Security

- Database credentials stored in environment variables
- OpenAI API key secured in environment
- CORS configured for specific origins
- Input validation through Pydantic models
- SQL injection protection through parameterized queries

## 🚀 Deployment

The API can be deployed using:
- **Local Development**: `python main.py`
- **Production**: Use a WSGI server like Gunicorn with Uvicorn workers
- **Docker**: Containerize the application for easy deployment
- **Cloud**: Deploy to AWS, Azure, or Google Cloud Platform

## 📞 Support

For issues or questions, please check the test script and ensure all dependencies are properly installed.