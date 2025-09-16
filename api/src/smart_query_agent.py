# src/smart_query_agent.py
import os
import warnings
import re
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage, HumanMessage

# Suppress warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*sysname.*")
warnings.filterwarnings("ignore", message=".*reflect.*")

load_dotenv()

class SmartQueryAgent:
    """
    Smart Query Agent that first checks hardcoded queries, then generates SQL based on schema
    """
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.openai_api_key:
            print("Warning: OPENAI_API_KEY not found in environment variables.")
            return
        
        # Initialize database connection
        self._init_database()
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0,
            openai_api_key=self.openai_api_key,
            max_tokens=4000
        )
        
        # Initialize conversation context
        self.conversation_context = {
            "current_topic": None,
            "last_query_type": None,
            "referenced_entities": set(),
            "time_context": None,
            "filters_applied": [],
            "specific_values": {}
        }
        
        # Create processing chains
        self._create_chains()
    
    def _init_database(self):
        """Initialize database connection"""
        server = os.getenv("DB_SERVER", "localhost")
        database = os.getenv("DB_NAME", "MumsAndBabies4SUTD")
        username = os.getenv("DB_USER", "")
        password = os.getenv("DB_PASSWORD", "")
        
        if username and password:
            self.database_uri = f"mssql+pyodbc://{username}:{password}@{server}/{database}?driver=ODBC+Driver+18+for+SQL+Server&Connection+Timeout=30&Command+Timeout=60&TrustServerCertificate=yes"
        else:
            self.database_uri = f"mssql+pyodbc://@{server}/{database}?driver=ODBC+Driver+18+for+SQL+Server&trusted_connection=yes&Connection+Timeout=30&Command+Timeout=60&TrustServerCertificate=yes"
        
        self.db = SQLDatabase.from_uri(
            self.database_uri,
            include_tables=[],
            sample_rows_in_table_info=0,
            max_string_length=1000
        )
        self.db._dialect = "mssql"
    
    def _create_chains(self):
        """Create processing chains for smart query processing"""
        
        # 1. Context Analysis Chain
        self.context_analysis_chain = self._create_context_analysis_chain()
        
        # 2. SQL Generation Chain
        self.sql_generation_chain = self._create_sql_generation_chain()
        
        # 3. Response Generation Chain
        self.response_generation_chain = self._create_response_generation_chain()
        
        # 4. Validation Chain
        self.validation_chain = self._create_validation_chain()
    
    def _create_context_analysis_chain(self):
        """Create context analysis chain"""
        template = """
        You are a query analysis expert for MumsAndBabies4SUTD CRM system. Analyze the user's query and extract key information.
        
        User Query: {query}
        Conversation History: {chat_history}
        Current Context: {current_context}
        
        Database Schema Overview:
        
        1. pos_haud (Transaction Header) - One row per invoice/receipt
           - sa_transacno: Transaction number (primary key)
           - cas_name, sa_custno, sa_custname: Cashier + Customer info
           - sa_date, sa_time, sa_postdate: Transaction timestamps
           - sa_totamt, sa_totQty, sa_totdisc, sa_totgst, sa_totservice: Totals
           - sa_depositAmt, sa_chargeAmt, sa_TransacAmt: Amounts breakdown
           - sa_status, IsVoid, Void_RefNo: Transaction status
           - Total_Outstanding, Total_Prepaid_Amt, Total_Voucher_Avalable: Customer balances
           - Trans_User_Login, sa_staffname: Staff / user handling transaction
           - ItemSite_Code: Outlet/store reference
        
        2. pos_daud (Transaction Details) - Line items per transaction
           - dt_no: Primary key (line ID)
           - sa_transacno: Transaction number (links to pos_haud)
           - dt_itemno, dt_itemdesc, dt_qty, dt_price, dt_amt: Item details
           - dt_discAmt, dt_discPercent, dt_discDesc: Discounts
           - dt_Staffno, dt_StaffName: Staff handling the line
           - Next_Payment, Next_Appt: Future payment/appointment info
           - GST_Amt_Collect, dt_GrossAmt: Tax and gross amounts
           - ItemSite_Code: Outlet/store reference
        
        3. pos_taud (Transaction Payments) - Payment details per transaction
           - pay_no: Payment record ID
           - sa_transacno: Transaction number (links to pos_haud)
           - pay_group, pay_type, pay_Desc: Payment classification (cash, VISA, etc.)
           - pay_tendamt, pay_actamt, pay_amt, billable_amount: Payment amounts
           - Pay_GST_Amt_Collect, tax, subtotal: Tax & breakdown
           - is_voucher, voucher_amt, Voucher_No: Voucher info
           - points, prepaid, credit_debit: Loyalty/prepaid handling
           - ItemSite_Code: Outlet/store reference
        
        Key Relationships:
        - pos_haud.sa_transacno = pos_daud.sa_transacno = pos_taud.sa_transacno
        - For payment analysis: Use pos_taud table
        - For product analysis: Use pos_daud table
        - For transaction summary: Use pos_haud table
        
        Analyze and extract:
        1. Query Intent (what the user wants to know)
        2. Payment Types Mentioned (VISA, MasterCard, Cash, etc.)
        3. Time Context (specific dates, periods, relative time)
        4. Outlet Context (specific outlets or all)
        5. Query Type (payment analysis, product analysis, transaction summary)
        6. Specific Values (exact values mentioned)
        
        Respond in JSON format:
        {{
            "intent": "clear description of what user wants",
            "payment_types": ["VISA", "MasterCard", "Cash"],
            "time_context": "specific time period or relative time",
            "outlet_context": "specific outlets or all",
            "query_type": "payment_analysis|product_analysis|transaction_summary|combined",
            "specific_values": {{
                "payment_types": ["VISA", "MasterCard"],
                "outlets": ["MB01", "MB02"],
                "amounts": [100, 500],
                "customers": ["John Smith"]
            }},
            "confidence": 0.0-1.0
        }}
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()
    
    def _create_sql_generation_chain(self):
        """Create SQL generation chain"""
        template = """
        You are a SQL expert for MumsAndBabies4SUTD CRM database. Generate an accurate SQL query based on the context analysis.
        
        Database Schema:
        {schema}
        
        Context Analysis: {context_analysis}
        User Query: {query}
        Conversation History: {chat_history}
        
        CRITICAL: Use the correct table based on query type:
        
        1. For Payment Analysis (VISA, MasterCard, Cash, etc.):
           - Use pos_taud table
           - Filter by pay_type = 'VISA' or pay_type LIKE '%VISA%'
           - Group by pay_type for payment type summaries
           - Use pay_actamt for payment amounts
        
        2. For Product Analysis (top selling products, product performance):
           - Use pos_daud table
           - Group by dt_itemdesc or dt_itemno
           - Use dt_qty for quantities, dt_amt for amounts
        
        3. For Transaction Summary (customer balances, transaction totals):
           - Use pos_haud table
           - Use sa_TransacAmt for transaction amounts
           - Use Total_Outstanding for customer balances
        
        4. For Combined Analysis (full invoice view):
           - JOIN all three tables on sa_transacno
           - pos_haud h INNER JOIN pos_daud d ON h.sa_transacno = d.sa_transacno
           - pos_haud h INNER JOIN pos_taud t ON h.sa_transacno = t.sa_transacno
        
        SQL Server Requirements:
        - Use TOP N instead of LIMIT N
        - Use ISNULL() instead of COALESCE()
        - Use dbo. prefix for all tables
        - Use proper date functions (GETDATE(), DATEADD(), etc.)
        - Filter active records (sa_status = 'Active', IsVoid = 0)
        - Use proper JOINs for related data
        
        Generate ONLY the SQL query, no explanations:
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()
    
    def _create_response_generation_chain(self):
        """Create response generation chain"""
        template = """
        You are a business intelligence analyst for MumsAndBabies4SUTD. Generate a comprehensive response based on the query results.
        
        User Query: {query}
        Context Analysis: {context_analysis}
        SQL Query: {sql_query}
        Query Results: {query_results}
        Conversation History: {chat_history}
        
        Guidelines:
        1. Provide clear, business-focused insights
        2. Format numbers and data professionally
        3. Highlight key findings and trends
        4. If specific payment types were filtered (like VISA), mention this clearly
        5. Suggest relevant follow-up questions
        6. Use context to make responses more relevant
        7. If no results, explain why and suggest alternatives
        8. Focus on payment type insights when relevant
        
        Response:
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()
    
    def _create_validation_chain(self):
        """Create validation chain to check if results match user intent"""
        template = """
        You are a data validation expert. Analyze if the SQL query results match the user's intent.
        
        User Query: {query}
        Context Analysis: {context_analysis}
        SQL Query: {sql_query}
        Query Results: {query_results}
        
        Validation Criteria:
        1. Does the data match what the user asked for?
        2. Are the correct payment types included (if mentioned)?
        3. Are the correct tables used?
        4. Are the filters appropriate?
        5. Is the data format what the user expected?
        
        Respond in JSON format:
        {{
            "is_valid": true/false,
            "confidence": 0.0-1.0,
            "issues": ["list of issues if any"],
            "suggestions": ["suggestions for improvement"],
            "explanation": "brief explanation of validation result"
        }}
        """
        
        prompt = ChatPromptTemplate.from_template(template)
        return prompt | self.llm | StrOutputParser()
    
    def _analyze_query_context(self, query: str) -> Dict[str, Any]:
        """Analyze query context"""
        try:
            context_input = {
                "query": query,
                "chat_history": self._format_chat_history(),
                "current_context": self._get_current_context()
            }
            
            analysis = self.context_analysis_chain.invoke(context_input)
            
            # Parse JSON response
            try:
                context_data = json.loads(analysis)
                return context_data
            except json.JSONDecodeError:
                # Fallback parsing
                return self._parse_context_fallback(query, analysis)
                
        except Exception as e:
            print(f"Context analysis error: {e}")
            return self._extract_context_fallback(query)
    
    def _parse_context_fallback(self, query: str, analysis: str) -> Dict[str, Any]:
        """Fallback context parsing"""
        # Extract specific values from query
        specific_values = self._extract_specific_values_from_query(query)
        
        return {
            "intent": analysis.split("intent:")[1].split("\n")[0].strip() if "intent:" in analysis else query,
            "payment_types": self._extract_payment_types(query),
            "time_context": None,
            "outlet_context": "all",
            "query_type": self._determine_query_type(query),
            "specific_values": specific_values,
            "confidence": 0.7
        }
    
    def _extract_specific_values_from_query(self, query: str) -> Dict[str, List[str]]:
        """Extract specific values from query"""
        query_lower = query.lower()
        specific_values = {
            "payment_types": [],
            "outlets": [],
            "amounts": [],
            "customers": []
        }
        
        # Payment types
        payment_keywords = ["visa", "mastercard", "master card", "cash", "credit card", "debit card", "paypal", "bank transfer"]
        for payment in payment_keywords:
            if payment in query_lower:
                specific_values["payment_types"].append(payment.upper())
        
        # Amounts
        amount_pattern = r'\$?(\d+(?:,\d{3})*(?:\.\d{2})?)'
        amounts = re.findall(amount_pattern, query)
        specific_values["amounts"] = amounts
        
        # Outlet codes
        outlet_pattern = r'\b(MB\d+|OUTLET\s*\d+|\b[A-Z]{2}\d+)\b'
        outlets = re.findall(outlet_pattern, query, re.IGNORECASE)
        specific_values["outlets"] = [outlet.upper() for outlet in outlets]
        
        return specific_values
    
    def _extract_payment_types(self, query: str) -> List[str]:
        """Extract payment types from query"""
        query_lower = query.lower()
        payment_types = []
        
        payment_keywords = ["visa", "mastercard", "master card", "cash", "credit card", "debit card", "paypal", "bank transfer"]
        for payment in payment_keywords:
            if payment in query_lower:
                payment_types.append(payment.upper())
        
        return payment_types
    
    def _determine_query_type(self, query: str) -> str:
        """Determine query type based on content"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ["payment", "pay", "visa", "mastercard", "cash", "credit card"]):
            return "payment_analysis"
        elif any(word in query_lower for word in ["product", "item", "selling", "top", "best"]):
            return "product_analysis"
        elif any(word in query_lower for word in ["transaction", "invoice", "receipt", "balance"]):
            return "transaction_summary"
        else:
            return "combined"
    
    def _extract_context_fallback(self, query: str) -> Dict[str, Any]:
        """Fallback context extraction"""
        specific_values = self._extract_specific_values_from_query(query)
        
        return {
            "intent": query,
            "payment_types": self._extract_payment_types(query),
            "time_context": None,
            "outlet_context": "all",
            "query_type": self._determine_query_type(query),
            "specific_values": specific_values,
            "confidence": 0.5
        }
    
    def _generate_sql_query(self, query: str, context_analysis: Dict[str, Any]) -> str:
        """Generate SQL query"""
        try:
            sql_input = {
                "query": query,
                "context_analysis": json.dumps(context_analysis),
                "chat_history": self._format_chat_history(),
                "schema": self._get_database_schema()
            }
            
            sql_query = self.sql_generation_chain.invoke(sql_input)
            
            # Clean up the SQL query
            sql_query = self._clean_sql_query(sql_query)
            
            return sql_query
            
        except Exception as e:
            print(f"SQL generation error: {e}")
            return None
    
    def _get_database_schema(self) -> str:
        """Get database schema information"""
        try:
            table_info = self.db.get_table_info()
            return f"""
            MumsAndBabies4SUTD CRM Database Schema:
            
            {table_info}
            
            Key Tables for Analysis:
            
            1. pos_haud (Transaction Header) - One row per invoice/receipt
               - sa_transacno: Transaction number (primary key)
               - cas_name, sa_custno, sa_custname: Cashier + Customer info
               - sa_date, sa_time, sa_postdate: Transaction timestamps
               - sa_totamt, sa_totQty, sa_totdisc, sa_totgst, sa_totservice: Totals
               - sa_depositAmt, sa_chargeAmt, sa_TransacAmt: Amounts breakdown
               - sa_status, IsVoid, Void_RefNo: Transaction status
               - Total_Outstanding, Total_Prepaid_Amt, Total_Voucher_Avalable: Customer balances
               - Trans_User_Login, sa_staffname: Staff / user handling transaction
               - ItemSite_Code: Outlet/store reference
            
            2. pos_daud (Transaction Details) - Line items per transaction
               - dt_no: Primary key (line ID)
               - sa_transacno: Transaction number (links to pos_haud)
               - dt_itemno, dt_itemdesc, dt_qty, dt_price, dt_amt: Item details
               - dt_discAmt, dt_discPercent, dt_discDesc: Discounts
               - dt_Staffno, dt_StaffName: Staff handling the line
               - Next_Payment, Next_Appt: Future payment/appointment info
               - GST_Amt_Collect, dt_GrossAmt: Tax and gross amounts
               - ItemSite_Code: Outlet/store reference
            
            3. pos_taud (Transaction Payments) - Payment details per transaction
               - pay_no: Payment record ID
               - sa_transacno: Transaction number (links to pos_haud)
               - pay_group, pay_type, pay_Desc: Payment classification (cash, VISA, etc.)
               - pay_tendamt, pay_actamt, pay_amt, billable_amount: Payment amounts
               - Pay_GST_Amt_Collect, tax, subtotal: Tax & breakdown
               - is_voucher, voucher_amt, Voucher_No: Voucher info
               - points, prepaid, credit_debit: Loyalty/prepaid handling
               - ItemSite_Code: Outlet/store reference
            
            Key Relationships:
            - pos_haud.sa_transacno = pos_daud.sa_transacno = pos_taud.sa_transacno
            - For payment analysis: Use pos_taud table
            - For product analysis: Use pos_daud table
            - For transaction summary: Use pos_haud table
            """
        except Exception as e:
            print(f"Error getting schema: {e}")
            return "Database schema not available"
    
    def _clean_sql_query(self, sql_query: str) -> str:
        """Clean and validate SQL query"""
        # Remove markdown code blocks
        sql_query = re.sub(r'```sql\s*', '', sql_query)
        sql_query = re.sub(r'```\s*', '', sql_query)
        
        # Remove extra whitespace
        sql_query = ' '.join(sql_query.split())
        
        # Ensure it ends with semicolon
        if not sql_query.endswith(';'):
            sql_query += ';'
        
        return sql_query
    
    def _execute_query(self, sql_query: str) -> Any:
        """Execute SQL query and return results"""
        try:
            results = self.db.run(sql_query)
            return results
        except Exception as e:
            print(f"Query execution error: {e}")
            return f"Error executing query: {str(e)}"
    
    def _validate_results(self, query: str, context_analysis: Dict[str, Any], 
                         sql_query: str, query_results: Any) -> Dict[str, Any]:
        """Validate if results match user intent"""
        try:
            validation_input = {
                "query": query,
                "context_analysis": json.dumps(context_analysis),
                "sql_query": sql_query,
                "query_results": str(query_results)
            }
            
            validation_result = self.validation_chain.invoke(validation_input)
            
            # Parse JSON response
            try:
                validation_data = json.loads(validation_result)
                return validation_data
            except json.JSONDecodeError:
                # Fallback validation
                return {
                    "is_valid": True,
                    "confidence": 0.7,
                    "issues": [],
                    "suggestions": [],
                    "explanation": "Validation completed with fallback parsing"
                }
                
        except Exception as e:
            print(f"Validation error: {e}")
            return {
                "is_valid": True,
                "confidence": 0.5,
                "issues": [],
                "suggestions": [],
                "explanation": f"Validation error: {str(e)}"
            }
    
    def _generate_response(self, query: str, context_analysis: Dict[str, Any], 
                          sql_query: str, query_results: Any, validation_result: Dict[str, Any]) -> str:
        """Generate natural language response with validation feedback"""
        try:
            response_input = {
                "query": query,
                "context_analysis": json.dumps(context_analysis),
                "sql_query": sql_query,
                "query_results": str(query_results),
                "chat_history": self._format_chat_history(),
                "validation_result": json.dumps(validation_result)
            }
            
            # Enhanced response template with validation feedback
            enhanced_template = """
            You are a business intelligence analyst for MumsAndBabies4SUTD. Generate a comprehensive response based on the query results.
            
            User Query: {query}
            Context Analysis: {context_analysis}
            SQL Query: {sql_query}
            Query Results: {query_results}
            Validation Result: {validation_result}
            Conversation History: {chat_history}
            
            Guidelines:
            1. Provide clear, business-focused insights
            2. Format numbers and data professionally
            3. Highlight key findings and trends
            4. If specific payment types were filtered (like VISA), mention this clearly
            5. Suggest relevant follow-up questions
            6. Use context to make responses more relevant
            7. If no results, explain why and suggest alternatives
            8. Focus on payment type insights when relevant
            9. If validation shows issues, acknowledge them and provide corrected insights
            10. Include validation confidence in your response
            
            Response:
            """
            
            prompt = ChatPromptTemplate.from_template(enhanced_template)
            chain = prompt | self.llm | StrOutputParser()
            
            response = chain.invoke(response_input)
            return response
            
        except Exception as e:
            print(f"Response generation error: {e}")
            return f"Error generating response: {str(e)}"
    
    def _update_context(self, context_analysis: Dict[str, Any], query: str):
        """Update conversation context based on analysis"""
        self.conversation_context["current_topic"] = context_analysis.get("intent", "")
        self.conversation_context["last_query_type"] = context_analysis.get("query_type", "")
        
        # Update referenced entities
        entities = context_analysis.get("entities", [])
        self.conversation_context["referenced_entities"].update(entities)
        
        # Update specific values
        specific_values = context_analysis.get("specific_values", {})
        for key, values in specific_values.items():
            if values:
                self.conversation_context["specific_values"][key] = values
        
        # Update time context
        time_context = context_analysis.get("time_context")
        if time_context:
            self.conversation_context["time_context"] = time_context
        
        # Update filters
        filters = context_analysis.get("filters", [])
        self.conversation_context["filters_applied"].extend(filters)
    
    def _format_chat_history(self) -> str:
        """Format conversation history for context"""
        if not hasattr(self, 'chat_history'):
            return "No previous conversation."
        
        if not self.chat_history:
            return "No previous conversation."
        
        formatted = []
        for message in self.chat_history[-6:]:  # Last 6 messages
            if isinstance(message, HumanMessage):
                formatted.append(f"User: {message.content}")
            elif isinstance(message, AIMessage):
                formatted.append(f"Assistant: {message.content}")
        
        return "\n".join(formatted)
    
    def _get_current_context(self) -> str:
        """Get current conversation context summary"""
        context_parts = []
        
        if self.conversation_context["current_topic"]:
            context_parts.append(f"Current topic: {self.conversation_context['current_topic']}")
        
        if self.conversation_context["referenced_entities"]:
            entities = list(self.conversation_context["referenced_entities"])[-5:]  # Last 5 entities
            context_parts.append(f"Referenced entities: {', '.join(entities)}")
        
        if self.conversation_context["specific_values"]:
            specific_values = []
            for key, values in self.conversation_context["specific_values"].items():
                if values:
                    specific_values.append(f"{key}: {', '.join(values)}")
            if specific_values:
                context_parts.append(f"Specific values: {', '.join(specific_values)}")
        
        if self.conversation_context["time_context"]:
            context_parts.append(f"Time context: {self.conversation_context['time_context']}")
        
        return "; ".join(context_parts) if context_parts else "No specific context"
    
    def query(self, question: str) -> str:
        """Main query processing method with validation and debugging"""
        try:
            if not self.openai_api_key:
                return "Error: OpenAI API key not configured."
            
            # Initialize chat history if not exists
            if not hasattr(self, 'chat_history'):
                self.chat_history = []
            
            # Add user question to history
            self.chat_history.append(HumanMessage(content=question))
            
            print(f"🔍 Analyzing query: {question}")
            
            # 1. Analyze query context
            context_analysis = self._analyze_query_context(question)
            print(f"📊 Context analysis: {context_analysis}")
            
            # 2. Generate SQL query
            sql_query = self._generate_sql_query(question, context_analysis)
            if not sql_query:
                return "Error: Could not generate SQL query."
            
            print(f"🔧 Generated SQL: {sql_query}")
            print(f"🔧 SQL Query (for debugging): {sql_query}")
            
            # 3. Execute SQL query
            query_results = self._execute_query(sql_query)
            print(f"📈 Query results: {str(query_results)[:200]}...")
            
            # 4. Validate results against user intent
            validation_result = self._validate_results(question, context_analysis, sql_query, query_results)
            print(f"✅ Validation result: {validation_result}")
            
            # 5. Generate response with validation feedback
            response = self._generate_response(question, context_analysis, sql_query, query_results, validation_result)
            
            # 6. Update context
            self._update_context(context_analysis, question)
            
            # 7. Add response to history
            self.chat_history.append(AIMessage(content=response))
            
            # 8. Add debugging information to response
            debug_info = f"\n\n--- DEBUGGING INFO ---\n"
            debug_info += f"SQL Query Used: {sql_query}\n"
            debug_info += f"Validation: {'✅ Valid' if validation_result.get('is_valid', True) else '❌ Issues Found'}\n"
            debug_info += f"Confidence: {validation_result.get('confidence', 0.0):.2f}\n"
            if validation_result.get('issues'):
                debug_info += f"Issues: {', '.join(validation_result['issues'])}\n"
            if validation_result.get('suggestions'):
                debug_info += f"Suggestions: {', '.join(validation_result['suggestions'])}\n"
            debug_info += f"Explanation: {validation_result.get('explanation', 'No explanation provided')}\n"
            debug_info += f"--- END DEBUGGING ---"
            
            return response + debug_info
            
        except Exception as e:
            error_msg = f"Error processing query: {str(e)}"
            print(error_msg)
            if hasattr(self, 'chat_history'):
                self.chat_history.append(AIMessage(content=error_msg))
            return error_msg
    
    def clear_context(self):
        """Clear conversation context and history"""
        self.conversation_context = {
            "current_topic": None,
            "last_query_type": None,
            "referenced_entities": set(),
            "time_context": None,
            "filters_applied": [],
            "specific_values": {}
        }
        if hasattr(self, 'chat_history'):
            self.chat_history = []
        print("Context and conversation history cleared")
    
    def get_context_summary(self) -> Dict[str, Any]:
        """Get current context summary"""
        return {
            "conversation_context": self.conversation_context,
            "history_length": len(self.chat_history) if hasattr(self, 'chat_history') else 0,
            "last_messages": self.chat_history[-3:] if hasattr(self, 'chat_history') and self.chat_history else []
        }

# Global instance
smart_query_agent = None
