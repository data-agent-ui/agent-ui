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

# Suppress warnings for faster startup
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*sysname.*")
warnings.filterwarnings("ignore", message=".*reflect.*")

try:
    from fastapi import FastAPI
    from pydantic import BaseModel
    from typing import List, Dict, Any, Optional
    import uvicorn
    import pandas as pd
    import re
    
    # Add src to path
    sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))
    
    from langchain_chain import CRMQueryAgent
    from hardcoded_queries import get_hardcoded_query
    
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please check your dependencies and virtual environment")
    sys.exit(1)

# Global agent and database
agent = None
db = None

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
            
            # Build connection string
            if username and password:
                database_uri = f"mssql+pyodbc://{username}:{password}@{server}/{database}?driver=ODBC+Driver+18+for+SQL+Server&Connection+Timeout=30&Command+Timeout=60&TrustServerCertificate=yes"
            else:
                database_uri = f"mssql+pyodbc://@{server}/{database}?driver=ODBC+Driver+18+for+SQL+Server&trusted_connection=yes&Connection+Timeout=30&Command+Timeout=60&TrustServerCertificate=yes"
            
            # Create lightweight database connection
            db = SQLDatabase.from_uri(
                database_uri, 
                include_tables=[],  # Don't auto-reflect tables
                sample_rows_in_table_info=0,  # Don't sample data
                max_string_length=1000
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
                
                # Create DataFrame
                df = pd.DataFrame(parsed_results, columns=columns)
                
                # Format numeric columns
                for col in df.columns:
                    if df[col].dtype == 'object':
                        # Try to convert to numeric
                        try:
                            df[col] = pd.to_numeric(df[col], errors='ignore')
                        except:
                            pass
                
                # Convert to table format - ensure all values are strings
                headers = df.columns.tolist()
                rows = []
                for row in df.values.tolist():
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
        # Look for SELECT ... FROM pattern
        select_match = re.search(r'SELECT\s+(.*?)\s+FROM', sql_text, re.IGNORECASE | re.DOTALL)
        if select_match:
            select_clause = select_match.group(1)
            
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
        # Check for hardcoded queries first
        hardcoded_sql = get_hardcoded_query(query.query)
        
        if hardcoded_sql:
            # Use hardcoded SQL query for instant response
            query_start_time = time.time()
            print(f"⚡ HARDCODED QUERY: {query.query}")
            
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
                                # Convert datetime objects to strings
                                if hasattr(value, 'isoformat'):
                                    row_dict[columns[i]] = value.isoformat()
                                else:
                                    row_dict[columns[i]] = value
                        rows.append(row_dict)
                    
                    result_text = f"Report completed successfully\n\n"
                    result_text += f"Total Records: {len(rows)}\n"
                    result_text += f"Columns: {', '.join(columns)}"
                    include_table = True
                    parsed_results = rows
                    
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
                                        row_dict[columns[i]] = value
                                rows.append(row_dict)
                            
                            result_text = f"Report completed successfully\n\n"
                            result_text += f"Total Records: {len(rows)}\n"
                            result_text += f"Columns: {', '.join(columns)}"
                            include_table = True
                            parsed_results = rows
                            
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
                                            row_dict[columns[i]] = value
                                    rows.append(row_dict)
                                
                                result_text = f"Report completed successfully\n\n"
                                result_text += f"Total Records: {len(rows)}\n"
                                result_text += f"Columns: {', '.join(columns)}"
                                include_table = True
                                parsed_results = rows
                                
                            except Exception as parse_error:
                                print(f"DEBUG: Parse error: {parse_error}")
                                print(f"DEBUG: Raw result type: {type(result)}")
                                print(f"DEBUG: Raw result content: {result_str[:300]}...")
                                
                                # Final fallback - create empty structure
                                rows = []
                                result_text = f"Report completed with parsing issues\n\nRaw Data: {result_str[:200]}..."
                                include_table = True
                                parsed_results = rows
                    
                    except Exception as parse_error:
                        print(f"DEBUG: Parse error: {parse_error}")
                        print(f"DEBUG: Raw result type: {type(result)}")
                        print(f"DEBUG: Raw result content: {result_str[:300]}...")
                        
                        # Final fallback - create empty structure
                        rows = []
                        result_text = f"Report completed with parsing issues\n\nRaw Data: {result_str[:200]}..."
                        include_table = True
                        parsed_results = rows
                    
            except Exception as e:
                result_text = f"Error processing results: {str(e)}"
                include_table = False
                parsed_results = None
        else:
            # Process the query using AI agent with smart detection
            query_start_time = time.time()
            print(f"AI QUERY: {query.query}")
            
            # Initialize AI agent only when needed
            if not agent:
                try:
                    init_start_time = time.time()
                    print("Initializing CRM Agent for AI query...")
                    agent = CRMQueryAgent()
                    init_time = time.time() - init_start_time
                    print(f"Agent initialization time: {init_time:.2f} seconds")
                except Exception as e:
                    return Response(
                        success=False,
                        query=query.query,
                        result=f"Error initializing CRM Agent: {str(e)}",
                        timestamp=datetime.now().isoformat()
                    )
            
            result = agent.query(query.query)
            result_text = str(result)
            query_time = time.time() - query_start_time
            print(f"Total AI processing time: {query_time:.2f} seconds")
            
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
