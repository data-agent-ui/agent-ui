#!/usr/bin/env python3
"""
CRM API - One Endpoint
POST /query - Ask questions and get reports
"""

import os
import sys
import warnings
from datetime import datetime
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Suppress warnings for faster startup
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*sysname.*")
warnings.filterwarnings("ignore", message=".*reflect.*")

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    from typing import List, Dict, Any, Optional
    import uvicorn
    import re
    
    # Add src to path
    sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
    
    from hardcoded_queries import get_hardcoded_query
    from src.smart_query_agent import SmartQueryAgent
    
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please check your dependencies and virtual environment")
    sys.exit(1)

# Global database and agent
db = None
smart_query_agent = None

def get_database_connection():
    """Get lightweight database connection for hardcoded queries"""
    global db
    if not db:
        try:
            from langchain_community.utilities import SQLDatabase
            
            # Get database connection details
            server = os.getenv("DB_SERVER", "localhost")
            database = os.getenv("DB_NAME", "MumsAndBabies4SUTD")
            username = os.getenv("DB_USER", "")
            password = os.getenv("DB_PASSWORD", "")
            
            # Get SQL driver configuration from environment
            driver = os.getenv("DB_DRIVER", "ODBC+Driver+18+for+SQL+Server")
            connection_timeout = os.getenv("DB_CONNECTION_TIMEOUT", "30")
            command_timeout = os.getenv("DB_COMMAND_TIMEOUT", "60")
            trust_cert = os.getenv("DB_TRUST_SERVER_CERTIFICATE", "yes")
            
            # Build connection string with configurable parameters
            if username and password:
                database_uri = f"mssql+pyodbc://{username}:{password}@{server}/{database}?driver={driver}&Connection+Timeout={connection_timeout}&Command+Timeout={command_timeout}&TrustServerCertificate={trust_cert}"
            else:
                database_uri = f"mssql+pyodbc://@{server}/{database}?driver={driver}&trusted_connection=yes&Connection+Timeout={connection_timeout}&Command+Timeout={command_timeout}&TrustServerCertificate={trust_cert}"
            
            # Get max string length from environment
            max_string_length = int(os.getenv("DB_MAX_STRING_LENGTH", "1000"))
            
            # Create lightweight database connection
            db = SQLDatabase.from_uri(
                database_uri, 
                include_tables=[],  # Don't auto-reflect tables
                sample_rows_in_table_info=0,  # Don't sample data
                max_string_length=max_string_length
            )
            db._dialect = "mssql"
            print("Database connection established for hardcoded queries")
            
        except Exception as e:
            print(f"Database connection error: {e}")
            return None
    
    return db

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the CRM agent on startup"""
    global agent, db
    try:
        print("Starting API...")
        # Initialize connections lazily
        agent = None
        db = None
        print("API ready!")
    except Exception as e:
        print(f"Error: {e}")
        agent = None
        db = None
    
    yield  # App is running
    
    # Cleanup on shutdown
    print("API shutting down...")

# Initialize FastAPI app with lifespan
app = FastAPI(title="CRM API", version="1.0.0", lifespan=lifespan)

# Add CORS middleware to allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Query(BaseModel):
    query: str
    include_table: Optional[bool] = False

class TableData(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    title: Optional[str] = None

class Response(BaseModel):
    success: bool
    query: str
    result: str
    table: Optional[TableData] = None
    timestamp: str

def convert_db_results_to_table(result_text: str, query: str) -> Optional[TableData]:
    """Convert database results to structured table using pandas"""
    try:
        # Extract the results section from the result text
        if "Results:" not in result_text:
            return None
            
        results_section = result_text.split("Results:")[1].strip()
        
        # Parse the results - they come as a list of tuples
        if results_section.startswith('[') and results_section.endswith(']'):
            # Remove the outer brackets and parse
            results_section = results_section[1:-1]
            
            # Split by tuples - look for patterns like ('value1', 'value2', ...)
            import ast
            try:
                # Parse the string as a Python literal (list of tuples)
                parsed_results = ast.literal_eval(f"[{results_section}]")
                
                if not parsed_results or len(parsed_results) == 0:
                    return None
                
                # Get column names from the SQL query
                sql_section = result_text.split("Results:")[0]
                columns = extract_column_names_from_sql(sql_section)
                
                # If column count doesn't match, use fallback headers
                if not columns or len(columns) != len(parsed_results[0]):
                    columns = [f"Column_{i+1}" for i in range(len(parsed_results[0]))]
                
                # Format numeric columns (without pandas)
                formatted_results = []
                for row in parsed_results:
                    formatted_row = []
                    for i, value in enumerate(row):
                        if i < len(columns):
                            # Try to format numeric values with decimal formatting
                            try:
                                if isinstance(value, (int, float)):
                                    formatted_row.append(format_decimal_value(value))
                                elif isinstance(value, str) and value.replace('.', '').replace('-', '').isdigit():
                                    formatted_row.append(format_decimal_value(float(value)))
                                else:
                                    formatted_row.append(value)
                            except:
                                formatted_row.append(value)
                        else:
                            formatted_row.append(value)
                    formatted_results.append(formatted_row)
                
                # Filter out zero-value columns
                filtered_results, filtered_columns = filter_zero_columns(formatted_results, columns)
                
                # Convert to table format - ensure all values are strings
                headers = filtered_columns
                rows = []
                for row in filtered_results:
                    # Convert all values to strings for Pydantic compatibility
                    string_row = [str(value) for value in row]
                    rows.append(string_row)
                
                # Determine table title
                title = determine_table_title(query)
                
                # Convert rows to list of dictionaries
                dict_rows = []
                for row in rows:
                    row_dict = {}
                    for i, value in enumerate(row):
                        if i < len(headers):
                            row_dict[headers[i]] = value
                    dict_rows.append(row_dict)
                
                return TableData(
                    columns=headers,
                    rows=dict_rows,
                    title=title
                )
                
            except Exception as e:
                print(f"Error parsing results: {e}")
                return None
                
    except Exception as e:
        print(f"Error converting to table: {e}")
        return None
    
    return None

def extract_column_names_from_sql(sql_text: str) -> List[str]:
    """Extract column names from SQL SELECT statement"""
    try:
        # Find all SELECT statements
        select_matches = list(re.finditer(r'SELECT\s+(.*?)\s+FROM', sql_text, re.IGNORECASE | re.DOTALL))
        
        if select_matches:
            # Use the last SELECT statement (main query after CTEs)
            main_select = select_matches[-1]
            select_clause = main_select.group(1)
            
            # Split by commas and extract column names
            columns = []
            for col in select_clause.split(','):
                col = col.strip()
                
                # Handle multi-line columns
                col = col.replace('\n', ' ').strip()
                
                # Remove TOP clause if present
                col = re.sub(r'TOP\s+\d+', '', col, flags=re.IGNORECASE).strip()
                
                # Remove AS aliases
                if ' AS ' in col.upper():
                    col = col.split(' AS ')[1].strip()
                # Remove table prefixes
                elif '.' in col and ' AS ' not in col.upper():
                    col = col.split('.')[-1].strip()
                
                # Clean up any remaining SQL keywords
                col = re.sub(r'\s+', ' ', col)  # Remove extra whitespace
                col = col.strip()
                
                # Only add if it's a valid column name
                if col and not col.upper() in ['SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'BY', 'TOP']:
                    columns.append(col)
            
            print(f"Extracted columns: {columns}")
            return columns
    except Exception as e:
        print(f"Error extracting column names: {e}")
    
    return []

def determine_table_title(query: str) -> str:
    """Determine appropriate table title based on query"""
    query_lower = query.lower()
    
    if "payment summary" in query_lower and "outlet" in query_lower:
        return "Payment Summary by Outlet and Payment Type"
    elif "collection" in query_lower and "payment" in query_lower:
        return "Collection Report by Payment Type"
    elif "customer" in query_lower and "outstanding" in query_lower:
        return "Customer Outstanding Amounts"
    elif "invoice" in query_lower and "payment" in query_lower:
        return "Invoice Payment Analysis"
    elif "employee" in query_lower or "staff" in query_lower:
        return "Employee Performance Report"
    elif "product" in query_lower and "sales" in query_lower:
        return "Product Sales Analysis"
    elif "outlet" in query_lower and "performance" in query_lower:
        return "Outlet Performance Summary"
    elif "transactions from last month" in query_lower or "monthly" in query_lower:
        return "Transactions from Last Month"
    elif "transactions from last quarter" in query_lower or "quarterly" in query_lower:
        return "Transactions from Last Quarter"
    elif "transactions from last year" in query_lower or "yearly" in query_lower:
        return "Transactions from Last Year"
    elif "transactions from last 15 days" in query_lower or "recent" in query_lower:
        return "Recent Transactions (Last 15 Days)"
    elif "report" in query_lower:
        return "Business Report"
    else:
        return "Query Results"

def extract_table_data(result_text: str, query: str) -> Optional[TableData]:
    """Extract table data from the result text"""
    try:
        lines = result_text.split('\n')
        table_lines = []
        in_table = False
        
        for line in lines:
            line = line.strip()
            # Look for table patterns (more flexible detection)
            if '|' in line and len(line.split('|')) >= 2:
                if not in_table:
                    # Check if this looks like a header row - expanded keywords for retail/POS data
                    header_keywords = ['id', 'name', 'customer', 'order', 'product', 'amount', 'date', 'status', 'email', 'phone', 
                                     'outlet', 'payment', 'type', 'transaction', 'sale', 'balance', 'tax', 'receivable', 'gst']
                    if any(keyword in line.lower() for keyword in header_keywords):
                        in_table = True
                        table_lines.append(line)
                elif in_table:
                    table_lines.append(line)
            elif in_table and line == '':
                # Empty line might end the table
                if len(table_lines) >= 2:
                    break
            elif in_table and not line:
                break
        
        if len(table_lines) >= 2:
            # Extract headers (first line)
            headers = [h.strip() for h in table_lines[0].split('|') if h.strip()]
            
            # Extract rows
            rows = []
            for line in table_lines[1:]:
                if line.strip():
                    row = [cell.strip() for cell in line.split('|') if cell.strip()]
                    if len(row) == len(headers):
                        rows.append(row)
            
            if headers and rows:
                # Determine table title based on query - expanded for retail/POS reports
                title = "Query Results"
                query_lower = query.lower()
                if "collection" in query_lower and "payment" in query_lower:
                    title = "Collection by Payment Type Report"
                elif "payment" in query_lower:
                    title = "Payment Analysis"
                elif "outlet" in query_lower:
                    title = "Outlet Performance"
                elif "customer" in query_lower:
                    title = "Customer Data"
                elif "order" in query_lower:
                    title = "Order Data"
                elif "product" in query_lower:
                    title = "Product Data"
                elif "report" in query_lower:
                    title = "Business Report"
                elif "transaction" in query_lower:
                    title = "Transaction Data"
                
                # Convert rows to list of dictionaries
                dict_rows = []
                for row in rows:
                    row_dict = {}
                    for i, value in enumerate(row):
                        if i < len(headers):
                            row_dict[headers[i]] = value
                    dict_rows.append(row_dict)
                
                return TableData(
                    columns=headers,
                    rows=dict_rows,
                    title=title
                )
    except:
        pass
    
    return None

def should_include_table(query: str) -> bool:
    """Determine if table should be included based on query type"""
    query_lower = query.lower()
    table_keywords = [
        "show me", "list", "top", "best", "report", "analysis", 
        "customers", "orders", "products", "employees", "sales",
        "collection", "payment", "outlet", "transaction", "pos"
    ]
    return any(keyword in query_lower for keyword in table_keywords)

def is_greeting_or_small_talk(query: str) -> bool:
    """Check if the query is a greeting or small talk"""
    query_lower = query.lower().strip()
    
    # Greeting patterns
    greetings = [
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
        "how are you", "how's it going", "what's up", "greetings", "salutations"
    ]
    
    # Small talk patterns
    small_talk = [
        "thank you", "thanks", "bye", "goodbye", "see you", "have a good day",
        "nice to meet you", "pleasure", "you're welcome", "no problem",
        "how can you help", "what can you do", "what are your capabilities",
        "who are you", "what is this", "help me", "i need help"
    ]
    
    # Check for exact matches or partial matches
    for pattern in greetings + small_talk:
        if pattern in query_lower:
            return True
    
    # Check for very short queries (likely greetings)
    if len(query_lower.split()) <= 3 and any(word in query_lower for word in ["hello", "hi", "hey", "thanks", "bye"]):
        return True
    
    return False

def get_greeting_response(query: str) -> str:
    """Generate appropriate response for greetings and small talk"""
    query_lower = query.lower().strip()
    
    # Time-based greetings
    from datetime import datetime
    current_hour = datetime.now().hour
    
    # Good morning responses (5 AM - 12 PM)
    if "good morning" in query_lower or ("morning" in query_lower and "good" in query_lower):
        responses = [
            "Good morning. I'm your AI CRM assistant for MumsAndBabies4SUTD. I can help you analyze your business data and generate reports.",
            "Morning. I'm here to assist with your business performance analysis. I can help you with sales reports, customer analysis, and more.",
            "Good morning. I'm your CRM data analysis assistant. How can I help you today?"
        ]
        return responses[hash(query) % len(responses)]
    
    # Good afternoon responses (12 PM - 5 PM)
    elif "good afternoon" in query_lower or ("afternoon" in query_lower and "good" in query_lower):
        responses = [
            "Good afternoon. I'm your AI CRM assistant. I can help you with business insights and data analysis.",
            "Afternoon. I can assist you with sales analysis, customer reports, and performance metrics.",
            "Good afternoon. I'm here to help you analyze your MumsAndBabies4SUTD data. What can I help you with?"
        ]
        return responses[hash(query) % len(responses)]
    
    # Good evening responses (5 PM - 10 PM)
    elif "good evening" in query_lower or ("evening" in query_lower and "good" in query_lower):
        responses = [
            "Good evening. I'm your AI CRM assistant, ready to help you with business insights and data analysis.",
            "Evening. I can help you review your day's performance with sales summaries and customer analysis.",
            "Good evening. I'm here to help you with your CRM data analysis. How can I assist you?"
        ]
        return responses[hash(query) % len(responses)]
    
    # How are you responses
    elif "how are you" in query_lower or "how's it going" in query_lower or "what's up" in query_lower:
        responses = [
            "I'm functioning well, thank you. I'm ready to help you analyze your business data. How can I assist you today?",
            "I'm operating normally. I'm here to help with CRM analysis and can assist you with sales reports and customer insights.",
            "I'm working properly. I can help you analyze your business data and provide insights. What would you like to explore?",
            "I'm functioning correctly. I can help you understand your CRM system data. What would you like to know?"
        ]
        return responses[hash(query) % len(responses)]
    
    # Simple hello/hi responses
    elif any(word in query_lower for word in ["hello", "hi", "hey"]):
        responses = [
            "Hello. I'm your AI CRM assistant for MumsAndBabies4SUTD. I can help you with business data analysis and reports.",
            "Hi. I specialize in analyzing retail data and generating business reports. What would you like to explore?",
            "Hello. I'm your business intelligence assistant. I can help you with customer analysis, sales reports, and performance metrics.",
            "Hi there. I'm here to help you analyze your business data. I can assist with sales, customers, and performance analysis.",
            "Hello. I'm your AI CRM assistant, ready to help you with data analysis from your MumsAndBabies4SUTD system."
        ]
        return responses[hash(query) % len(responses)]

    # Help requests
    elif any(word in query_lower for word in ["help", "what can you do", "capabilities", "who are you"]):
        help_responses = [
            """I'm your AI CRM Assistant.

