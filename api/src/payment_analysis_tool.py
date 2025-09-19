#!/usr/bin/env python3
"""
Payment Analysis Tool - Parameterized Query System
Handles different payment types and time periods dynamically
"""

import re
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

class PaymentAnalysisTool:
    """
    Tool for analyzing payment data with parameterized queries
    """
    
    def __init__(self):
        self.payment_types = {
            'VISA': ['visa', 'vs', 'visa card', 'visa payment'],
            'MASTER': ['master', 'ms', 'mastercard', 'master card', 'mastercard payment'],
            'CASH': ['cash', 'cs', 'cash payment'],
            'AMEX': ['amex', 'ax', 'american express', 'amex payment'],
            'PAYPAL': ['paypal', 'paypal payment'],
            'PAYNOW NORMAL': ['paynow', 'payn', 'paynow normal', 'paynow payment'],
            'PAYNOW ASPIRE': ['paynow aspire', 'paynas', 'paynow aspire payment'],
            'PAYNOW OCBC': ['paynow ocbc', 'paynoc', 'ocbc paynow'],
            'SHOPBACK': ['shopback', 'shpb', 'shopback payment'],
            'PREPAID': ['prepaid', 'pp', 'prepaid payment', 'prepaid card'],
            'ATOME': ['atome', 'atome payment'],
            'WECHAT': ['wechat', 'wechat pay', 'wechat payment'],
            'PAYLAH': ['paylah', 'payl', 'paylah payment'],
            'GRABPAY': ['grabpay', 'grab', 'grab pay', 'grab payment'],
            'BANK TRANSFER': ['bank transfer', 'bnkt', 'wire transfer', 'bank payment', 'transfer'],
            'NETS': ['nets', 'nt', 'nets payment'],
            'STRIPE': ['stripe', 'str', 'stripe payment'],
            'VOUCHER': ['voucher', 'vc', 'voucher payment', 'gift voucher'],
            'CREDIT NOTE': ['credit note', 'cn', 'credit note payment'],
            'OLD BILL': ['old bill', 'ob', 'old bill payment'],
            'SUPER NANNY': ['super nanny', 'sn', 'super nanny payment'],
            'CHILLI PADI': ['chilli padi', 'chilli', 'chilli padi payment'],
            'MUMMY MARKET': ['mummy market', 'mm', 'mummy market payment'],
            'LAZADA': ['lazada', 'lzd', 'lazada payment'],
            'JCB': ['jcb', 'jcb payment'],
            'LYC': ['lyc', 'lyc payment'],
            'GST ABSORBED': ['gst absorbed', 'gstab', 'gst absorbed payment']
        }
        
        self.time_periods = {
            'last_month': ['last month', 'monthly', 'this month', 'past month'],
            'last_quarter': ['last quarter', 'quarterly', 'this quarter', 'past quarter'],
            'last_year': ['last year', 'yearly', 'this year', 'past year'],
            'last_15_days': ['last 15 days', '15 days', 'recent', 'recently', 'past 15 days'],
            'last_7_days': ['last 7 days', '7 days', 'past week', 'last week'],
            'last_30_days': ['last 30 days', '30 days', 'past 30 days'],
            'today': ['today', 'this day'],
            'yesterday': ['yesterday', 'previous day']
        }
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """
        Analyze natural language query and extract parameters
        """
        query_lower = query.lower().strip()
        
        # Extract payment type
        payment_type = self._extract_payment_type(query_lower)
        
        # Extract time period
        time_period = self._extract_time_period(query_lower)
        
        # Extract analysis type
        analysis_type = self._extract_analysis_type(query_lower)
        
        # Extract specific amounts or limits
        amount_filters = self._extract_amount_filters(query_lower)
        
        return {
            'payment_type': payment_type,
            'time_period': time_period,
            'analysis_type': analysis_type,
            'amount_filters': amount_filters,
            'original_query': query
        }
    
    def _extract_payment_type(self, query_lower: str) -> Optional[str]:
        """Extract payment type from query"""
        # Check for "all" or "all types" first - this means no specific payment type
        if any(phrase in query_lower for phrase in ['all type', 'all types', 'all payment', 'all payments', 'every type', 'every payment']):
            return None
        
        # Extract specific payment type (with word boundary matching to avoid false positives)
        for payment_type, patterns in self.payment_types.items():
            for pattern in patterns:
                # Use word boundary matching to avoid false positives like "NETS" in "payments"
                if re.search(r'\b' + re.escape(pattern) + r'\b', query_lower):
                    return payment_type
        return None
    
    def _extract_time_period(self, query_lower: str) -> Optional[str]:
        """Extract time period from query"""
        for period, patterns in self.time_periods.items():
            for pattern in patterns:
                if pattern in query_lower:
                    return period
        return None
    
    def _extract_analysis_type(self, query_lower: str) -> str:
        """Extract analysis type from query"""
        if any(word in query_lower for word in ['summary', 'overview', 'total', 'collection']):
            return 'summary'
        elif any(word in query_lower for word in ['list', 'show', 'display', 'transactions']):
            return 'list'
        elif any(word in query_lower for word in ['count', 'number', 'how many']):
            return 'count'
        elif any(word in query_lower for word in ['average', 'avg', 'mean']):
            return 'average'
        else:
            return 'summary'  # Default
    
    def _extract_amount_filters(self, query_lower: str) -> Dict[str, Any]:
        """Extract amount filters from query"""
        filters = {}
        
        # Extract specific amounts
        amount_pattern = r'\$?(\d+(?:,\d{3})*(?:\.\d{2})?)'
        amounts = re.findall(amount_pattern, query_lower)
        if amounts:
            filters['amounts'] = [float(amount.replace(',', '')) for amount in amounts]
        
        # Extract comparison operators
        if 'greater than' in query_lower or 'more than' in query_lower or 'above' in query_lower:
            filters['operator'] = '>'
        elif 'less than' in query_lower or 'below' in query_lower or 'under' in query_lower:
            filters['operator'] = '<'
        elif 'equal to' in query_lower or 'exactly' in query_lower:
            filters['operator'] = '='
        
        return filters
    
    def generate_sql_query(self, analysis_params: Dict[str, Any]) -> str:
        """
        Generate SQL query based on analysis parameters
        """
        payment_type = analysis_params.get('payment_type')
        time_period = analysis_params.get('time_period')
        analysis_type = analysis_params.get('analysis_type', 'summary')
        amount_filters = analysis_params.get('amount_filters', {})
        
        # Base query structure
        if analysis_type == 'summary':
            return self._generate_summary_query(payment_type, time_period, amount_filters)
        elif analysis_type == 'list':
            return self._generate_list_query(payment_type, time_period, amount_filters)
        elif analysis_type == 'count':
            return self._generate_count_query(payment_type, time_period, amount_filters)
        elif analysis_type == 'average':
            return self._generate_average_query(payment_type, time_period, amount_filters)
        else:
            return self._generate_summary_query(payment_type, time_period, amount_filters)
    
    def _generate_summary_query(self, payment_type: Optional[str], time_period: Optional[str], amount_filters: Dict[str, Any]) -> str:
        """Generate summary query"""
        base_query = """
        SELECT 
            t.pay_type,
            t.pay_desc,
            COUNT(DISTINCT t.sa_transacno) AS Num_Transactions,
            SUM(t.pay_actamt) AS Total_Collected,
            SUM(ISNULL(t.Pay_GST_Amt_Collect, 0)) AS Total_Tax,
            SUM(t.pay_actamt - ISNULL(t.Pay_GST_Amt_Collect, 0)) AS Net_Receivables,
            AVG(t.pay_actamt) AS Avg_Transaction_Value
        FROM dbo.pos_taud t
        INNER JOIN dbo.pos_haud h ON t.sa_transacno = h.sa_transacno
        WHERE h.IsVoid = 0
        """
        
        # Add payment type filter
        if payment_type:
            base_query += f" AND t.pay_desc = '{payment_type}'"
        
        # Add time period filter
        if time_period:
            time_condition = self._get_time_condition(time_period)
            base_query += f" AND {time_condition}"
        
        # Add amount filters
        if amount_filters.get('amounts') and amount_filters.get('operator'):
            amount = amount_filters['amounts'][0]
            operator = amount_filters['operator']
            base_query += f" AND t.pay_actamt {operator} {amount}"
        
        base_query += """
        GROUP BY t.pay_type, t.pay_desc
        ORDER BY Total_Collected DESC;
        """
        
        return base_query
    
    def _generate_list_query(self, payment_type: Optional[str], time_period: Optional[str], amount_filters: Dict[str, Any]) -> str:
        """Generate list query for individual transactions"""
        base_query = """
        SELECT TOP 100
            h.sa_transacno AS Transaction_No,
            h.sa_date AS Transaction_Date,
            h.sa_custname AS Customer_Name,
            h.sa_transacamt AS Total_Amount,
            t.pay_type,
            t.pay_desc AS Payment_Type,
            t.pay_actamt AS Payment_Amount,
            h.ItemSite_Code AS Outlet
        FROM dbo.pos_haud h
        INNER JOIN dbo.pos_taud t ON h.sa_transacno = t.sa_transacno
        WHERE h.IsVoid = 0
        """
        
        # Add payment type filter
        if payment_type:
            base_query += f" AND t.pay_desc = '{payment_type}'"
        
        # Add time period filter
        if time_period:
            time_condition = self._get_time_condition(time_period)
            base_query += f" AND {time_condition}"
        
        # Add amount filters
        if amount_filters.get('amounts') and amount_filters.get('operator'):
            amount = amount_filters['amounts'][0]
            operator = amount_filters['operator']
            base_query += f" AND t.pay_actamt {operator} {amount}"
        
        base_query += " ORDER BY h.sa_date DESC;"
        
        return base_query
    
    def _generate_count_query(self, payment_type: Optional[str], time_period: Optional[str], amount_filters: Dict[str, Any]) -> str:
        """Generate count query"""
        base_query = """
        SELECT 
            COUNT(DISTINCT t.sa_transacno) AS Total_Transactions,
            COUNT(*) AS Total_Payment_Records
        FROM dbo.pos_taud t
        INNER JOIN dbo.pos_haud h ON t.sa_transacno = h.sa_transacno
        WHERE h.IsVoid = 0
        """
        
        # Add payment type filter
        if payment_type:
            base_query += f" AND t.pay_desc = '{payment_type}'"
        
        # Add time period filter
        if time_period:
            time_condition = self._get_time_condition(time_period)
            base_query += f" AND {time_condition}"
        
        # Add amount filters
        if amount_filters.get('amounts') and amount_filters.get('operator'):
            amount = amount_filters['amounts'][0]
            operator = amount_filters['operator']
            base_query += f" AND t.pay_actamt {operator} {amount}"
        
        base_query += ";"
        
        return base_query
    
    def _generate_average_query(self, payment_type: Optional[str], time_period: Optional[str], amount_filters: Dict[str, Any]) -> str:
        """Generate average query"""
        base_query = """
        SELECT 
            AVG(t.pay_actamt) AS Average_Payment_Amount,
            MIN(t.pay_actamt) AS Min_Payment_Amount,
            MAX(t.pay_actamt) AS Max_Payment_Amount,
            COUNT(DISTINCT t.sa_transacno) AS Total_Transactions
        FROM dbo.pos_taud t
        INNER JOIN dbo.pos_haud h ON t.sa_transacno = h.sa_transacno
        WHERE h.IsVoid = 0
        """
        
        # Add payment type filter
        if payment_type:
            base_query += f" AND t.pay_desc = '{payment_type}'"
        
        # Add time period filter
        if time_period:
            time_condition = self._get_time_condition(time_period)
            base_query += f" AND {time_condition}"
        
        # Add amount filters
        if amount_filters.get('amounts') and amount_filters.get('operator'):
            amount = amount_filters['amounts'][0]
            operator = amount_filters['operator']
            base_query += f" AND t.pay_actamt {operator} {amount}"
        
        base_query += ";"
        
        return base_query
    
    def _get_time_condition(self, time_period: str) -> str:
        """Get SQL time condition based on period"""
        conditions = {
            'last_month': """
                YEAR(h.sa_date) = YEAR(DATEADD(MONTH, -1, GETDATE()))
                AND MONTH(h.sa_date) = MONTH(DATEADD(MONTH, -1, GETDATE()))
            """,
            'last_quarter': """
                DATEPART(QUARTER, h.sa_date) = DATEPART(QUARTER, DATEADD(QUARTER, -1, GETDATE()))
                AND YEAR(h.sa_date) = YEAR(DATEADD(QUARTER, -1, GETDATE()))
            """,
            'last_year': """
                YEAR(h.sa_date) = YEAR(DATEADD(YEAR, -1, GETDATE()))
            """,
            'last_15_days': """
                h.sa_date >= DATEADD(DAY, -15, GETDATE())
                AND h.sa_date <= GETDATE()
            """,
            'last_7_days': """
                h.sa_date >= DATEADD(DAY, -7, GETDATE())
                AND h.sa_date <= GETDATE()
            """,
            'last_30_days': """
                h.sa_date >= DATEADD(DAY, -30, GETDATE())
                AND h.sa_date <= GETDATE()
            """,
            'today': """
                CAST(h.sa_date AS DATE) = CAST(GETDATE() AS DATE)
            """,
            'yesterday': """
                CAST(h.sa_date AS DATE) = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE)
            """
        }
        
        return conditions.get(time_period, "h.sa_date >= DATEADD(DAY, -30, GETDATE())")
    
    def get_available_payment_types(self) -> List[str]:
        """Get list of available payment types"""
        return list(self.payment_types.keys())
    
    def get_available_time_periods(self) -> List[str]:
        """Get list of available time periods"""
        return list(self.time_periods.keys())
    
    def is_payment_analysis_query(self, query: str) -> bool:
        """Check if query is related to payment analysis"""
        query_lower = query.lower()
        
        # Check for payment-related keywords
        payment_keywords = [
            'payment', 'pay', 'visa', 'mastercard', 'cash', 'credit card', 'debit card',
            'paypal', 'paynow', 'shopback', 'prepaid', 'atome', 'wechat', 'paylah',
            'grabpay', 'bank transfer', 'nets', 'stripe', 'voucher', 'credit note'
        ]
        
        # Check for analysis keywords
        analysis_keywords = [
            'show', 'list', 'display', 'get', 'find', 'analysis', 'report', 'summary',
            'transactions', 'payments', 'collection', 'total', 'count', 'average'
        ]
        
        has_payment_keyword = any(keyword in query_lower for keyword in payment_keywords)
        has_analysis_keyword = any(keyword in query_lower for keyword in analysis_keywords)
        
        return has_payment_keyword and has_analysis_keyword

# Global instance
payment_analysis_tool = PaymentAnalysisTool()
