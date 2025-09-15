# src/langchain_chain.py
import os
import warnings
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_openai import ChatOpenAI
from langchain_community.agent_toolkits import create_sql_agent
from langchain.chains import create_sql_query_chain
from langchain_community.tools.sql_database.tool import QuerySQLDataBaseTool
from langchain_core.prompts import ChatPromptTemplate

# Suppress warnings for faster startup
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*sysname.*")
warnings.filterwarnings("ignore", message=".*reflect.*")

# Load .env
load_dotenv()

class CRMQueryAgent:
    def __init__(self):
        # Get API key from environment
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.openai_api_key:
            print("Warning: OPENAI_API_KEY not found in environment variables.")
            print("Please set your OpenAI API key in a .env file or environment variable.")
        
        # Connect to SQL Server database
        server = os.getenv("DB_SERVER", "localhost")
        database = os.getenv("DB_NAME", "MumsAndBabies4SUTD")
        username = os.getenv("DB_USER", "")
        password = os.getenv("DB_PASSWORD", "")
        
        # Build connection string with timeout and optimization parameters
        if username and password:
            self.database_uri = f"mssql+pyodbc://{username}:{password}@{server}/{database}?driver=ODBC+Driver+18+for+SQL+Server&Connection+Timeout=30&Command+Timeout=60&TrustServerCertificate=yes"
        else:
            # Windows Authentication with optimizations
            self.database_uri = f"mssql+pyodbc://@{server}/{database}?driver=ODBC+Driver+18+for+SQL+Server&trusted_connection=yes&Connection+Timeout=30&Command+Timeout=60&TrustServerCertificate=yes"
        
        # Optimize database connection for faster startup
        self.db = SQLDatabase.from_uri(
            self.database_uri, 
            include_tables=[],  # Don't auto-reflect all tables
            sample_rows_in_table_info=0,  # Don't sample data during startup
            max_string_length=1000
        )
        
        # Set the database dialect to SQL Server
        self.db._dialect = "mssql"
        
        # Initialize LLM with better model for SQL generation
        self.llm = ChatOpenAI(
            model="gpt-4o", 
            temperature=0, 
            openai_api_key=self.openai_api_key,
            max_tokens=4000
        )
        
        # Create SQL query chain
        self.sql_chain = create_sql_query_chain(self.llm, self.db)
        
        # Create SQL agent for more complex queries with SQL Server dialect
        self.agent = create_sql_agent(
            llm=self.llm,
            db=self.db,
            agent_type="openai-tools",
            verbose=True,
            agent_executor_kwargs={
                "handle_parsing_errors": True,
            }
        )
        
        # Custom prompt for better CRM-specific responses with report generation
        self.custom_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a business intelligence expert for MumsAndBabies4SUTD retail system. You can query a comprehensive retail database with the following key tables:
            
            IMPORTANT: Always query the actual database tables. Do not provide generic explanations.
            
            Database Schema (MumsAndBabies4SUTD):
            
            - Customer: Master Data table containing Customer information
              * Cust_no (PK, auto incremental ID)
              * Cust_Code (System generated unique identifier)
              * Cust_JoinDate (Customer Join Date)
              * Cust_name (Customer Name)
              * Cust_address, Cust_address1, Cust_address2, Cust_address3 (Address fields)
              * Cust_PostCode (Postal Code)
              * Cust_phone1, Cust_phone2 (Contact numbers)
              * Cust_email (Email Address)
              * Cust_Occupation (Occupation)
              * Cust_DOB (Date of Birth)
              * Cust_marital (Marital Status)
              * Cust_race (Race)
              * Cust_sexes (Gender)
              * Cust_nationality (Nationality)
              * Cust_Class (Membership Type)
              * Cust_Source (Source)
              * Cust_Consultant_id_id (Consultant, reference Employee)
              * Cust_Therapist_id_id (Therapist, reference Employee)
              * Site_Code (Outlet)
              * Cust_isactive (Active flag)
            
            - Employee: Master Data table containing Employee information
              * Emp (PK, auto incremental ID)
              * Emp_Code (System generated unique identifier)
              * Emp_JoinDate (Employee Join Date)
              * Emp_name (Employee Full Name)
              * Display_Name (Display Name)
              * Emp_phone1, Emp_phone2 (Contact numbers)
              * Emp_nric (NRIC number)
              * Emp_DOB (Date of Birth)
              * Emp_nationality (Nationality)
              * Emp_TYPE (Employee Type)
              * Emp_isactive (Active flag)
            
            - Stock: Master Data table containing Services/Products
              * Item_no (PK, auto incremental ID)
              * Item_Code (System generated unique identifier)
              * Item_Div (Division)
              * Item_Dept (Department)
              * Item_Class (Item Classification)
              * Item_Brand (Brand)
              * Item_Range (Range)
              * Item_name (Item Name)
              * Item_Desc (Description)
              * Item_Price (Selling Price)
              * Item_isactive (Active flag)
            
            - pos_haud: Transactional Data - Invoice Header
              * sa_transacno (System Generated Unique identifier - PK)
              * sa_date (Date of Transaction)
              * sa_time (Time of Transaction)
              * sa_status (Transaction Status)
              * sa_custno (Customer Code, reference Customer.Cust_Code)
              * sa_custname (Customer Name)
              * ItemSIte_Code (Outlet)
              * sa_depositamt (Total deposit amount)
              * sa_transacamt (Total Transaction amount)
              * total_outstanding (Total Outstanding amount)
              * sa_round (Rounding calculations)
              * sa_transacno_ref (Invoice number)
              * sa_transacno_type (Invoice Type)
              * isVoid (Void flag)
              * cas_name (Cashier Name)
            
            - pos_daud: Transactional Data - Invoice Details
              * dt_no (PK, auto incremental ID)
              * sa_transacno (Reference pos_haud table)
              * sa_date (Date of Transaction)
              * sa_time (Time of Transaction)
              * dt_status (Status of Detail row)
              * dt_itemno (Item Code, reference Stock.Item_Code)
              * dt_itemdesc (Name of Item sold)
              * dt_price (Unit Price)
              * dt_qty (Qty sold)
              * dt_amt (Sub total)
              * dt_Staffno (Sales staff, reference Employee.Emp_Code)
              * dt_Staffname (Name of Sales Staff)
              * ItemSIte_Code (Outlet)
              * dt_LineNo (Line number in invoice)
              * dt_TransacAmt (Transaction Amount)
              * dt_deposit (Deposit Amount)
              * Record_Detail_Type (Type of Detail row)
            
            - pos_taud: Transactional Data - Payments made
              * pay_no (PK, auto incremental ID)
              * sa_transacno (Reference pos_haud table)
              * sa_date (Date of Transaction)
              * sa_time (Time of Transaction)
              * pay_group (Payment Type Group)
              * pay_type (Payment Type)
              * pay_Desc (Description of Payment Type)
              * pay_actamt (Payment Amount)
              * pay_GST (GST Amount)
              * pay_rem4 (Payment Remarks)
              * ItemSIte_Code (Outlet)
            
            - MultiStaff: Transactional Data - Sales Staff of each transaction
              * ID (PK, auto incremental ID)
              * sa_transacno (Reference pos_haud table)
              * Item_code (Item Code, reference pos_daud.dt_itemno)
              * Emp_Code (Employee Code, reference Employee.Emp_Code)
              * Ratio (Ratio obtained by each staff)
              * SalesAmt (Total Sales amount credited to each staff)
              * Dt_lineno (Line number, reference pos_daud.dt_lineno)
              * isDelete (Active flag)
            
            - Appointment: Transactional Data - Appointment information
              * Appt_ID (PK, auto incremental ID)
              * Appt_Code (System generated unique identifier)
              * Cust_no (Customer Code, reference Customer.Cust_Code)
              * Appt_date (Date of Appointment)
              * Appt_Fr_time (From Time)
              * Appt_To_time (To Time)
              * Appt_phone (Phone number of Customer)
              * Appt_remark (Service that customer booked for)
              * Emp_no (Staff that appointment is booked under)
              * Appt_Status (Status: Booked, Confirmed, Arrived, Done, Cancelled, Block)
              * Appt_isactive (Active flag)
              * ItemSIte_Code (Outlet)
            
            CRITICAL SQL Server Requirements:
            - Use TOP N instead of LIMIT N
            - Use ISNULL() instead of COALESCE()
            - Use proper SQL Server date functions
            - Always execute actual SQL queries against the database
            - Example: SELECT TOP 10 * FROM pos_taud ORDER BY pay_actamt DESC
            
            SAMPLE SQL QUERIES - Use these as templates and adapt based on actual table names:
            
            1. Collection by Payment Type Report:
            SELECT TOP 20
                p.ItemSIte_Code AS Outlet,
                p.pay_Desc AS Payment_Type,
                COUNT(DISTINCT p.sa_transacno) AS Num_Payments,
                SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN 1 ELSE 0 END) AS Num_New_Sales,
                SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN 1 ELSE 0 END) AS Num_Bal_Payments,
                SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN p.pay_actamt ELSE 0 END) AS New_Sales_Amt,
                SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN p.pay_actamt ELSE 0 END) AS Bal_Paid_Amt,
                SUM(p.pay_actamt) AS Total_Amt,
                SUM(ISNULL(p.pay_GST,0)) AS Taxes,
                0 AS Bank_Charges,
                SUM(p.pay_actamt - ISNULL(p.pay_GST,0)) AS Receivables
            FROM dbo.pos_taud p
            JOIN dbo.pos_haud h ON p.sa_transacno = h.sa_transacno
            GROUP BY p.ItemSIte_Code, p.pay_Desc
            ORDER BY p.ItemSIte_Code, p.pay_Desc;
            
            2. Customer Analysis Report:
            SELECT TOP 50
                c.Cust_Code,
                c.Cust_name,
                c.Cust_JoinDate,
                c.Cust_phone1,
                c.Cust_email,
                c.Site_Code AS Outlet,
                c.Cust_Class,
                c.Cust_isactive
            FROM dbo.Customer c
            WHERE c.Cust_isactive = 1
            ORDER BY c.Cust_JoinDate DESC;
            
            3. Sales Performance by Staff:
            SELECT TOP 30
                d.dt_Staffno,
                d.dt_Staffname,
                d.ItemSIte_Code AS Outlet,
                COUNT(DISTINCT d.sa_transacno) AS Num_Transactions,
                SUM(d.dt_amt) AS Total_Sales,
                AVG(d.dt_amt) AS Avg_Transaction_Value
            FROM dbo.pos_daud d
            WHERE d.dt_status = 'Active'
            GROUP BY d.dt_Staffno, d.dt_Staffname, d.ItemSIte_Code
            ORDER BY Total_Sales DESC;
            
            4. Product Sales Analysis:
            SELECT TOP 50
                d.dt_itemno,
                d.dt_itemdesc,
                d.ItemSIte_Code AS Outlet,
                SUM(d.dt_qty) AS Total_Quantity,
                SUM(d.dt_amt) AS Total_Amount,
                AVG(d.dt_price) AS Avg_Price,
                COUNT(DISTINCT d.sa_transacno) AS Num_Transactions
            FROM dbo.pos_daud d
            WHERE d.dt_status = 'Active'
            GROUP BY d.dt_itemno, d.dt_itemdesc, d.ItemSIte_Code
            ORDER BY Total_Amount DESC;
            
            5. Outlet Performance Summary:
            SELECT TOP 20
                h.ItemSIte_Code AS Outlet,
                COUNT(DISTINCT h.sa_transacno) AS Num_Transactions,
                SUM(h.sa_transacamt) AS Total_Revenue,
                AVG(h.sa_transacamt) AS Avg_Transaction_Value,
                COUNT(DISTINCT h.sa_custno) AS Unique_Customers
            FROM dbo.pos_haud h
            WHERE h.sa_status = 'Active' AND h.isVoid = 0
            GROUP BY h.ItemSIte_Code
            ORDER BY Total_Revenue DESC;
            
            IMPORTANT INSTRUCTIONS: 
            1. ALWAYS execute actual SQL queries against the database
            2. NEVER provide generic explanations without querying data
            3. First, check what tables actually exist using: SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            4. Adapt the sample queries above to use the actual table names found in the database
            5. Use dbo. prefix for table names (e.g., dbo.pos_taud, dbo.Customer)
            6. Format results in clear tables with proper headers
            7. Provide business insights based on actual data
            8. If tables don't exist as expected, find similar tables and adapt the queries accordingly
            9. Always use TOP N instead of LIMIT N for SQL Server
            10. Use proper JOINs and WHERE clauses to filter active records"""),
            ("user", "{input}")
        ])
    
    def query(self, question):
        """Execute a natural language query and return formatted results"""
        try:
            if not self.openai_api_key:
                return "Error: OpenAI API key not configured. Please set OPENAI_API_KEY in your environment."
            
            # Step 1: Get actual table and column information
            print(f"🔍 Step 1: Analyzing database structure for: {question}")
            
            # Get list of all tables
            tables_query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
            tables_result = self.db.run(tables_query)
            print(f"📋 Available tables: {tables_result}")
            
            # Step 2: Determine query type and get relevant table structures
            question_lower = question.lower()
            
            if any(keyword in question_lower for keyword in ['transaction', 'payment', 'pos_taud', 'pos_haud', 'pos_daud', 'collection', 'sales']):
                # Transaction-related query
                print("🎯 Transaction-related query detected")
                relevant_tables = ['pos_taud', 'pos_haud', 'pos_daud']
                query_type = "transaction"
                
            elif any(keyword in question_lower for keyword in ['customer', 'cust_', 'client', 'member']):
                # Customer-related query
                print("👥 Customer-related query detected")
                relevant_tables = ['Customer']
                query_type = "customer"
                
            elif any(keyword in question_lower for keyword in ['employee', 'staff', 'emp_', 'worker']):
                # Employee-related query
                print("👨‍💼 Employee-related query detected")
                relevant_tables = ['Employee']
                query_type = "employee"
                
            elif any(keyword in question_lower for keyword in ['product', 'item', 'stock', 'service']):
                # Product-related query
                print("📦 Product-related query detected")
                relevant_tables = ['Stock', 'pos_daud']
                query_type = "product"
                
            else:
                # General query - check all tables
                print("🔍 General query detected")
                relevant_tables = ['pos_taud', 'pos_haud', 'pos_daud', 'Customer', 'Employee', 'Stock']
                query_type = "general"
            
            # Step 3: Get column information for relevant tables
            print(f"📊 Step 2: Getting column structure for: {relevant_tables}")
            
            schema_details = ""
            for table in relevant_tables:
                try:
                    columns_query = f"""
                    SELECT 
                        COLUMN_NAME,
                        DATA_TYPE,
                        IS_NULLABLE,
                        COLUMN_DEFAULT
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = '{table}'
                    ORDER BY ORDINAL_POSITION
                    """
                    columns_result = self.db.run(columns_query)
                    schema_details += f"\n{table} table structure:\n{columns_result}\n"
                    
                    # Get sample data from the table
                    sample_query = f"SELECT TOP 3 * FROM dbo.{table}"
                    try:
                        sample_result = self.db.run(sample_query)
                        schema_details += f"Sample data from {table}:\n{sample_result}\n"
                    except:
                        schema_details += f"No sample data available for {table}\n"
                        
                except Exception as e:
                    schema_details += f"Could not get structure for {table}: {str(e)}\n"
            
            # Step 4: Create targeted query with actual schema
            print(f"🔄 Step 3: Creating targeted query for {query_type} type")
            
            enhanced_question = f"""
            QUERY TYPE: {query_type.upper()}
            RELEVANT TABLES: {', '.join(relevant_tables)}
            
            ACTUAL DATABASE STRUCTURE:
            {schema_details}
            
            USER QUERY: {question}
            
            INSTRUCTIONS:
            1. Use ONLY the tables and columns shown above
            2. Create SQL query using the actual column names from the database
            3. Use SQL Server syntax (TOP N, ISNULL, etc.)
            4. Execute the query and return real data
            5. If a table doesn't exist, find the closest alternative
            6. Focus on {query_type} data only
            
            Generate and execute the appropriate SQL query now.
            """
            
            result = self.agent.invoke({"input": enhanced_question})
            print(f"📊 Agent result: {result}")
            return result
            
        except Exception as e:
            print(f"❌ Error executing query: {str(e)}")
            return f"Error executing query: {str(e)}"
    
    def get_database_info(self):
        """Get information about the database schema"""
        try:
            info = self.db.get_table_info()
            return info
        except Exception as e:
            return f"Error getting database info: {str(e)}"
    
    def simple_query(self, question):
        """Execute a simple query using the SQL chain"""
        try:
            if not self.openai_api_key:
                return "Error: OpenAI API key not configured."
            
            # Generate SQL query
            sql_query = self.sql_chain.invoke({"question": question})
            
            # Execute the query
            result = self.db.run(sql_query)
            
            return f"SQL Query: {sql_query}\n\nResult: {result}"
            
        except Exception as e:
            return f"Error executing simple query: {str(e)}"
    
    def generate_report(self, report_type, period=None):
        """Generate comprehensive reports"""
        try:
            if not self.openai_api_key:
                return "Error: OpenAI API key not configured."
            
            # Determine the report query based on type and period
            if "sales" in report_type.lower() or "revenue" in report_type.lower():
                if period and "month" in period.lower():
                    query = f"Generate a comprehensive sales report for {period}. Include total revenue, number of orders, average order value, top customers, top products, sales trends, and business insights."
                else:
                    query = f"Generate a comprehensive sales report. Include total revenue, number of orders, average order value, top customers, top products, and business insights."
            elif "customer" in report_type.lower():
                query = f"Generate a comprehensive customer analysis report. Include customer demographics, top customers by value, customer acquisition trends, and customer insights."
            elif "product" in report_type.lower():
                query = f"Generate a comprehensive product performance report. Include top-selling products, product categories performance, inventory levels, and product insights."
            elif "employee" in report_type.lower() or "staff" in report_type.lower():
                query = f"Generate a comprehensive employee performance report. Include department breakdown, sales activities by employee, and team performance insights."
            else:
                query = f"Generate a comprehensive {report_type} report with detailed analysis, key metrics, trends, and business insights."
            
            # Use the agent to generate the report
            result = self.agent.invoke({"input": query})
            return result
            
        except Exception as e:
            return f"Error generating report: {str(e)}"
    
    def get_sales_summary(self, period="current month"):
        """Get a quick sales summary"""
        try:
            query = f"Provide a quick sales summary for {period}. Include total revenue, number of orders, and top 3 customers."
            result = self.agent.invoke({"input": query})
            return result
        except Exception as e:
            return f"Error getting sales summary: {str(e)}"

# Global instance will be created when needed