My Capabilities:
- Business Reports: Generate comprehensive reports on sales, customers, and performance
- Data Analysis: Analyze trends, patterns, and insights from your retail data
- Quick Queries: Get instant answers to common business questions
- Custom Analysis: Create tailored reports based on your specific needs

Sample Questions:
- "Show me outlet performance"
- "List all customers with outstanding amounts"
- "Generate a payment summary report"


Ask me anything about your business data.""",
            
            """I'm your business intelligence assistant.

What I can do for you:
- Sales Analysis: Track performance, trends, and opportunities
- Customer Insights: Understand your customer base and behavior
- Performance Metrics: Monitor outlets, staff, and product performance
- Business Intelligence: Get actionable insights from your data

Try asking:
- "Show me today's sales performance"
- "Which customers have outstanding payments?"
- "What are our top performing outlets?"
- "Generate a comprehensive business report"

I'm here to help you analyze your data.""",
            
            """I'm your AI-powered CRM specialist.

My Expertise:
- Data Mining: Extract valuable insights from your retail database
- Report Generation: Create detailed business reports instantly
- Trend Analysis: Identify patterns and opportunities in your data
- Performance Tracking: Monitor sales, customers, and operations

Quick Start:
- "Show me outlet performance" - Get outlet analytics
- "Customer analysis" - Understand your customer base
- "Payment summary" - Review payment trends
- "Top products" - See what's selling best

Ready to explore your data."""
        ]
        return help_responses[hash(query) % len(help_responses)]

    # Thank you responses
    elif any(word in query_lower for word in ["thank", "thanks"]):
        thank_responses = [
            "You're welcome. I'm here whenever you need help with your CRM data analysis. Feel free to ask me about sales reports, customer insights, or performance metrics. Is there anything else I can help you with?",
            "My pleasure. I can help you make sense of your business data. Don't hesitate to reach out if you need more insights or reports. What else can I assist you with?",
            "You're welcome. I'm here to help with your business analytics. Feel free to ask me anything about your sales, customers, or performance data.",
            "Happy to help. I'm here to make your data analysis easier. If you need any more reports or insights, just let me know. What would you like to explore next?"
        ]
        return thank_responses[hash(query) % len(thank_responses)]

    # Goodbye responses
    elif any(word in query_lower for word in ["bye", "goodbye", "see you", "have a good day"]):
        goodbye_responses = [
            "Goodbye. Thanks for using the AI CRM Assistant. Come back anytime you need help with your business data analysis. Have a good day.",
            "See you later. It was good helping you today. I'm always here when you need business insights. Take care.",
            "Farewell. Thanks for letting me help with your CRM analysis. I'll be here whenever you need me. Have a good day.",
            "Goodbye for now. I enjoyed helping you with your business data. Come back anytime for more insights and reports."
        ]
        return goodbye_responses[hash(query) % len(goodbye_responses)]

    # Default response
    else:
        return """Hello.

I'm your AI CRM Assistant for MumsAndBabies4SUTD. I specialize in helping you analyze your business data and generate reports.

What I can do:
- Answer questions about your customers, sales, and performance
- Generate comprehensive business reports
- Provide insights and analytics
- Help with data analysis

Try asking:
- "Show me outlet performance"
- "Generate a customer analysis report"
- "What are the top selling products?"

How can I assist you today?"""

