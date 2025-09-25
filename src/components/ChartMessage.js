import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import './ChartMessage.css';
import { lightTheme } from '../utils/chartThemes.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ChartMessage = ({ chartData, chartType = 'line' }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: lightTheme.primary,     // #1a202c
          font: {
            size: 12,
            weight: '500'
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        },
      },
      title: {
        display: true,
        text: chartData.title || 'Chart',
        color: lightTheme.primary,       // #1a202c
        font: {
          size: 16,
          weight: '600',
          family: 'inherit'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: lightTheme.surface,  // #f8fafc
        titleColor: lightTheme.primary,       // #1a202c
        bodyColor: lightTheme.secondary,      // #718096
        borderColor: lightTheme.border,       // #e2e8f0
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }
    },
    scales: {
      x: {
        ticks: {
          color: lightTheme.secondary,    // #718096
          font: {
            size: 11,
            weight: '400'
          },
          padding: 8
        },
        grid: {
          color: lightTheme.border,       // #e2e8f0
          borderColor: lightTheme.border,
          lineWidth: 1,
        },
        border: {
          color: lightTheme.border,
          width: 1
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: lightTheme.secondary,    // #718096
          font: {
            size: 11,
            weight: '400'
          },
          padding: 8
        },
        grid: {
          color: lightTheme.border,       // #e2e8f0
          borderColor: lightTheme.border,
          lineWidth: 1,
        },
        border: {
          color: lightTheme.border,
          width: 1
        }
      },
    },
  };

  // Apply theme colors to chart data
  const applyThemeColors = (data) => {
    return {
      ...data,
      datasets: data.datasets.map((dataset, index) => {
        const colorIndex = index % lightTheme.chartColors.length;
        const baseColor = lightTheme.chartColors[colorIndex];
        const gradientColor = lightTheme.gradientColors[colorIndex];

        return {
          ...dataset,
          borderColor: baseColor,
          backgroundColor: chartType === 'doughnut' || chartType === 'pie'
            ? lightTheme.chartColors.slice(0, dataset.data?.length || lightTheme.chartColors.length)
            : gradientColor,
          borderWidth: chartType === 'line' ? 2 : chartType === 'bar' ? 1 : 2,
          tension: chartType === 'line' ? 0.3 : 0,
          fill: chartType === 'line' ? false : true,

          // Additional styling for better visual consistency
          pointBackgroundColor: baseColor,
          pointBorderColor: lightTheme.background,
          pointBorderWidth: 2,
          pointRadius: chartType === 'line' ? 4 : 0,
          pointHoverRadius: chartType === 'line' ? 6 : 0,

          // Bar chart specific styling
          ...(chartType === 'bar' && {
            borderRadius: 4,
            borderSkipped: false,
          }),

          // Pie/Doughnut specific styling
          ...(chartType === 'doughnut' || chartType === 'pie') && {
            borderWidth: 3,
            borderColor: lightTheme.background,
            hoverBorderWidth: 4,
            hoverOffset: 8
          }
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
