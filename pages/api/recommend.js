// pages/api/recommend.js
const request = require('../../utils/request');

// ✅ 今日推荐
function today() {
  return request.get('/api/recommend/today');
}

module.exports = { today };