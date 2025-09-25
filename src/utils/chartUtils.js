// Utility functions for handling chart data in chat messages

export const extractChartData = (text) => {
  try {
    // Handle null/undefined text
    if (!text || typeof text !== 'string') {
      return { hasChart: false };
    }

    // Look for JSON code blocks in the text
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1].trim();
      const parsedData = JSON.parse(jsonString);
      
      // Check if it's chart data
      if (parsedData && parsedData.type === 'chart' && parsedData.chartData) {
        return {
          chartData: parsedData.chartData,
          chartType: parsedData.chartType || 'line',
          hasChart: true,
        };
      }
    }
    
    return { hasChart: false };
  } catch (error) {
    console.error('Error parsing chart data:', error);
    return { hasChart: false };
  }
};

export const extractTextWithoutChart = (text) => {
  try {
    // Handle null/undefined text
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Remove the JSON code block from the text
    const textWithoutJson = text.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
    return textWithoutJson;
  } catch (error) {
    console.error('Error extracting text without chart:', error);
    return text || '';
  }
};

export const formatChartData = (chartData) => {
  // Ensure the chart data has the required structure
  if (!chartData.labels) {
    throw new Error('Invalid chart data structure');
  }

  // Set default colors if not provided
  const defaultColors = [
    '#4b5563', // Dark gray
    '#10a37f', // Green
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
  ];

  const formattedData = {
    ...chartData,
    datasets: chartData.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: dataset.borderColor || defaultColors[index % defaultColors.length],
      backgroundColor: dataset.backgroundColor || 
        (dataset.borderColor ? 
          dataset.borderColor.replace('rgb', 'rgba').replace(')', ', 0.2)') : 
          defaultColors[index % defaultColors.length].replace('#', 'rgba(').replace(/(.{2})(.{2})(.{2})/, '$1, $2, $3, 0.2)')
        ),
    })),
  };

  return formattedData;
};
