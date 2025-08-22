window.TrendChart = function TrendChart({ data, metric, timeRange, color = '#3B82F6' }) {
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  React.useEffect(() => {
    if (!data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');
    
    // Destroy previous chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Filter data based on timeRange
    const filteredData = filterDataByTimeRange(data, timeRange);
    const chartData = prepareChartData(filteredData, metric);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [{
          label: getMetricLabel(metric),
          data: chartData.values,
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#F3F4F6'
            }
          },
          x: {
            grid: {
              color: '#F3F4F6'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: color,
            borderWidth: 1
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, metric, timeRange, color]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
        <div className="text-center">
          <i className="fas fa-chart-line text-gray-400 text-4xl mb-2"></i>
          <p className="text-gray-500">No trend data available</p>
        </div>
      </div>
    );
  }

  return <canvas ref={chartRef} className="h-64"></canvas>;
};

function filterDataByTimeRange(data, timeRange) {
  const now = new Date();
  let cutoffTime;

  switch (timeRange) {
    case '6h':
      cutoffTime = new Date(now - 6 * 60 * 60 * 1000);
      break;
    case '12h':
      cutoffTime = new Date(now - 12 * 60 * 60 * 1000);
      break;
    case '24h':
      cutoffTime = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '3d':
      cutoffTime = new Date(now - 3 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoffTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoffTime = new Date(now - 24 * 60 * 60 * 1000);
  }

  return data.filter(item => new Date(item.timestamp) > cutoffTime);
}

function prepareChartData(data, metric) {
  const labels = [];
  const values = [];

  data.forEach(item => {
    const timestamp = new Date(item.timestamp);
    labels.push(timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    let value = 0;
    
    if (metric === 'ratings') {
      // Convert rating to numeric value for charting
      const ratingValues = { A: 5, B: 4, C: 3, D: 2, E: 1 };
      value = (ratingValues[item.reliability.rating] + 
               ratingValues[item.security.rating] + 
               ratingValues[item.maintainability.rating]) / 3;
    } else {
      // Handle nested metrics
      const keys = metric.split('.');
      value = keys.reduce((obj, key) => obj?.[key], item) || 0;
    }
    
    values.push(value);
  });

  return { labels, values };
}

function getMetricLabel(metric) {
  const labels = {
    'technicalDebtMinutes': 'Technical Debt (minutes)',
    'reliability.bugs': 'Bugs',
    'security.vulnerabilities': 'Vulnerabilities',
    'maintainability.codeSmells': 'Code Smells',
    'maintainability.debtRatio': 'Debt Ratio (%)',
    'ratings': 'Average Rating'
  };
  
  return labels[metric] || metric;
}
