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

// Register Chart.js components
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
          color: '#e5e5e5', // Light text for dark theme
        },
      },
      title: {
        display: true,
        text: chartData.title || 'Chart',
        color: '#e5e5e5', // Light text for dark theme
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af', // Light gray for axis labels
        },
        grid: {
          color: '#404040', // Dark grid lines
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9ca3af', // Light gray for axis labels
        },
        grid: {
          color: '#404040', // Dark grid lines
        },
      },
    },
  };

  // Prepare data for Chart.js format
  const chartJsData = {
    title: chartData.title,
    labels: chartData.labels,
    datasets: chartData.datasets.map(dataset => ({
      ...dataset,
      // Ensure colors work with dark theme
      borderColor: dataset.borderColor || '#4b5563',
      backgroundColor: dataset.backgroundColor || 'rgba(75, 85, 99, 0.2)',
    })),
  };

  const renderChart = () => {
    switch (chartType.toLowerCase()) {
      case 'bar':
        return <Bar data={chartJsData} options={options} />;
      case 'doughnut':
        return <Doughnut data={chartJsData} options={options} />;
      case 'pie':
        return <Pie data={chartJsData} options={options} />;
      default:
        return <Line data={chartJsData} options={options} />;
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
