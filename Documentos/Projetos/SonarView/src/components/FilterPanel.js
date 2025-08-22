window.FilterPanel = function FilterPanel({ onFilterChange, filters }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <i className="fas fa-filter mr-2"></i>
        Filters
        <i className={`fas fa-chevron-down ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
          <div className="space-y-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level
              </label>
              <select
                value={filters.severity || 'all'}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Severities</option>
                <option value="blocker">Blocker</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Metric Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric Type
              </label>
              <div className="space-y-2">
                {[
                  { key: 'bugs', label: 'Bugs' },
                  { key: 'vulnerabilities', label: 'Vulnerabilities' },
                  { key: 'code_smells', label: 'Code Smells' },
                  { key: 'coverage', label: 'Coverage' },
                  { key: 'duplication', label: 'Duplication' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.metrics?.includes(key) || false}
                      onChange={(e) => {
                        const currentMetrics = filters.metrics || [];
                        const newMetrics = e.target.checked
                          ? [...currentMetrics, key]
                          : currentMetrics.filter(m => m !== key);
                        handleFilterChange('metrics', newMetrics);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Code Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="codeType"
                    value="all"
                    checked={filters.codeType === 'all'}
                    onChange={(e) => handleFilterChange('codeType', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">All</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="codeType"
                    value="new"
                    checked={filters.codeType === 'new'}
                    onChange={(e) => handleFilterChange('codeType', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">New Code</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="codeType"
                    value="legacy"
                    checked={filters.codeType === 'legacy'}
                    onChange={(e) => handleFilterChange('codeType', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Legacy</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <button
                onClick={() => {
                  onFilterChange({
                    severity: 'all',
                    metrics: [],
                    codeType: 'all'
                  });
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
