window.DataTransforms = {
  // Convert rating letter to numeric score
  ratingToScore(rating) {
    const scores = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1 };
    return scores[rating] || 0;
  },

  // Convert minutes to readable time format
  minutesToReadable(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  },

  // Calculate trend between two values
  calculateTrend(current, previous) {
    if (!previous) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  },

  // Format large numbers with K/M suffixes
  formatNumber(number) {
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
  },

  // Calculate quality score (0-100)
  calculateQualityScore(metrics) {
    const reliabilityScore = this.ratingToScore(metrics.reliability.rating) * 20;
    const securityScore = this.ratingToScore(metrics.security.rating) * 20;
    const maintainabilityScore = this.ratingToScore(metrics.maintainability.rating) * 20;
    const coverageScore = Math.min(metrics.coverage.overall, 100);
    const duplicationScore = Math.max(0, 100 - metrics.duplication.density * 10);

    return Math.round((reliabilityScore + securityScore + maintainabilityScore + coverageScore + duplicationScore) / 5);
  },

  // Group metrics by time period
  groupMetricsByPeriod(metrics, period = 'hour') {
    const groups = {};
    
    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      let key;
      
      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        default:
          key = metric.timestamp;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(metric);
    });

    return groups;
  },

  // Calculate technical debt velocity
  calculateDebtVelocity(metrics) {
    if (metrics.length < 2) return 0;
    
    const latest = metrics[metrics.length - 1];
    const previous = metrics[metrics.length - 2];
    
    const latestDebt = latest.technicalDebtMinutes;
    const previousDebt = previous.technicalDebtMinutes;
    
    return latestDebt - previousDebt;
  }
};
