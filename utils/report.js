const request = require('./request');

// 周报
function weeklyReport() {
  return request.get('/api/health/report/weekly');
}

// 月报
function monthlyReport() {
  return request.get('/api/health/report/monthly');
}

// 历史报告分页
function historyPage(params) {
  return request.get('/api/health/report/history/page', params || {});
}

// 历史报告详情
function historyDetail(id) {
  return request.get('/api/health/report/history/detail', { id });
}

module.exports = {
  weeklyReport,
  monthlyReport,
  historyPage,
  historyDetail
};