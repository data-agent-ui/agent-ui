#!/usr/bin/env python3
"""
Payment Analysis Query System - Parameterized Queries
Uses the PaymentAnalysisTool for dynamic query generation
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from payment_analysis_tool import payment_analysis_tool

def get_payment_analysis_query(user_query: str):
    """
    Get parameterized payment analysis query using the PaymentAnalysisTool
    Returns the SQL query if it's a payment analysis query, None otherwise
    """
    # Check if this is a payment analysis query
    if not payment_analysis_tool.is_payment_analysis_query(user_query):
        return None
    
    # Analyze the query to extract parameters
    analysis_params = payment_analysis_tool.analyze_query(user_query)
    
    # Generate the SQL query based on parameters
    sql_query = payment_analysis_tool.generate_sql_query(analysis_params)
    
    print(f"🔧 Payment Analysis Tool - Parameters: {analysis_params}")
    print(f"🔧 Generated SQL: {sql_query}")
    
    return sql_query

# No hardcoded queries - all handled by Payment Analysis Tool
HARDCODED_SQL_QUERIES = {}

def get_hardcoded_query(user_query):
    """
    Find a matching payment analysis query using the parameterized system
    Returns the SQL query if it's a payment analysis query, None otherwise
    """
    # Only handle payment analysis queries
    payment_query = get_payment_analysis_query(user_query)
    if payment_query:
        return payment_query
    
    # If not a payment analysis query, return None
    print(f"Query not supported - only payment analysis queries are supported: '{user_query}'")
    return None

def list_available_queries():
    """List all available hardcoded queries"""
    return list(HARDCODED_SQL_QUERIES.keys())

def list_available_payment_types():
    """List all available payment types"""
    return payment_analysis_tool.get_available_payment_types()

def list_available_time_periods():
    """List all available time periods"""
    return payment_analysis_tool.get_available_time_periods()

if __name__ == "__main__":
    print("Available hardcoded queries:")
    for i, query in enumerate(list_available_queries(), 1):
        print(f"{i}. {query}")
    
    print("\nAvailable payment types:")
    for i, payment_type in enumerate(list_available_payment_types(), 1):
        print(f"{i}. {payment_type}")
    
    print("\nAvailable time periods:")
    for i, time_period in enumerate(list_available_time_periods(), 1):
        print(f"{i}. {time_period}")
