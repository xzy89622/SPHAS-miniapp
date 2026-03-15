const request = require('../utils/request');

// 周报
function weeklyReport() {
  return request.get('/api/health/report/weekly');
}

// 月报
function monthlyReport() {
  return request.get('/api/health/report/monthly');
}

module.exports = {
  weeklyReport,
  monthlyReport
};