def process_template_query(sql_query: str, user_query: str) -> str:
    """Process template queries by replacing placeholders with actual values"""
    import re
    
    # Check if this is a template query with [PAYMENT_TYPE] placeholder
    if '[PAYMENT_TYPE]' in sql_query:
        # Extract payment type from user query
        payment_type = extract_payment_type_from_query(user_query)
        if payment_type:
            # Replace the placeholder with the actual payment type
            sql_query = sql_query.replace('[PAYMENT_TYPE]', payment_type)
            print(f"🔄 Template query modified: Payment type '{payment_type}' inserted")
        else:
            print("⚠️ Warning: Could not extract payment type from query, using default")
            sql_query = sql_query.replace('[PAYMENT_TYPE]', 'CASH')  # Default fallback
    
    return sql_query

def extract_payment_type_from_query(user_query: str) -> str:
    """Extract payment type from user query using pattern matching"""
    query_lower = user_query.lower().strip()
    
    # Comprehensive payment types based on actual database data
    payment_patterns = {
        # Major payment types
        'VISA': ['visa', 'vs', 'visa card', 'visa payment', 'visa transactions'],
        'MASTER': ['master', 'ms', 'mastercard', 'master card', 'mastercard payment', 'mastercard transactions'],
        'CASH': ['cash', 'cs', 'cash payment', 'cash transactions'],
        'AMEX': ['amex', 'ax', 'american express', 'amex payment', 'amex transactions'],
        'PAYPAL': ['paypal', 'paypal payment', 'paypal transactions'],
        
        # PayNow variants
        'PAYNOW NORMAL': ['paynow', 'payn', 'paynow normal', 'paynow payment'],
        'PAYNOW ASPIRE': ['paynow aspire', 'paynas', 'paynow aspire payment'],
        'PAYNOW OCBC': ['paynow ocbc', 'paynoc', 'ocbc paynow'],
        
        # Digital wallets and platforms
        'SHOPBACK': ['shopback', 'shpb', 'shopback payment'],
        'PREPAID': ['prepaid', 'pp', 'prepaid payment', 'prepaid card'],
        'ATOME': ['atome', 'atome payment'],
        'WECHAT': ['wechat', 'wechat pay', 'wechat payment'],
        'PAYLAH': ['paylah', 'payl', 'paylah payment'],
        'GRABPAY': ['grabpay', 'grab', 'grab pay', 'grab payment'],
        
        # Banking and transfers
        'BANK TRANSFER': ['bank transfer', 'bnkt', 'wire transfer', 'bank payment', 'transfer'],
        'NETS': ['nets', 'nt', 'nets payment'],
        'STRIPE': ['stripe', 'str', 'stripe payment'],
        
        # Vouchers and credits
        'VOUCHER': ['voucher', 'vc', 'voucher payment', 'gift voucher'],
        'CREDIT NOTE': ['credit note', 'cn', 'credit note payment'],
        
        # Special cases
        'OLD BILL': ['old bill', 'ob', 'old bill payment'],
        'SUPER NANNY': ['super nanny', 'sn', 'super nanny payment'],
        'CHILLI PADI': ['chilli padi', 'chilli', 'chilli padi payment'],
        'MUMMY MARKET': ['mummy market', 'mm', 'mummy market payment'],
        'LAZADA': ['lazada', 'lzd', 'lazada payment'],
        'JCB': ['jcb', 'jcb payment'],
        'LYC': ['lyc', 'lyc payment'],
        'GST ABSORBED': ['gst absorbed', 'gstab', 'gst absorbed payment']
    }
    
    # Find the best match
    for payment_type, patterns in payment_patterns.items():
        for pattern in patterns:
            if pattern in query_lower:
                print(f"🎯 Payment type matched: '{pattern}' → '{payment_type}'")
                return payment_type
    
    # If no specific match found, try to extract any capitalized word that might be a payment type
    words = user_query.split()
    for word in words:
        if word.isupper() and len(word) > 2:
            print(f"🎯 Payment type extracted from uppercase: '{word}'")
            return word
    
    print(f"⚠️ No payment type found in query: '{user_query}'")
    return None

