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
    SELECT TOP 50
        p.ItemSIte_Code AS Outlet,
        p.pay_Desc AS Payment_Type,
        COUNT(DISTINCT p.sa_transacno) AS Num_Transactions,
        SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN 1 ELSE 0 END) AS Num_New_Sales,
        SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN 1 ELSE 0 END) AS Num_Balance_Payments,
        SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN p.pay_actamt ELSE 0 END) AS New_Sales_Amount,
        SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN p.pay_actamt ELSE 0 END) AS Balance_Paid_Amount,
        SUM(p.pay_actamt) AS Total_Amount,
        SUM(ISNULL(p.pay_GST, 0)) AS Tax_Collected,
        SUM(p.pay_actamt - ISNULL(p.pay_GST, 0)) AS Net_Amount
    FROM dbo.pos_taud p
    INNER JOIN dbo.pos_haud h ON p.sa_transacno = h.sa_transacno
    GROUP BY p.ItemSIte_Code, p.pay_Desc
    ORDER BY p.ItemSIte_Code, Total_Amount DESC;
    """,
    
    "generates a payment summary report grouped by outlet and payment type": """
    SELECT TOP 50
        p.ItemSIte_Code AS Outlet,
        p.pay_Desc AS Payment_Type,
        COUNT(DISTINCT p.sa_transacno) AS Num_Payments,
        SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN 1 ELSE 0 END) AS Num_New_Sales,
        SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN 1 ELSE 0 END) AS Num_Bal_Payments,
        SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN p.pay_actamt ELSE 0 END) AS New_Sales_Amt,
        SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN p.pay_actamt ELSE 0 END) AS Bal_Paid_Amt,
        SUM(p.pay_actamt) AS Total_Amt,
        SUM(ISNULL(p.Pay_GST_Amt_Collect, 0)) AS Taxes,
        0 AS Bank_Charges,
        SUM(p.pay_actamt - ISNULL(p.Pay_GST_Amt_Collect, 0)) AS Receivables
    FROM dbo.pos_taud p
    JOIN dbo.pos_haud h ON p.sa_transacno = h.sa_transacno
    GROUP BY p.ItemSIte_Code, p.pay_Desc
    ORDER BY p.ItemSIte_Code, p.pay_Desc;
    """,
    
    "payment summary report": """
    SELECT TOP 50
        p.ItemSIte_Code AS Outlet,
        p.pay_Desc AS Payment_Type,
        COUNT(DISTINCT p.sa_transacno) AS Num_Payments,
        SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN 1 ELSE 0 END) AS Num_New_Sales,
        SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN 1 ELSE 0 END) AS Num_Bal_Payments,
        SUM(CASE WHEN h.sa_transacno_type = 'New Sale' THEN p.pay_actamt ELSE 0 END) AS New_Sales_Amt,
        SUM(CASE WHEN h.sa_transacno_type = 'Balance Payment' THEN p.pay_actamt ELSE 0 END) AS Bal_Paid_Amt,
        SUM(p.pay_actamt) AS Total_Amt,
        SUM(ISNULL(p.Pay_GST_Amt_Collect, 0)) AS Taxes,
        0 AS Bank_Charges,
        SUM(p.pay_actamt - ISNULL(p.Pay_GST_Amt_Collect, 0)) AS Receivables
    FROM dbo.pos_taud p
    JOIN dbo.pos_haud h ON p.sa_transacno = h.sa_transacno
    GROUP BY p.ItemSIte_Code, p.pay_Desc
    ORDER BY p.ItemSIte_Code, p.pay_Desc;
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
    Find a matching hardcoded query based on user input
    Returns the SQL query if found, None otherwise
    """
    query_lower = user_query.lower().strip()
    
    # Direct matches
    if query_lower in HARDCODED_SQL_QUERIES:
        return HARDCODED_SQL_QUERIES[query_lower]
    
    # Partial matches for common patterns
    for key, sql in HARDCODED_SQL_QUERIES.items():
        key_words = key.lower().split()
        query_words = query_lower.split()
        
        # Check if most key words are in the query
        matches = sum(1 for word in key_words if any(word in qw for qw in query_words))
        if matches >= len(key_words) * 0.6:  # 60% match threshold
            return sql
    
    # Specific keyword matches
    if any(word in query_lower for word in ['customer', 'outstanding', 'amount']):
        return HARDCODED_SQL_QUERIES["list all customers with their total outstanding amounts"]
    
    if any(word in query_lower for word in ['collection', 'payment', 'type', 'report']):
        return HARDCODED_SQL_QUERIES["generate a comprehensive collection report by payment type"]
    
    if any(word in query_lower for word in ['payment', 'summary', 'grouped', 'outlet']):
        return HARDCODED_SQL_QUERIES["payment summary report"]
    
    if any(word in query_lower for word in ['invoice', 'total amount', 'paid']):
        return HARDCODED_SQL_QUERIES["list all invoices their total amount and how much has been paid by payment type"]
    
    if any(word in query_lower for word in ['employee', 'staff', 'performance']):
        return HARDCODED_SQL_QUERIES["show me employee performance"]
    
    if any(word in query_lower for word in ['product', 'sales', 'analysis']):
        return HARDCODED_SQL_QUERIES["show me product sales analysis"]
    
    if any(word in query_lower for word in ['outlet', 'performance']):
        return HARDCODED_SQL_QUERIES["show me outlet performance"]
    
    if any(word in query_lower for word in ['table', 'database', 'structure']):
        return HARDCODED_SQL_QUERIES["show me database structure"]
    
    return None

def list_available_queries():
    """List all available hardcoded queries"""
    return list(HARDCODED_SQL_QUERIES.keys())

if __name__ == "__main__":
    print("Available hardcoded queries:")
    for i, query in enumerate(list_available_queries(), 1):
        print(f"{i}. {query}")
