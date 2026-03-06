// pages/api/assessment.js
const request = require('../../utils/request');

// ✅ 题库列表
function listQuestions(params) {
  return request.get('/api/questions/list', params || {});
}

// ✅ 提交体质评估（后端通常要 BMI + 各维度分数）
function evaluate(payload) {
  return request.post('/api/assessment/evaluate', payload || {});
}

module.exports = {
  listQuestions,
  evaluate
};