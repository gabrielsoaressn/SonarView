window.MetricCard = function MetricCard({ title, value, suffix = '', type = 'info', trend, icon }) {
  const getColorClasses = () => {
    switch (type) {
      case 'rating':
        return getRatingColors(value);
      case 'bugs':
        return value === 0 ? 'text-green-600 bg-green-50 border-green-200' : 
               value < 5 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
               'text-red-600 bg-red-50 border-red-200';
      case 'vulnerabilities':
        return value === 0 ? 'text-green-600 bg-green-50 border-green-200' :
               'text-red-600 bg-red-50 border-red-200';
      case 'smells':
        return value < 10 ? 'text-green-600 bg-green-50 border-green-200' :
               value < 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
               'text-red-600 bg-red-50 border-red-200';
      case 'coverage':
        return value >= 80 ? 'text-green-600 bg-green-50 border-green-200' :
               value >= 60 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
               'text-red-600 bg-red-50 border-red-200';
      case 'debt':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'effort':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'duplication':
        return value < 5 ? 'text-green-600 bg-green-50 border-green-200' :
               value < 10 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
               'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getRatingColors = (rating) => {
    switch (rating) {
      case 'A': return 'text-green-600 bg-green-50 border-green-200';
      case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'D': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'E': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <i className="fas fa-arrow-up text-green-500"></i>;
      case 'down': return <i className="fas fa-arrow-down text-red-500"></i>;
      case 'stable': return <i className="fas fa-minus text-gray-500"></i>;
      default: return null;
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div className={`p-4 rounded-lg border ${colorClasses}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {icon && <i className={`${icon} text-lg mr-3`}></i>}
          <div>
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="text-2xl font-bold">
              {value}{suffix}
            </p>
          </div>
        </div>
        {trend && (
          <div className="flex flex-col items-center">
            {getTrendIcon()}
          </div>
        )}
      </div>
    </div>
  );
};
