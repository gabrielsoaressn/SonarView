const { useState, useEffect } = React;

window.Dashboard = function Dashboard({ metrics, history, loading }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">
          <i className="fas fa-chart-line"></i>
        </div>
        <h3 className="text-xl font-semibold text-gray-700">No Data Available</h3>
        <p className="text-gray-500">Waiting for first metrics collection...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: 'fas fa-tachometer-alt' },
    { id: 'reliability', name: 'Reliability', icon: 'fas fa-shield-alt' },
    { id: 'security', name: 'Security', icon: 'fas fa-lock' },
    { id: 'maintainability', name: 'Maintainability', icon: 'fas fa-tools' }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Time Range Filter */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {['6h', '12h', '24h', '3d', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
        
        {React.createElement(window.AlertPanel, { metrics })}
      </div>

      {/* Quality Gate Overview */}
      {React.createElement(window.QualityGate, { metrics })}

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'overview' && (
          <OverviewTab metrics={metrics} history={history} timeRange={timeRange} />
        )}
        {activeTab === 'reliability' && (
          <ReliabilityTab metrics={metrics} history={history} timeRange={timeRange} />
        )}
        {activeTab === 'security' && (
          <SecurityTab metrics={metrics} history={history} timeRange={timeRange} />
        )}
        {activeTab === 'maintainability' && (
          <MaintainabilityTab metrics={metrics} history={history} timeRange={timeRange} />
        )}
      </div>
    </div>
  );
};

function OverviewTab({ metrics, history, timeRange }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {React.createElement(window.MetricCard, {
          title: 'Overall Rating',
          value: metrics.overallRating,
          type: 'rating',
          trend: 'stable',
          icon: 'fas fa-star'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Technical Debt',
          value: Math.round(metrics.technicalDebtMinutes / 60),
          suffix: 'hours',
          type: 'debt',
          icon: 'fas fa-clock'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Lines of Code',
          value: metrics.size.linesOfCode.toLocaleString(),
          type: 'info',
          icon: 'fas fa-code'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Test Coverage',
          value: metrics.coverage.overall,
          suffix: '%',
          type: 'coverage',
          icon: 'fas fa-vial'
        })}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Technical Debt Trend</h3>
          {React.createElement(window.TrendChart, {
            data: history,
            metric: 'technicalDebtMinutes',
            timeRange,
            color: '#EF4444'
          })}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Quality Ratings</h3>
          {React.createElement(window.TrendChart, {
            data: history,
            metric: 'ratings',
            timeRange,
            color: '#3B82F6'
          })}
        </div>
      </div>

      {/* New vs Legacy Code */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">New Code Quality</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">{metrics.newCode.bugs}</div>
            <div className="text-sm text-gray-600">New Bugs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500">{metrics.newCode.vulnerabilities}</div>
            <div className="text-sm text-gray-600">New Vulnerabilities</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-500">{metrics.newCode.codeSmells}</div>
            <div className="text-sm text-gray-600">New Code Smells</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReliabilityTab({ metrics, history, timeRange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {React.createElement(window.MetricCard, {
          title: 'Reliability Rating',
          value: metrics.reliability.rating,
          type: 'rating',
          icon: 'fas fa-shield-alt'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Total Bugs',
          value: metrics.reliability.bugs,
          type: 'bugs',
          icon: 'fas fa-bug'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Remediation Effort',
          value: Math.round(metrics.reliability.remediationEffort / 60),
          suffix: 'hours',
          type: 'effort',
          icon: 'fas fa-wrench'
        })}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Reliability Trend</h3>
        {React.createElement(window.TrendChart, {
          data: history,
          metric: 'reliability.bugs',
          timeRange,
          color: '#DC2626'
        })}
      </div>
    </div>
  );
}

function SecurityTab({ metrics, history, timeRange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {React.createElement(window.MetricCard, {
          title: 'Security Rating',
          value: metrics.security.rating,
          type: 'rating',
          icon: 'fas fa-lock'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Vulnerabilities',
          value: metrics.security.vulnerabilities,
          type: 'vulnerabilities',
          icon: 'fas fa-exclamation-triangle'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Remediation Effort',
          value: Math.round(metrics.security.remediationEffort / 60),
          suffix: 'hours',
          type: 'effort',
          icon: 'fas fa-tools'
        })}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Security Trend</h3>
        {React.createElement(window.TrendChart, {
          data: history,
          metric: 'security.vulnerabilities',
          timeRange,
          color: '#F59E0B'
        })}
      </div>
    </div>
  );
}

function MaintainabilityTab({ metrics, history, timeRange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {React.createElement(window.MetricCard, {
          title: 'Maintainability Rating',
          value: metrics.maintainability.rating,
          type: 'rating',
          icon: 'fas fa-tools'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Code Smells',
          value: metrics.maintainability.codeSmells,
          type: 'smells',
          icon: 'fas fa-exclamation'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Debt Ratio',
          value: metrics.maintainability.debtRatio,
          suffix: '%',
          type: 'debt',
          icon: 'fas fa-percentage'
        })}
        {React.createElement(window.MetricCard, {
          title: 'Duplication',
          value: metrics.duplication.density,
          suffix: '%',
          type: 'duplication',
          icon: 'fas fa-copy'
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Code Smells Trend</h3>
          {React.createElement(window.TrendChart, {
            data: history,
            metric: 'maintainability.codeSmells',
            timeRange,
            color: '#8B5CF6'
          })}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Debt Ratio Trend</h3>
          {React.createElement(window.TrendChart, {
            data: history,
            metric: 'maintainability.debtRatio',
            timeRange,
            color: '#EF4444'
          })}
        </div>
      </div>
    </div>
  );
}
