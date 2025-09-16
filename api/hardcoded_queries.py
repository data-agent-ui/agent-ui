#!/usr/bin/env python3
"""
Hardcoded SQL queries for common CRM requests
These queries are optimized for the MumsAndBabies4SUTD database schema
"""

HARDCODED_SQL_QUERIES = {
    # Customer queries
    "list all customers with their total outstanding amounts": """
    SELECT TOP 50
        c.Cust_No,
        c.Cust_code,
        c.Cust_name,
        c.Cust_phone1,
        c.Cust_email,
        ISNULL(c.oustanding_payment, 0) AS Outstanding_Amount,
        c.Site_Code AS Outlet,
        c.Cust_JoinDate,
        CASE WHEN c.Cust_isactive = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM dbo.Customer c
    WHERE c.Cust_isactive = 1
    ORDER BY c.Cust_name;
    """,
    
    "show me customer analysis": """
    SELECT TOP 50
        c.Cust_No,
        c.Cust_code,
        c.Cust_name,
        c.Cust_phone1,
        c.Cust_email,
        c.Site_Code AS Outlet,
        c.Cust_JoinDate,
        ISNULL(c.oustanding_payment, 0) AS Outstanding_Amount,
        ISNULL(c.Cust_Point, 0) AS Loyalty_Points,
        CASE WHEN c.Cust_isactive = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM dbo.Customer c
    ORDER BY c.Cust_JoinDate DESC;
    """,
    
    # Transaction/Collection queries
    "generate a comprehensive collection report by payment type": """
    SELECT 
        t.pay_type,
        t.pay_desc,
        COUNT(DISTINCT t.sa_transacno) AS Num_Transactions,
        SUM(t.pay_actamt) AS Total_Collected,
        SUM(ISNULL(t.Pay_GST_Amt_Collect, 0)) AS Total_Tax,
        SUM(t.pay_actamt - ISNULL(t.Pay_GST_Amt_Collect, 0)) AS Net_Receivables,
        AVG(t.pay_actamt) AS Avg_Transaction_Value
    FROM dbo.pos_taud t
    INNER JOIN dbo.pos_haud h 
        ON t.sa_transacno = h.sa_transacno
    WHERE h.IsVoid = 0  -- ignore void transactions
    GROUP BY t.pay_type, t.pay_desc
    ORDER BY Total_Collected DESC;
    """,
    
    
   ###test 
    "list all invoices their total amount and how much has been paid by payment type": """
    SELECT TOP 50
        ph.sa_transacno AS Invoice_No,
        ph.sa_custname AS Customer_Name,
        ph.sa_transacamt AS Invoice_Amount,
        pt.pay_Desc AS Payment_Type,
        SUM(pt.pay_actamt) AS Paid_Amount,
        ph.sa_transacamt - SUM(pt.pay_actamt) AS Outstanding_Amount,
        ph.sa_date AS Invoice_Date,
        ph.ItemSIte_Code AS Outlet
    FROM dbo.pos_haud ph
    LEFT JOIN dbo.pos_taud pt ON ph.sa_transacno = pt.sa_transacno
    GROUP BY 
        ph.sa_transacno,
        ph.sa_custname,
        ph.sa_transacamt,
        pt.pay_Desc,
        ph.sa_date,
        ph.ItemSIte_Code
    ORDER BY ph.sa_date DESC;
    """,
    
    "show me transaction details and payment amounts": """
    SELECT TOP 50
        h.sa_transacno AS Transaction_No,
        h.sa_custname AS Customer,
        h.sa_transacamt AS Total_Amount,
        h.sa_date AS Transaction_Date,
        h.ItemSIte_Code AS Outlet,
        h.sa_transacno_type AS Transaction_Type,
        p.pay_Desc AS Payment_Method,
        p.pay_actamt AS Payment_Amount,
        ISNULL(p.pay_GST, 0) AS Tax_Amount
    FROM dbo.pos_haud h
    LEFT JOIN dbo.pos_taud p ON h.sa_transacno = p.sa_transacno
    ORDER BY h.sa_date DESC;
    """,
    
    # Employee queries
    "show me employee performance": """
    SELECT TOP 50
        e.Emp_Code,
        e.Emp_Name,
        e.Emp_Position,
        e.Site_Code AS Outlet,
        COUNT(DISTINCT h.sa_transacno) AS Total_Transactions,
        SUM(h.sa_transacamt) AS Total_Sales_Amount,
        AVG(h.sa_transacamt) AS Average_Transaction_Amount
    FROM dbo.Employee e
    LEFT JOIN dbo.pos_haud h ON e.Emp_Code = h.sa_staffcode
    GROUP BY e.Emp_Code, e.Emp_Name, e.Emp_Position, e.Site_Code
    ORDER BY Total_Sales_Amount DESC;
    """,
    
    # Product queries
    "show me product sales analysis": """
    SELECT TOP 50
        d.Item_Code,
        d.Item_Desc AS Product_Name,
        d.ItemSIte_Code AS Outlet,
        SUM(d.qty) AS Total_Quantity_Sold,
        SUM(d.amt) AS Total_Sales_Amount,
        AVG(d.amt) AS Average_Price,
        COUNT(DISTINCT d.sa_transacno) AS Number_of_Transactions
    FROM dbo.pos_daud d
    GROUP BY d.Item_Code, d.Item_Desc, d.ItemSIte_Code
    ORDER BY Total_Sales_Amount DESC;
    """,
    
    "show me top selling products": """
    SELECT TOP 20
        d.Item_Code,
        d.Item_Desc AS Product_Name,
        SUM(d.qty) AS Total_Quantity_Sold,
        SUM(d.amt) AS Total_Revenue,
        COUNT(DISTINCT d.sa_transacno) AS Transaction_Count,
        AVG(d.amt / NULLIF(d.qty, 0)) AS Average_Unit_Price
    FROM dbo.pos_daud d
    GROUP BY d.Item_Code, d.Item_Desc
    ORDER BY Total_Revenue DESC;
    """,
    
    # Outlet performance
    "show me outlet performance": """
    SELECT TOP 20
        h.ItemSIte_Code AS Outlet,
        COUNT(DISTINCT h.sa_transacno) AS Total_Transactions,
        SUM(h.sa_transacamt) AS Total_Revenue,
        AVG(h.sa_transacamt) AS Average_Transaction_Value,
        COUNT(DISTINCT h.sa_custname) AS Unique_Customers,
        MIN(h.sa_date) AS First_Transaction,
        MAX(h.sa_date) AS Latest_Transaction
    FROM dbo.pos_haud h
    GROUP BY h.ItemSIte_Code
    ORDER BY Total_Revenue DESC;
    """,
    
    # Period-based transaction queries
    "show me transactions from last month": """
    DECLARE @Period VARCHAR(20) = 'last_month';
    
    WITH LatestDate AS (
        SELECT MAX(sa_date) AS MaxDate
        FROM dbo.pos_haud
    )
    SELECT 
        h.sa_transacno,
        h.sa_date,
        h.sa_custname,
        h.sa_totamt,
        h.sa_totdisc,
        h.sa_totgst,
        h.sa_status,
        h.ItemSIte_Code AS Outlet
    FROM dbo.pos_haud h
    CROSS JOIN LatestDate ld
    WHERE 
        YEAR(h.sa_date) = YEAR(ld.MaxDate)
        AND MONTH(h.sa_date) = MONTH(ld.MaxDate)
    ORDER BY h.sa_date DESC;
    """,
    
    "show me transactions from last quarter": """
    DECLARE @Period VARCHAR(20) = 'last_quarter';
    
    WITH LatestDate AS (
        SELECT MAX(sa_date) AS MaxDate
        FROM dbo.pos_haud
    )
    SELECT 
        h.sa_transacno,
        h.sa_date,
        h.sa_custname,
        h.sa_totamt,
        h.sa_totdisc,
        h.sa_totgst,
        h.sa_status,
        h.ItemSIte_Code AS Outlet
    FROM dbo.pos_haud h
    CROSS JOIN LatestDate ld
    WHERE 
        DATEPART(QUARTER, h.sa_date) = DATEPART(QUARTER, ld.MaxDate)
        AND YEAR(h.sa_date) = YEAR(ld.MaxDate)
    ORDER BY h.sa_date DESC;
    """,
    
    "show me transactions from last year": """
    DECLARE @Period VARCHAR(20) = 'last_year';
    
    WITH LatestDate AS (
        SELECT MAX(sa_date) AS MaxDate
        FROM dbo.pos_haud
    )
    SELECT 
        h.sa_transacno,
        h.sa_date,
        h.sa_custname,
        h.sa_totamt,
        h.sa_totdisc,
        h.sa_totgst,
        h.sa_status,
        h.ItemSIte_Code AS Outlet
    FROM dbo.pos_haud h
    CROSS JOIN LatestDate ld
    WHERE 
        YEAR(h.sa_date) = YEAR(ld.MaxDate)
    ORDER BY h.sa_date DESC;
    """,
    
    "show me transactions from last 15 days": """
    DECLARE @Period VARCHAR(20) = 'last_15_days';
    
    WITH LatestDate AS (
        SELECT MAX(sa_date) AS MaxDate
        FROM dbo.pos_haud
    )
    SELECT 
        h.sa_transacno,
        h.sa_date,
        h.sa_custname,
        h.sa_totamt,
        h.sa_totdisc,
        h.sa_totgst,
        h.sa_status,
        h.ItemSIte_Code AS Outlet
    FROM dbo.pos_haud h
    CROSS JOIN LatestDate ld
    WHERE 
        h.sa_date >= DATEADD(DAY, -15, ld.MaxDate)
        AND h.sa_date <= ld.MaxDate
    ORDER BY h.sa_date DESC;
    """,
    
    "show me recent transactions": """
    DECLARE @Period VARCHAR(20) = 'last_15_days';
    
    WITH LatestDate AS (
        SELECT MAX(sa_date) AS MaxDate
        FROM dbo.pos_haud
    )
    SELECT 
        h.sa_transacno,
        h.sa_date,
        h.sa_custname,
        h.sa_totamt,
        h.sa_totdisc,
        h.sa_totgst,
        h.sa_status,
        h.ItemSIte_Code AS Outlet
    FROM dbo.pos_haud h
    CROSS JOIN LatestDate ld
    WHERE 
        h.sa_date >= DATEADD(DAY, -15, ld.MaxDate)
        AND h.sa_date <= ld.MaxDate
    ORDER BY h.sa_date DESC;
    """,
    
    # Payment type specific queries
    "show me all transactions made through VISA": """
    SELECT 
        h.sa_transacno,
        h.sa_date,
        h.sa_custname,
        h.sa_totamt,
        h.sa_status,
        t.pay_type,
        t.pay_desc,
        t.pay_actamt
    FROM dbo.pos_haud h
    INNER JOIN dbo.pos_taud t 
        ON h.sa_transacno = t.sa_transacno
    WHERE t.pay_desc = 'VISA'   -- or t.pay_type = 'VS'
    ORDER BY h.sa_date DESC;
    """,
    
    "show me transactions by payment type": """
    -- Template query for any payment type (VISA, CASH, MASTERCARD, etc.)
    -- LLM should modify the WHERE clause based on user's requested payment type
    SELECT 
        h.sa_transacno,
        h.sa_date,
        h.sa_custname,
        h.sa_totamt,
        h.sa_status,
        t.pay_type,
        t.pay_desc,
        t.pay_actamt
    FROM dbo.pos_haud h
    INNER JOIN dbo.pos_taud t 
        ON h.sa_transacno = t.sa_transacno
    WHERE t.pay_desc = '[PAYMENT_TYPE]'  -- Replace [PAYMENT_TYPE] with actual payment type
    ORDER BY h.sa_date DESC;
    """,
    
    # General queries
    "what tables exist in this database": """
    SELECT 
        TABLE_NAME,
        TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME;
    """,
    
    "show me database structure": """
    SELECT 
        t.TABLE_NAME,
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.TABLES t
    INNER JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;
    """
}

