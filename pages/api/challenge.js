// pages/api/challenge.js
const request = require('../../utils/request');

// ✅ 挑战列表
function list(params) {
  return request.get('/api/challenges/list', params || {});
}

module.exports = { list };