def format_decimal_value(value):
    """Format decimal values to 2 decimal places"""
    if isinstance(value, float):
        return round(value, 2)
    elif isinstance(value, int):
        return value
    else:
        return value

def filter_zero_columns(rows, columns):
    """Filter out columns that contain ONLY zero values (all rows must be zero)"""
    if not rows or not columns:
        return rows, columns
    
    # Check which columns have ALL zero values
    zero_columns = set()
    
    for col_idx, column in enumerate(columns):
        all_zero = True
        non_zero_count = 0
        total_count = 0
        
        for row in rows:
            if col_idx < len(row):
                value = row[column] if isinstance(row, dict) else row[col_idx]
                total_count += 1
                
                # Check if value is zero (numeric zero or string "0")
                if isinstance(value, (int, float)):
                    if value != 0:
                        all_zero = False
                        non_zero_count += 1
                elif isinstance(value, str):
                    try:
                        if float(value) != 0:
                            all_zero = False
                            non_zero_count += 1
                    except:
                        # Non-numeric string, keep the column
                        all_zero = False
                        non_zero_count += 1
                else:
                    # Non-numeric value, keep the column
                    all_zero = False
                    non_zero_count += 1
        
        # Only filter if ALL values are zero (no non-zero values found)
        if all_zero and total_count > 0:
            zero_columns.add(column)
            print(f"🚫 Column '{column}': All {total_count} values are zero - filtering out")
        elif non_zero_count > 0:
            print(f"✅ Column '{column}': {non_zero_count}/{total_count} non-zero values - keeping column")
    
    # Filter out zero columns
    if zero_columns:
        print(f"🚫 Filtering out columns with ALL zero values: {', '.join(zero_columns)}")
        
        # Filter columns list
        filtered_columns = [col for col in columns if col not in zero_columns]
        
        # Filter rows
        filtered_rows = []
        for row in rows:
            if isinstance(row, dict):
                # Dictionary row
                filtered_row = {k: v for k, v in row.items() if k not in zero_columns}
                filtered_rows.append(filtered_row)
            else:
                # List row
                filtered_row = []
                for i, value in enumerate(row):
                    if i < len(columns) and columns[i] not in zero_columns:
                        filtered_row.append(value)
                filtered_rows.append(filtered_row)
        
        return filtered_rows, filtered_columns
    else:
        print(f"✅ No columns with ALL zero values found - keeping all columns")
    
    return rows, columns

