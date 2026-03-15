const request = require('../../utils/request');

// 获取今日推荐
function getTodayRecommend(params) {
  return request.get('/api/recommend/today', params || {});
}

// 重新生成今日推荐
function refreshTodayRecommend(data) {
  return request.post('/api/recommend/today', data || {});
}

// 采纳今日方案
function adoptTodayPlan() {
  return request.post('/api/user-plan/adopt-today', {});
}

// 获取当前执行计划
function getCurrentPlan() {
  return request.get('/api/user-plan/current');
}

// 获取今日打卡状态
function getTodayCheckin() {
  return request.get('/api/user-plan/today-checkin');
}

// 保存今日打卡
function saveTodayCheckin(data) {
  return request.post('/api/user-plan/today-checkin', data || {});
}

module.exports = {
  getTodayRecommend,
  refreshTodayRecommend,
  adoptTodayPlan,
  getCurrentPlan,
  getTodayCheckin,
  saveTodayCheckin
};