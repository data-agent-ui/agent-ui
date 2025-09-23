export const generateMockApiResponse = () => ({
    role: 'assistant',
    response: "Report completed successfully\n\nTotal Records: 41\nColumns: Outlet, Payment_Type, Num_Transactions, Num_New_Sales, Num_Balance_Payments, New_Sales_Amount, Balance_Paid_Amount, Total_Amount, pay_GST, Tax_Collected, Net_Amount\nSample Data: {'Outlet': 'MB01', 'Payment_Type': 'VISA', 'Num_Transactions': 846, 'Num_New_Sales': 0, 'Num_Balance_Payments': 0, 'New_Sales_Amount': 0.0, 'Balance_Paid_Amount': 0.0, 'Total_Amount': 318360.61, 'pay_GST': 26172.60, 'Tax_Collected': 292188.01, 'Net_Amount': 292188.01}",
    table: {
        title: "Collection Report by Payment Type",
        columns: [
            "Outlet", "Payment_Type", "Num_Transactions", "Num_New_Sales", "Num_Balance_Payments",
            "New_Sales_Amount", "Balance_Paid_Amount", "Total_Amount", "pay_GST", "Tax_Collected", "Net_Amount"
        ],
        rows: [
            {
                "Outlet": "MB01",
                "Payment_Type": "VISA",
                "Num_Transactions": 846,
                "Num_New_Sales": 0,
                "Num_Balance_Payments": 0,
                "New_Sales_Amount": 0,
                "Balance_Paid_Amount": 0,
                "Total_Amount": 318360.61,
                "pay_GST": 26172.60,
                "Tax_Collected": 292188.01,
                "Net_Amount": 292188.01
            },
            {
                "Outlet": "MB01",
                "Payment_Type": "MASTER",
                "Num_Transactions": 664,
                "Num_New_Sales": 0,
                "Num_Balance_Payments": 0,
                "New_Sales_Amount": 0,
                "Balance_Paid_Amount": 0,
                "Total_Amount": 247653.25,
                "pay_GST": 20270.50,
                "Tax_Collected": 227382.75,
                "Net_Amount": 227382.75
            }
        ]
    },
    timestamp: Date.now()
});

export const generateMockLineChart = () => ({
    role: 'assistant',
    response: "## Monthly Sales Trend Analysis\n\nThe line chart shows sales performance over the past 6 months...",
    chart: {
        type: "line",
        chartData: {
            title: "Monthly Sales Performance",
            labels: ["January", "February", "March", "April", "May", "June"],
            datasets: [
                {
                    label: "Sales Revenue",
                    data: [12000, 19000, 3000, 5000, 8500, 14000],
                    borderColor: "#4b5563",
                    backgroundColor: "rgba(75, 85, 99, 0.2)",
                    tension: 0.4,
                    fill: true
                },
                {
                    label: "Target Revenue",
                    data: [10000, 15000, 12000, 13000, 11000, 16000],
                    borderColor: "#10a37f",
                    backgroundColor: "rgba(16, 163, 127, 0.1)",
                    borderDash: [5, 5],
                    fill: false
                }
            ]
        }
    },
    timestamp: Date.now()
});

export const generateMockBarChart = () => ({
    role: 'assistant',
    response: "## Payment Method Performance\n\nBar chart analysis of transaction volumes...",
    chart: {
        type: "bar",
        chartData: {
            title: "Transaction Volume by Payment Type",
            labels: ["VISA", "MASTER", "PREPAID", "AMEX", "DISCOVER", "CASH"],
            datasets: [
                {
                    label: "Transaction Count",
                    data: [846, 664, 311, 119, 89, 156],
                    backgroundColor: ["#4b5563", "#10a37f", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"],
                    borderColor: ["#374151", "#059669", "#dc2626", "#2563eb", "#d97706", "#7c3aed"],
                    borderWidth: 2
                }
            ]
        }
    },
    timestamp: Date.now()
});

export const generateMockDoughnutChart = () => ({
    role: 'assistant',
    response: "## Revenue Distribution by Category\n\nThe doughnut chart displays revenue allocation...",
    chart: {
        type: "doughnut",
        chartData: {
            title: "Revenue Distribution Analysis",
            labels: ["Electronics", "Clothing", "Books", "Home & Garden", "Sports", "Other"],
            datasets: [
                {
                    label: "Revenue %",
                    data: [35, 25, 15, 12, 8, 5],
                    backgroundColor: ["#4b5563", "#10a37f", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"],
                    borderColor: "#ffffff",
                    borderWidth: 3,
                    hoverOffset: 10
                }
            ]
        }
    },
    timestamp: Date.now()
});

export const generateMockPieChart = () => ({
    role: 'assistant',
    response: "## Market Share Analysis\n\nPie chart representation of market share distribution...",
    chart: {
        type: "pie",
        chartData: {
            title: "Market Share Distribution",
            labels: ["Our Company", "Competitor A", "Competitor B", "Competitor C", "Others"],
            datasets: [
                {
                    label: "Market Share %",
                    data: [28, 22, 18, 15, 17],
                    backgroundColor: ["#10a37f", "#4b5563", "#ef4444", "#3b82f6", "#f59e0b"],
                    borderColor: "#ffffff",
                    borderWidth: 2,
                    hoverBackgroundColor: ["#059669", "#374151", "#dc2626", "#2563eb", "#d97706"]
                }
            ]
        }
    },
    timestamp: Date.now()
});
