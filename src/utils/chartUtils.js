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

export const formatChartData = (chartData, chartType) => {
  // Normalize type guard
  const t = (chartType || '').toLowerCase();

  // Heuristic: point-based datasets use objects like {x,y} or {x,y,r}
  const isPointBased = Array.isArray(chartData?.datasets)
    && chartData.datasets.some(ds =>
      Array.isArray(ds?.data) &&
      ds.data.some(pt => pt && typeof pt === 'object' && ('x' in pt) && ('y' in pt))
    );

  // Enforce labels only for non point-based types
  const needsLabels = !isPointBased && !['scatter', 'bubble'].includes(t);
  if (needsLabels && !chartData?.labels) {
    throw new Error('Invalid chart data structure');
  }

  const defaultColors = [
    '#4b5563', // Dark gray
    '#10a37f', // Green
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
  ];

  const toRgba = (hex, alpha = 0.2) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return {
    ...chartData,
    datasets: (chartData.datasets || []).map((dataset, index) => {
      const baseColor = defaultColors[index % defaultColors.length];

      // Derive backgroundColor if missing
      let backgroundColor = dataset.backgroundColor;
      if (!backgroundColor) {
        if (Array.isArray(dataset.borderColor)) {
          backgroundColor = dataset.borderColor.map(c =>
            typeof c === 'string' && c.startsWith('#') ? toRgba(c, 0.2)
              : (typeof c === 'string' && c.startsWith('rgb'))
                ? c.replace('rgb', 'rgba').replace(')', ', 0.2)')
                : toRgba(baseColor, 0.2)
          );
        } else if (typeof dataset.borderColor === 'string') {
          backgroundColor = dataset.borderColor.startsWith('#')
            ? toRgba(dataset.borderColor, 0.2)
            : dataset.borderColor.replace('rgb', 'rgba').replace(')', ', 0.2)');
        } else {
          backgroundColor = toRgba(baseColor, 0.2);
        }
      }

      return {
        label: dataset.label ?? `Series ${index + 1}`, // helps react-chartjs-2 differentiate datasets [web:35]
        borderColor: dataset.borderColor || baseColor,
        backgroundColor,
        ...dataset
      };
    }),
  };
};