def fast_process_database_result(result, sql_query, query_text):
    """Fast processing of database results with minimal overhead and decimal formatting"""
    import time
    start_time = time.time()
    
    try:
        # Quick type check and direct processing
        if isinstance(result, list) and len(result) > 0:
            # Get column names from SQL
            columns = extract_column_names_from_sql(sql_query)
            
            # Fast column fallback for known queries
            if not columns:
                if "comprehensive collection report" in query_text.lower():
                    columns = ["pay_type", "pay_desc", "Num_Transactions", "Total_Collected", "Total_Tax", "Net_Receivables", "Avg_Transaction_Value"]
                elif "payment summary" in query_text.lower():
                    columns = ["Outlet", "Payment_Type", "Num_Payments", "Num_New_Sales", "Num_Bal_Payments", "New_Sales_Amt", "Bal_Paid_Amt", "Total_Amt", "Taxes", "Bank_Charges", "Receivables"]
                elif "outlet performance" in query_text.lower():
                    columns = ["Outlet", "Num_Transactions", "Total_Revenue", "Average_Transaction_Value", "Unique_Customers", "First_Transaction", "Latest_Transaction"]
                elif "customer analysis" in query_text.lower():
                    columns = ["Cust_No", "Cust_code", "Cust_name", "Cust_phone1", "Cust_email", "Outlet", "Cust_JoinDate", "oustanding_payment", "Outstanding_Amount", "Cust_Point", "Loyalty_Points", "Status"]
                elif any(word in query_text.lower() for word in ["transactions from last", "monthly", "quarterly", "yearly", "recent"]):
                    columns = ["sa_transacno", "sa_date", "sa_custname", "sa_totamt", "sa_totdisc", "sa_totgst", "sa_status", "Outlet"]
                else:
                    # Dynamic column generation based on first row
                    if len(result) > 0:
                        columns = [f"Column_{i+1}" for i in range(len(result[0]))]
                    else:
                        columns = ["No_Data"]
            
            # Fast row processing with decimal formatting
            rows = []
            for row_tuple in result:
                row_dict = {}
                for i, value in enumerate(row_tuple):
                    if i < len(columns):
                        # Format decimal values to 2 decimal places
                        formatted_value = format_decimal_value(value)
                        
                        # Fast datetime conversion
                        if hasattr(formatted_value, 'isoformat'):
                            row_dict[columns[i]] = formatted_value.isoformat()
                        else:
                            row_dict[columns[i]] = formatted_value
                rows.append(row_dict)
            
            # Filter out zero-value columns
            filtered_rows, filtered_columns = filter_zero_columns(rows, columns)
            
            # Generate result text
            result_text = f"Report completed successfully\n\n"
            result_text += f"SQL Query Used:\n{sql_query}\n\n"
            result_text += f"Total Records: {len(filtered_rows)}\n"
            result_text += f"Columns: {', '.join(filtered_columns)}"
            
            processing_time = time.time() - start_time
            print(f"⚡ Fast processing time: {processing_time:.3f} seconds")
            
            return {
                'success': True,
                'result_text': result_text,
                'parsed_results': filtered_rows,
                'columns': filtered_columns,
                'include_table': True
            }
        
        else:
            # Handle empty or non-list results
            result_text = f"Report completed - No data found\n\nSQL Query Used:\n{sql_query}\n\n"
            return {
                'success': True,
                'result_text': result_text,
                'parsed_results': [],
                'columns': [],
                'include_table': False
            }
            
    except Exception as e:
        processing_time = time.time() - start_time
        print(f"❌ Fast processing error after {processing_time:.3f}s: {e}")
        result_text = f"Error processing results: {str(e)}\n\nSQL Query Used:\n{sql_query}"
        return {
            'success': False,
            'result_text': result_text,
            'parsed_results': None,
            'columns': None,
            'include_table': False
        }


