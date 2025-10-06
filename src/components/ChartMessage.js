import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadarController,
  PolarAreaController,
  ScatterController,
  BubbleController,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie, Radar, PolarArea, Scatter, Bubble } from 'react-chartjs-2';
import './ChartMessage.css';
import { lightTheme } from '../utils/chartThemes.js';

// Register all needed controllers/elements for v4 tree-shaking
ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadarController,
  PolarAreaController,
  ScatterController,
  BubbleController
);

const ChartMessage = ({ chartData, chartType = 'line' }) => {
  // Decide scales based on chart type (radial vs cartesian)
  const isRadial = chartType.toLowerCase() === 'radar' || chartType.toLowerCase() === 'polararea';

  const baseCartesianScales = {
    x: {
      ticks: {
        color: lightTheme.secondary,
        font: { size: 11, weight: '400' },
        padding: 8
      },
      grid: {
        color: lightTheme.border,
        borderColor: lightTheme.border,
        lineWidth: 1
      },
      border: { color: lightTheme.border, width: 1 }
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: lightTheme.secondary,
        font: { size: 11, weight: '400' },
        padding: 8
      },
      grid: {
        color: lightTheme.border,
        borderColor: lightTheme.border,
        lineWidth: 1
      },
      border: { color: lightTheme.border, width: 1 }
    }
  };

  const radialScale = {
    r: {
      beginAtZero: true,
      ticks: {
        color: lightTheme.secondary,
        backdropColor: 'transparent'
      },
      grid: { color: lightTheme.border },
      angleLines: { color: lightTheme.border },
      pointLabels: {
        color: lightTheme.primary,
        font: { size: 12, weight: '500' }
      }
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: lightTheme.primary,
          font: { size: 12, weight: '500' },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      title: {
        display: true,
        text: chartData.title || 'Chart',
        color: lightTheme.primary,
        font: { size: 16, weight: '600', family: 'inherit' },
        padding: { top: 10, bottom: 20 }
      },
      tooltip: {
        backgroundColor: lightTheme.surface,
        titleColor: lightTheme.primary,
        bodyColor: lightTheme.secondary,
        borderColor: lightTheme.border,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    // Use r for radar/polarArea, x/y otherwise
    scales: isRadial ? radialScale : baseCartesianScales,
    // Ensure bubble charts respect r radius values and scatter points visible
    elements: {
      point: {
        radius: chartType.toLowerCase() === 'bubble' ? 0 : undefined
      }
    }
  };

  // Apply theme colors to chart data
  const applyThemeColors = (data) => {
    return {
      ...data,
      datasets: data.datasets.map((dataset, index) => {
        const colorIndex = index % lightTheme.chartColors.length;
        const baseColor = lightTheme.chartColors[colorIndex];

        let backgroundColor;

        // Categorical fills (pie/doughnut/bar/polarArea) use per-item colors
        if (
          chartType === 'doughnut' ||
          chartType === 'pie' ||
          chartType === 'bar' ||
          chartType.toLowerCase() === 'polararea'
        ) {
          backgroundColor =
            lightTheme.chartColors.slice(0, dataset.data?.length || lightTheme.chartColors.length);
        } else if (chartType.toLowerCase() === 'radar') {
          // Radar: semi-transparent fill works well
          backgroundColor = lightTheme.gradientColors[colorIndex] || baseColor + '33';
        } else {
          // Line / Scatter / Bubble default to gradient or solid
          backgroundColor = lightTheme.gradientColors[colorIndex] || baseColor;
        }

        const lower = chartType.toLowerCase();

        return {
          ...dataset,
          borderColor: baseColor,
          backgroundColor,
          borderWidth:
            lower === 'line' || lower === 'radar' ? 2 : lower === 'bar' ? 1 : 2,
          tension: lower === 'line' || lower === 'radar' ? 0.3 : 0,
          fill: lower === 'line' ? false : lower === 'radar' ? true : true,

          // Points: show for line/radar/scatter, bubble uses r for size
          pointBackgroundColor: baseColor,
          pointBorderColor: lightTheme.background,
          pointBorderWidth: 2,
          pointRadius:
            lower === 'line' || lower === 'radar' || lower === 'scatter' ? 4 : 0,
          pointHoverRadius:
            lower === 'line' || lower === 'radar' || lower === 'scatter' ? 6 : 0,

          // Bar specific
          ...(lower === 'bar' && {
            borderRadius: 4,
            borderSkipped: false
          }),

          // Pie/Doughnut specific
          ...((lower === 'doughnut' || lower === 'pie') && {
            borderWidth: 3,
            borderColor: lightTheme.background,
            hoverBorderWidth: 4,
            hoverOffset: 8
          })
        };
      })
    };
  };

  const themedChartData = applyThemeColors(chartData);

  const renderChart = () => {
    switch (chartType.toLowerCase()) {
      case 'bar':
        return <Bar data={themedChartData} options={options} />;
      case 'doughnut':
        return <Doughnut data={themedChartData} options={options} />;
      case 'pie':
        return <Pie data={themedChartData} options={options} />;
      case 'radar':
        return <Radar data={themedChartData} options={options} />;
      case 'polararea':
        return <PolarArea data={themedChartData} options={options} />;
      case 'scatter':
        // Expect data points as { x, y }
        return <Scatter data={themedChartData} options={options} />;
      case 'bubble':
        // Expect data points as { x, y, r }
        return <Bubble data={themedChartData} options={options} />;
      default:
        return <Line data={themedChartData} options={options} />;
    }
  };

  return (
    <div className="chart-message">
      <div className="chart-container">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartMessage;
