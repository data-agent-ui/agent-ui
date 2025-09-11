# API Response Formats Specification

## Overview

This document defines the standardized response formats that the `/api/chat/stream` endpoint should support to work seamlessly with the React UI. The UI currently supports **Markdown**, **Interactive Charts**, and is designed to be extensible for future data formats.

## Base Response Structure

All responses from `/api/chat/stream` should follow this base structure:

### Streaming Response Format
```
data: {"type": "chunk", "content": "partial content"}
data: {"type": "chunk", "content": "more content"}
data: {"type": "complete", "response": "full response content", "chart": {...}}
```

### Non-Streaming Response Format
```json
{
  "response": "complete response content",
  "chart": { /* optional chart data */ },
  "table": { /* optional table data */ },
  "map": { /* optional map data */ }
}
```

### Key Principles
- **No nested JSON**: Avoid embedding JSON strings within JSON
- **Separate fields**: Use dedicated fields for different content types
- **Clean structure**: Easy to parse and validate
- **Extensible**: Easy to add new content types

## Supported Response Types

### 1. 📝 **Plain Text Response**
**Use Case**: Simple text responses, explanations, Q&A

**API Response**:
```json
{
  "response": "This is a simple text response that will be displayed as plain text in the UI."
}
```

**UI Rendering**: Displays as plain text with basic formatting.

---

### 2. 📄 **Markdown Response**
**Use Case**: Rich text formatting, documentation, structured content

**API Response**:
```json
{
  "response": "# Sales Analysis Report\n\n## Overview\n\nHere's the analysis you requested:\n\n### Key Findings\n\n- **Revenue Growth**: 15% increase this quarter\n- **Customer Satisfaction**: 4.8/5 rating\n- **Market Share**: 23% of total market\n\n### Recommendations\n\n1. **Focus on customer retention**\n2. **Expand to new markets**\n3. **Invest in product development**\n\n> **Important**: Review these findings with the team by Friday.\n\n---\n\n*Report generated on: 2024-01-15*"
}
```

**UI Rendering**: 
- Headers (H1, H2, H3)
- Bold and italic text
- Lists (ordered and unordered)
- Blockquotes
- Code blocks
- Tables
- Links (with security validation)

---

### 3. 📊 **Chart Response**
**Use Case**: Data visualization, analytics, performance metrics

**API Response**:
```json
{
  "response": "# Sales Performance Analysis\n\nHere's the sales data you requested:\n\n## Analysis\n\nThe data shows significant variation in monthly sales with February being the peak month.",
  "chart": {
    "type": "line",
    "chartData": {
      "title": "Monthly Sales Performance",
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      "datasets": [
        {
          "label": "Sales",
          "data": [12000, 19000, 3000, 5000, 2000, 8000],
          "borderColor": "rgb(75, 192, 192)",
          "backgroundColor": "rgba(75, 192, 192, 0.2)"
        }
      ]
    }
  }
}
```

**Supported Chart Types**:
- `line` - Line charts for trends
- `bar` - Bar charts for comparisons
- `doughnut` - Doughnut charts for proportions
- `pie` - Pie charts for distributions

**Chart Data Structure**:
```json
{
  "type": "line|bar|doughnut|pie",
  "chartData": {
    "title": "Chart Title",
    "labels": ["Label1", "Label2", "Label3"],
    "datasets": [
      {
        "label": "Dataset Label",
        "data": [10, 20, 30],
        "borderColor": "rgb(75, 192, 192)",
        "backgroundColor": "rgba(75, 192, 192, 0.2)"
      }
    ]
  }
}
```

**UI Rendering**: Interactive Chart.js visualization with dark theme styling.

---

### 4. 🔄 **Mixed Content Response**
**Use Case**: Combining multiple formats in a single response

**API Response**:
```json
{
  "response": "# Comprehensive Analysis\n\n## Executive Summary\n\nOur analysis reveals several key insights:\n\n### Key Metrics\n\n| Metric | Q1 | Q2 | Q3 | Q4 |\n|--------|----|----|----|----|\n| Revenue | $100K | $120K | $110K | $130K |\n| Growth | - | +20% | -8% | +18% |\n\n### Recommendations\n\n1. **Maintain Q4 momentum** into next year\n2. **Address Q3 decline** with targeted strategies\n3. **Scale successful Q2 approaches**\n\n> **Next Steps**: Schedule review meeting for next week.",
  "chart": {
    "type": "bar",
    "chartData": {
      "title": "Quarterly Performance",
      "labels": ["Q1", "Q2", "Q3", "Q4"],
      "datasets": [
        {
          "label": "Revenue",
          "data": [100000, 120000, 110000, 130000],
          "borderColor": "rgb(34, 197, 94)",
          "backgroundColor": "rgba(34, 197, 94, 0.2)"
        }
      ]
    }
  }
}
```

**UI Rendering**: 
- Markdown content rendered with full formatting
- Chart displayed as interactive visualization
- Tables formatted with proper styling

---

## Future Extensible Formats

### 5. 📋 **Table Response** (Future)
**Use Case**: Structured data display, reports, comparisons

**Proposed API Response**:
```json
{
  "response": "# Data Report\n\nThis table shows the current performance metrics.",
  "table": {
    "title": "Employee Performance",
    "headers": ["Name", "Department", "Score", "Status"],
    "rows": [
      ["John Doe", "Engineering", "95", "Excellent"],
      ["Jane Smith", "Marketing", "87", "Good"],
      ["Bob Johnson", "Sales", "92", "Excellent"]
    ]
  }
}
```

