const request = require('../../utils/request');

// 这里把报告相关接口统一一下
// 后面不管是首页报告、历史报告，还是详情页，都走这一份

function normalizePage(res) {
  const page = res || {};
  const records = Array.isArray(page.records) ? page.records : [];

  return {
    records,
    total: Number(page.total || 0),
    current: Number(page.current || page.pageNum || 1),
    size: Number(page.size || page.pageSize || 10)
  };
}

// 当前周报
function weeklyReport() {
  return request.get('/api/health/report/weekly');
}

// 当前月报
function monthlyReport() {
  return request.get('/api/health/report/monthly');
}

// 历史报告分页
function historyPage(params) {
  return request
    .get('/api/health/report/history/page', Object.assign({
      pageNum: 1,
      pageSize: 10
    }, params || {}))
    .then(normalizePage);
}

// 历史报告详情
function historyDetail(id) {
  return request.get('/api/health/report/history/detail', {
    id: Number(id)
  });
}

module.exports = {
  weeklyReport,
  monthlyReport,
  historyPage,
  historyDetail
};