@app.post("/query", response_model=Response)
async def process_query(query: Query):
    """Process questions and generate reports"""
    global agent
    import time
    
    # Start timing the entire request
    request_start_time = time.time()
    
    # Initialize variables
    df = None
    hardcoded_sql = None
    parsed_results = None
    columns = None
    
    try:
        # Check for greetings and small talk first
        if is_greeting_or_small_talk(query.query):
            return Response(
                success=True,
                query=query.query,
                result=get_greeting_response(query.query),
                timestamp=datetime.now().isoformat()
            )
        
        # Check for hardcoded queries
        hardcoded_sql = get_hardcoded_query(query.query)
        
        if hardcoded_sql:
            # Check if this is a template query that needs modification
            hardcoded_sql = process_template_query(hardcoded_sql, query.query)
            # Use hardcoded SQL query for instant response
            query_start_time = time.time()
            print(f"⚡QUERY: {query.query}")
            print(f"🔧 HARDCODED SQL: {hardcoded_sql}")
            
            # Get lightweight database connection (no LLM, no agent)
            db_conn = get_database_connection()
            if not db_conn:
                return Response(
                    success=False,
                    query=query.query,
                    result="Error: Could not establish database connection",
                    timestamp=datetime.now().isoformat()
                )
            
            result = db_conn.run(hardcoded_sql)
            query_time = time.time() - query_start_time
            print(f"Database execution time: {query_time:.2f} seconds")
            
            # Parse database results into structured format
            try:
                # Convert result to string and parse
                result_str = str(result)
                
                # Get column names from SQL
                columns = extract_column_names_from_sql(hardcoded_sql)
                
                # If column extraction failed, use hardcoded column names for known queries
                if not columns:
                    if "comprehensive collection report" in query.query.lower():
                        columns = ["Outlet", "Payment_Type", "Num_Transactions", "Num_New_Sales", "Num_Balance_Payments", "New_Sales_Amount", "Balance_Paid_Amount", "Total_Amount", "Tax_Collected", "Net_Amount"]
                    elif "payment summary" in query.query.lower():
                        columns = ["Outlet", "Payment_Type", "Num_Payments", "Num_New_Sales", "Num_Bal_Payments", "New_Sales_Amt", "Bal_Paid_Amt", "Total_Amt", "Taxes", "Bank_Charges", "Receivables"]
                    elif "outlet performance" in query.query.lower():
                        columns = ["Outlet", "Num_Transactions", "Total_Revenue", "Average_Transaction_Value", "Unique_Customers", "First_Transaction", "Latest_Transaction"]
                    elif "customer analysis" in query.query.lower():
                        columns = ["Cust_No", "Cust_code", "Cust_name", "Cust_phone1", "Cust_email", "Outlet", "Cust_JoinDate", "oustanding_payment", "Outstanding_Amount", "Cust_Point", "Loyalty_Points", "Status"]
                    elif any(word in query.query.lower() for word in ["transactions from last", "monthly", "quarterly", "yearly", "recent"]):
                        columns = ["sa_transacno", "sa_date", "sa_custname", "sa_totamt", "sa_totdisc", "sa_totgst", "sa_status", "Outlet"]
                    else:
                        columns = [f"Column_{i+1}" for i in range(10)]  # Default fallback
                
                # Parse the database result directly
                print(f"DEBUG: Raw result type: {type(result)}")
                print(f"DEBUG: Raw result content preview: {str(result)[:200]}...")
                
                # First, try to use the result directly if it's already a list
                if isinstance(result, list):
                    print("DEBUG: Result is already a list, processing directly")
                    rows = []
                    for row_tuple in result:
                        row_dict = {}
                        for i, value in enumerate(row_tuple):
                            if i < len(columns):
                                # Format decimal values to 2 decimal places
                                formatted_value = format_decimal_value(value)
                                
                                # Convert datetime objects to strings
                                if hasattr(formatted_value, 'isoformat'):
                                    row_dict[columns[i]] = formatted_value.isoformat()
                                else:
                                    row_dict[columns[i]] = formatted_value
                        rows.append(row_dict)
                    
                    # Filter out zero-value columns
                    filtered_rows, filtered_columns = filter_zero_columns(rows, columns)
                    
                    result_text = f"Report completed successfully\n\n"
                    result_text += f"SQL Query Used:\n{hardcoded_sql}\n\n"
                    result_text += f"Total Records: {len(filtered_rows)}\n"
                    result_text += f"Columns: {', '.join(filtered_columns)}"
                    include_table = True
                    parsed_results = filtered_rows
                    
                else:
                    # Try to parse the string representation
                    import ast
                    try:
                        print("DEBUG: Attempting to parse string representation")
                        # Simple case - if it's a clean list string without datetime
                        if result_str.startswith('[') and result_str.endswith(']') and 'datetime' not in result_str:
                            print("DEBUG: Clean list string detected, parsing directly")
                            parsed_results = ast.literal_eval(result_str)
                            
                            # Convert to list of dictionaries
                            rows = []
                            for row_tuple in parsed_results:
                                row_dict = {}
                                for i, value in enumerate(row_tuple):
                                    if i < len(columns):
                                        # Format decimal values to 2 decimal places
                                        formatted_value = format_decimal_value(value)
                                        row_dict[columns[i]] = formatted_value
                                rows.append(row_dict)
                            
                            # Filter out zero-value columns
                            filtered_rows, filtered_columns = filter_zero_columns(rows, columns)
                            
                            result_text = f"Report completed successfully\n\n"
                            result_text += f"SQL Query Used:\n{hardcoded_sql}\n\n"
                            result_text += f"Total Records: {len(filtered_rows)}\n"
                            result_text += f"Columns: {', '.join(filtered_columns)}"
                            include_table = True
                            parsed_results = filtered_rows
                            
                        else:
                            # Try to parse the string representation with datetime handling
                            try:
                                print("DEBUG: Attempting to parse string representation with datetime conversion")
                                
                                # Replace datetime.datetime(...) with string representation
                                import re
                                import datetime as dt
                                
                                # First, extract datetime objects and replace them with placeholders
                                datetime_pattern = r'datetime\.datetime\(([^)]+)\)'
                                datetime_objects = []
                                
                                def replace_datetime(match):
                                    datetime_str = match.group(1)
                                    # Parse the datetime and convert to ISO format
                                    try:
                                        # Extract year, month, day, hour, minute, second, microsecond
                                        parts = [int(x.strip()) for x in datetime_str.split(',')]
                                        dt_obj = dt.datetime(*parts)
                                        datetime_objects.append(dt_obj.isoformat())
                                        return f'"{dt_obj.isoformat()}"'
                                    except:
                                        datetime_objects.append(datetime_str)
                                        return f'"{datetime_str}"'
                                
                                # Replace all datetime objects in the string
                                clean_str = re.sub(datetime_pattern, replace_datetime, result_str)
                                
                                print(f"DEBUG: Clean string preview: {clean_str[:200]}...")
                                
                                # Now try to parse the cleaned string
                                parsed_results = ast.literal_eval(clean_str)
                                
                                # Convert to list of dictionaries with proper column mapping
                                rows = []
                                for row_tuple in parsed_results:
                                    row_dict = {}
                                    for i, value in enumerate(row_tuple):
                                        if i < len(columns):
                                            # Format decimal values to 2 decimal places
                                            formatted_value = format_decimal_value(value)
                                            row_dict[columns[i]] = formatted_value
                                    rows.append(row_dict)
                                
                                # Filter out zero-value columns
                                filtered_rows, filtered_columns = filter_zero_columns(rows, columns)
                                
                                result_text = f"Report completed successfully\n\n"
                                result_text += f"SQL Query Used:\n{hardcoded_sql}\n\n"
                                result_text += f"Total Records: {len(filtered_rows)}\n"
                                result_text += f"Columns: {', '.join(filtered_columns)}"
                                include_table = True
                                parsed_results = filtered_rows
                                
                            except Exception as parse_error:
                                print(f"DEBUG: Parse error: {parse_error}")
                                print(f"DEBUG: Raw result type: {type(result)}")
                                print(f"DEBUG: Raw result content: {result_str[:300]}...")
                                
                                # Final fallback - create empty structure
                                rows = []
                                result_text = f"Report completed with parsing issues\n\nSQL Query Used:\n{hardcoded_sql}\n\nRaw Data: {result_str[:200]}..."
                                include_table = True
                                parsed_results = rows
                    
                    except Exception as parse_error:
                        print(f"DEBUG: Parse error: {parse_error}")
                        print(f"DEBUG: Raw result type: {type(result)}")
                        print(f"DEBUG: Raw result content: {result_str[:300]}...")
                        
                        # Final fallback - create empty structure
                        rows = []
                        result_text = f"Report completed with parsing issues\n\nSQL Query Used:\n{hardcoded_sql}\n\nRaw Data: {result_str[:200]}..."
                        include_table = True
                        parsed_results = rows
                    
            except Exception as e:
                result_text = f"Error processing results: {str(e)}\n\nSQL Query Used:\n{hardcoded_sql}"
                include_table = False
                parsed_results = None
        else:
            # No hardcoded query found - use Smart Query Agent to generate SQL
            query_start_time = time.time()
            print(f"🤖 AI QUERY: {query.query}")
            print(f"🧠 AI-GENERATED SQL: Will be generated by SmartQueryAgent")
            
            # Initialize Smart Query Agent only when needed
            if not smart_query_agent:
                try:
                    init_start_time = time.time()
                    print("Initializing Smart Query Agent for AI query...")
                    smart_query_agent = SmartQueryAgent()
                    init_time = time.time() - init_start_time
                    print(f"Smart Query Agent initialization time: {init_time:.2f} seconds")
                except Exception as e:
                    return Response(
                        success=False,
                        query=query.query,
                        result=f"Error initializing Smart Query Agent: {str(e)}",
                        timestamp=datetime.now().isoformat()
                    )
            
            result = smart_query_agent.query(query.query)
            result_text = str(result)
            
            query_time = time.time() - query_start_time
            print(f"Total AI processing time: {query_time:.2f} seconds")
            print(f"🤖 AI Response: {result_text[:200]}...")
            
            # Determine if we should include table data
            include_table = query.include_table or should_include_table(query.query)
        
        # Extract table data if needed
        table_data = None
        if include_table:
            # For hardcoded queries - use structured data
            if hardcoded_sql and parsed_results is not None:
                print(f"DEBUG: Creating table with {len(parsed_results)} rows and {len(columns)} columns")
                print(f"DEBUG: First row: {parsed_results[0] if parsed_results else 'No rows'}")
                table_data = TableData(
                    columns=columns,
                    rows=parsed_results,
                    title=determine_table_title(query.query)
                )
            else:
                # For AI queries - extract from result text
                table_data = extract_table_data(result_text, query.query)
        
        # Only include table if it was successfully created
        response_data = {
            "success": True,
            "query": query.query,
            "result": result_text,
            "timestamp": datetime.now().isoformat()
        }
        
        if table_data:
            response_data["table"] = table_data
        
        # Calculate and print total response time
        total_time = time.time() - request_start_time
        print(f"TOTAL RESPONSE TIME: {total_time:.2f} seconds")
        print("=" * 50)
        
        return Response(**response_data)
        
    except Exception as e:
        return Response(
            success=False,
            query=query.query,
            result=f"Error: {str(e)}",
            timestamp=datetime.now().isoformat()
        )

if __name__ == "__main__":
    print("CRM API Starting...")
    print("URL: http://localhost:5000")
    print("Endpoint: POST /query")
    print("Docs: http://localhost:5000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=False,
        reload_excludes=["*.log", "*.db", "*.pyc", "__pycache__"]
    )