def get_hardcoded_query(user_query):
    """
    Find a matching hardcoded query using LLM-based intelligent matching
    Returns the SQL query if found, None otherwise
    """
    import os
    from dotenv import load_dotenv
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    import json
    
    load_dotenv()
    
    # First, try direct matches for exact queries
    query_lower = user_query.lower().strip()
    if query_lower in HARDCODED_SQL_QUERIES:
        return HARDCODED_SQL_QUERIES[query_lower]
    
    # Initialize LLM for intelligent matching
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("Warning: OPENAI_API_KEY not found, falling back to keyword matching")
        return _fallback_keyword_matching(user_query)
    
    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",  # Use faster, cheaper model for matching
            temperature=0,
            openai_api_key=openai_api_key,
            max_tokens=1000
        )
        
        # Create available queries list for LLM
        available_queries = list(HARDCODED_SQL_QUERIES.keys())
        
        # Create matching prompt
        template = """
        You are a query matching expert for a CRM system. Your task is to match user queries with predefined hardcoded queries.
        
        User Query: "{user_query}"
        
        Available Hardcoded Queries:
        {available_queries}
        
        Instructions:
        1. Analyze the user's intent and what they want to know
        2. Find the best matching hardcoded query from the list above
        3. Consider synonyms, variations, and different ways of asking the same thing
        4. Only return a match if the intent is very similar (confidence > 0.8)
        5. If no good match exists, return "NO_MATCH"
        
        Examples of good matches:
        - "show me customer data" → "list all customers with their total outstanding amounts"
        - "payment report" → "generate a comprehensive collection report by payment type"
        - "monthly transactions" → "show me transactions from last month"
        - "top products" → "what are the top selling products?"
        - "outlet performance" → "show me outlet performance"
        - "VISA payments" → "show me all transactions made through VISA"
        - "transactions paid with VISA" → "show me all transactions made through VISA"
        - "CASH transactions" → "show me transactions by payment type"
        - "MASTERCARD payments" → "show me transactions by payment type"
        - "PAYNOW transactions" → "show me transactions by payment type"
        - "SHOPBACK payments" → "show me transactions by payment type"
        - "AMEX transactions" → "show me transactions by payment type"
        - "PAYPAL payments" → "show me transactions by payment type"
        - "transactions by payment method" → "show me transactions by payment type"
        
        Respond with ONLY the exact query name from the list, or "NO_MATCH" if no good match exists.
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | llm | StrOutputParser()
        
        # Format available queries for the prompt
        queries_text = "\n".join([f"- {query}" for query in available_queries])
        
        # Get LLM response
        response = chain.invoke({
            "user_query": user_query,
            "available_queries": queries_text
        })
        
        # Clean up response
        matched_query = response.strip()
        
        # Check if we got a valid match
        if matched_query in HARDCODED_SQL_QUERIES:
            print(f"LLM matched query: '{user_query}' → '{matched_query}'")
            return HARDCODED_SQL_QUERIES[matched_query]
        else:
            print(f"LLM found no match for: '{user_query}'")
            return None
            
    except Exception as e:
        print(f"Error in LLM matching: {e}")
        print("Falling back to keyword matching")
        return _fallback_keyword_matching(user_query)

def _fallback_keyword_matching(user_query):
    """
    Fallback keyword matching if LLM is not available
    Only matches period-based transaction queries
    """
    query_lower = user_query.lower().strip()
    
    # Only period-based transaction queries
    if any(word in query_lower for word in ['last month', 'monthly', 'this month']):
        return HARDCODED_SQL_QUERIES["show me transactions from last month"]
    
    if any(word in query_lower for word in ['last quarter', 'quarterly', 'this quarter']):
        return HARDCODED_SQL_QUERIES["show me transactions from last quarter"]
    
    if any(word in query_lower for word in ['last year', 'yearly', 'this year']):
        return HARDCODED_SQL_QUERIES["show me transactions from last year"]
    
    if any(word in query_lower for word in ['last 15 days', '15 days', 'recent', 'recently']):
        return HARDCODED_SQL_QUERIES["show me transactions from last 15 days"]
    
    return None

def list_available_queries():
    """List all available hardcoded queries"""
    return list(HARDCODED_SQL_QUERIES.keys())

if __name__ == "__main__":
    print("Available hardcoded queries:")
    for i, query in enumerate(list_available_queries(), 1):
        print(f"{i}. {query}")
