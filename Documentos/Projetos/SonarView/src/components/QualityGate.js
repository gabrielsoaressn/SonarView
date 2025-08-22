window.QualityGate = function QualityGate({ metrics }) {
  const getOverallStatus = () => {
    const rating = metrics.overallRating;
    if (rating === 'A' || rating === 'B') return 'passed';
    if (rating === 'C') return 'warning';
    return 'failed';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-100 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'failed': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed': return 'fas fa-check-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'failed': return 'fas fa-times-circle';
      default: return 'fas fa-question-circle';
    }
  };

  const overallStatus = getOverallStatus();

  const conditions = [
    {
      name: 'Reliability',
      status: metrics.reliability.rating <= 'B' ? 'passed' : 'failed',
      value: metrics.reliability.rating,
      detail: `${metrics.reliability.bugs} bugs`
    },
    {
      name: 'Security',
      status: metrics.security.rating <= 'B' ? 'passed' : 'failed',
      value: metrics.security.rating,
      detail: `${metrics.security.vulnerabilities} vulnerabilities`
    },
    {
      name: 'Maintainability',
      status: metrics.maintainability.rating <= 'B' && metrics.maintainability.debtRatio < 10 ? 'passed' : 'failed',
      value: metrics.maintainability.rating,
      detail: `${metrics.maintainability.debtRatio.toFixed(1)}% debt ratio`
    },
    {
      name: 'Coverage',
      status: metrics.coverage.overall >= 80 ? 'passed' : metrics.coverage.overall >= 60 ? 'warning' : 'failed',
      value: `${metrics.coverage.overall.toFixed(1)}%`,
      detail: 'test coverage'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-gray-900 mr-4">Quality Gate</h2>
          <div className={`flex items-center px-3 py-1 rounded-full border ${getStatusColor(overallStatus)}`}>
            <i className={`${getStatusIcon(overallStatus)} mr-2`}></i>
            <span className="font-semibold capitalize">{overallStatus}</span>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Project: {metrics.projectKey}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {conditions.map((condition, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">{condition.name}</span>
              <i className={`${getStatusIcon(condition.status)} ${getStatusColor(condition.status).split(' ')[0]}`}></i>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {condition.value}
            </div>
            <div className="text-sm text-gray-500">
              {condition.detail}
            </div>
          </div>
        ))}
      </div>

      {/* Quality Gate Summary */}
      <div className="mt-6 pt-6 border-t">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {conditions.filter(c => c.status === 'passed').length}
            </div>
            <div className="text-sm text-gray-600">Conditions Passed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {conditions.filter(c => c.status === 'warning').length}
            </div>
            <div className="text-sm text-gray-600">Warnings</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {conditions.filter(c => c.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-600">Conditions Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
};