### 6. 🗺️ **Map Response** (Future)
**Use Case**: Geographic data, location-based analytics

**Proposed API Response**:
```json
{
  "response": "# Geographic Analysis\n\nRegional performance analysis.",
  "map": {
    "title": "Sales by Region",
    "type": "choropleth",
    "data": [
      {"region": "North America", "value": 150000, "color": "#10a37f"},
      {"region": "Europe", "value": 120000, "color": "#3b82f6"},
      {"region": "Asia", "value": 80000, "color": "#f59e0b"}
    ]
  }
}
```

### 7. 📈 **Dashboard Response** (Future)
**Use Case**: Multiple widgets, comprehensive dashboards

**Proposed API Response**:
```json
{
  "response": "# Executive Dashboard\n\nComprehensive performance overview.",
  "dashboard": {
    "title": "Q4 Performance Dashboard",
    "widgets": [
      {
        "type": "metric",
        "title": "Total Revenue",
        "value": "$1.2M",
        "change": "+15%"
      },
      {
        "type": "chart",
        "chartType": "line",
        "title": "Monthly Trends",
        "data": {
          "labels": ["Jan", "Feb", "Mar"],
          "datasets": [{"label": "Revenue", "data": [100, 120, 110]}]
        }
      }
    ]
  }
}
```

---

## Security Considerations

### Input Validation
- **JSON Size Limit**: Maximum 1MB per response
- **Content Length**: Maximum 10,000 characters per response
- **Chart Data Validation**: Validate chart structure and data types
- **Color Validation**: Only allow safe color formats (hex, rgb, rgba)
- **No Nested JSON**: Avoid embedding JSON strings within JSON

### XSS Prevention
- **HTML Sanitization**: All markdown content sanitized
- **URL Validation**: Links validated for safe protocols
- **Script Prevention**: No executable code in responses
- **Clean Structure**: Separate fields prevent injection attacks

### Data Validation
```javascript
// Example validation structure
const validateResponse = {
  maxSize: 1024 * 1024, // 1MB
  maxLength: 10000, // 10K characters
  allowedChartTypes: ['line', 'bar', 'doughnut', 'pie'],
  allowedColorFormats: /^(#[0-9a-fA-F]{3,6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\))$/,
  requiredFields: ['response'],
  optionalFields: ['chart', 'table', 'map', 'dashboard']
};
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": "Additional error details (optional)"
}
```

### Common Error Scenarios
- **Invalid JSON**: Malformed response structure
- **Unsupported Format**: Unknown content type
- **Size Exceeded**: Response too large
- **Validation Failed**: Invalid data structure
- **Nested JSON**: Embedded JSON strings detected
- **Missing Required Fields**: Required fields not present

---

## Implementation Guidelines

### For API Developers
1. **Always validate** response data before sending
2. **Use separate fields** for different content types (no nested JSON)
3. **Implement proper** error handling and logging
4. **Test with** various response formats
5. **Document** any new response types
6. **Follow the clean structure** with dedicated fields for each content type

### For UI Developers
1. **Handle gracefully** unknown response types
2. **Implement fallbacks** for parsing errors
3. **Validate** all response data
4. **Provide user feedback** for errors
5. **Maintain backward** compatibility
6. **Update components** to handle new field structure (response, chart, table, etc.)

---

## Testing Examples

### Test Case 1: Simple Markdown
```bash
curl -X POST http://localhost:5000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a markdown report about our sales"}'
```

### Test Case 2: Chart with Markdown
```bash
curl -X POST http://localhost:5000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me a chart of monthly sales with analysis"}'
```

**Expected Response Structure**:
```json
{
  "response": "# Sales Analysis\n\nHere's the monthly sales data:",
  "chart": {
    "type": "line",
    "chartData": {
      "title": "Monthly Sales",
      "labels": ["Jan", "Feb", "Mar"],
      "datasets": [{"label": "Sales", "data": [100, 150, 120]}]
    }
  }
}
```

### Test Case 3: Mixed Content
```bash
curl -X POST http://localhost:5000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a comprehensive report with charts and tables"}'
```

**Expected Response Structure**:
```json
{
  "response": "# Comprehensive Report\n\nAnalysis and recommendations:",
  "chart": {
    "type": "bar",
    "chartData": {...}
  },
  "table": {
    "title": "Summary Table",
    "headers": ["Metric", "Value"],
    "rows": [["Revenue", "$1M"], ["Growth", "+15%"]]
  }
}
```

---

## Version History

- **v1.0** - Initial specification with Markdown and Chart support
- **v1.1** - Added security considerations and validation
- **v1.2** - Added future extensible formats
- **v1.3** - Enhanced error handling and testing guidelines
- **v2.0** - **BREAKING CHANGE**: Removed nested JSON, implemented clean field structure

---

## Conclusion

This specification provides a robust foundation for API responses that work seamlessly with the React UI. The **clean field structure** eliminates nested JSON issues while maintaining security and performance standards. 

### Key Benefits of v2.0:
- ✅ **No nested JSON**: Eliminates parsing complexity and security risks
- ✅ **Clean structure**: Easy to parse and validate
- ✅ **Extensible**: Simple to add new content types
- ✅ **Secure**: Prevents injection attacks and parsing errors
- ✅ **Maintainable**: Clear separation of concerns

Future formats can be added as new top-level fields without breaking existing functionality.
