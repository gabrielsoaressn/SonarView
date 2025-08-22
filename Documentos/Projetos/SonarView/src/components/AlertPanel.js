window.AlertPanel = function AlertPanel({ metrics }) {
  const [alerts, setAlerts] = React.useState([]);
  const [showAlerts, setShowAlerts] = React.useState(false);

  React.useEffect(() => {
    if (!metrics) return;

    const newAlerts = [];

    // Critical issues alerts
    if (metrics.reliability.bugs > 0) {
      newAlerts.push({
        type: 'error',
        title: 'Reliability Issues',
        message: `${metrics.reliability.bugs} bugs detected`,
        action: 'View Details'
      });
    }

    if (metrics.security.vulnerabilities > 0) {
      newAlerts.push({
        type: 'error',
        title: 'Security Vulnerabilities',
        message: `${metrics.security.vulnerabilities} vulnerabilities found`,
        action: 'Fix Now'
      });
    }

    // Warning alerts
    if (metrics.maintainability.debtRatio > 10) {
      newAlerts.push({
        type: 'warning',
        title: 'High Technical Debt',
        message: `Debt ratio: ${metrics.maintainability.debtRatio.toFixed(1)}%`,
        action: 'Plan Refactoring'
      });
    }

    if (metrics.coverage.overall < 60) {
      newAlerts.push({
        type: 'warning',
        title: 'Low Test Coverage',
        message: `Coverage: ${metrics.coverage.overall.toFixed(1)}%`,
        action: 'Add Tests'
      });
    }

    // New code alerts
    if (metrics.newCode.bugs > 0 || metrics.newCode.vulnerabilities > 0 || metrics.newCode.codeSmells > 5) {
      newAlerts.push({
        type: 'info',
        title: 'New Code Issues',
        message: `${metrics.newCode.bugs + metrics.newCode.vulnerabilities + metrics.newCode.codeSmells} new issues`,
        action: 'Review'
      });
    }

    setAlerts(newAlerts);
  }, [metrics]);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-bell';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="flex items-center text-green-600">
        <i className="fas fa-check-circle mr-2"></i>
        <span className="text-sm font-medium">All systems healthy</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowAlerts(!showAlerts)}
        className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200"
      >
        <i className="fas fa-bell mr-2"></i>
        {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
        <i className={`fas fa-chevron-down ml-2 transition-transform ${showAlerts ? 'rotate-180' : ''}`}></i>
      </button>

      {showAlerts && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Active Alerts</h3>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts.map((alert, index) => (
              <div key={index} className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}>
                <div className="flex items-start">
                  <i className={`${getAlertIcon(alert.type)} mt-1 mr-3`}></i>
                  <div className="flex-1">
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm opacity-75">{alert.message}</div>
                    {alert.action && (
                      <button className="text-sm font-medium mt-2 hover:underline">
                        {alert.action} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <button className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium">
              View All Alerts
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
