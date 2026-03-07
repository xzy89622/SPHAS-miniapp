// pages/api/challenge.js
const request = require('../../utils/request');

function unwrapPage(res) {
  if (!res) return { records: [], total: 0 };
  if (Array.isArray(res)) return { records: res, total: res.length };
  if (Array.isArray(res.records)) return { records: res.records, total: res.total || res.records.length };
  if (res.data) {
    if (Array.isArray(res.data.records)) return { records: res.data.records, total: res.data.total || res.data.records.length };
    if (Array.isArray(res.data)) return { records: res.data, total: res.data.length };
  }
  return { records: [], total: 0 };
}

function unwrapList(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.records)) return res.records;
  if (Array.isArray(res.list)) return res.list;
  if (res.data) {
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.records)) return res.data.records;
    if (Array.isArray(res.data.list)) return res.data.list;
  }
  return [];
}

function unwrapObj(res) {
  if (!res) return {};
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  return res;
}

// 挑战分页：GET /api/challenge/page
async function listChallenges(params) {
  const res = await request.get('/api/challenge/page', Object.assign({
    pageNum: 1,
    pageSize: 20
  }, params || {}));
  return unwrapPage(res);
}

// 我的挑战：GET /api/challenge/my
async function myChallenges(params) {
  const res = await request.get('/api/challenge/my', params || {});
  return unwrapList(res);
}

// 挑战详情：GET /api/challenge/detail/{id}
async function challengeDetail(id) {
  const res = await request.get(`/api/challenge/detail/${id}`);
  return unwrapObj(res);
}

// 报名：POST /api/challenge/join/{id}
async function joinChallenge(challengeId) {
  return request({
    url: `/api/challenge/join/${challengeId}`,
    method: 'POST'
  });
}

// 更新进度：POST /api/challenge/progress/set
async function updateProgress(payload) {
  return request({
    url: '/api/challenge/progress/set',
    method: 'POST',
    data: payload || {}
  });
}

// 完成：POST /api/challenge/finish/{id}
async function finishChallenge(challengeId) {
  return request({
    url: `/api/challenge/finish/${challengeId}`,
    method: 'POST'
  });
}

// 排行榜
async function progressTop(challengeId, topN) {
  const res = await request.get('/api/challenge/leaderboard/progress/top', {
    challengeId,
    topN: topN || 10
  });
  return unwrapList(res);
}

async function finishTop(challengeId, topN) {
  const res = await request.get('/api/challenge/leaderboard/finish/top', {
    challengeId,
    topN: topN || 10
  });
  return unwrapList(res);
}

async function myProgressRank(challengeId) {
  const res = await request.get('/api/challenge/leaderboard/progress/me', { challengeId });
  return unwrapObj(res);
}

async function myFinishRank(challengeId) {
  const res = await request.get('/api/challenge/leaderboard/finish/me', { challengeId });
  return unwrapObj(res);
}

module.exports = {
  listChallenges,
  myChallenges,
  challengeDetail,
  joinChallenge,
  updateProgress,
  finishChallenge,
  progressTop,
  finishTop,
  myProgressRank,
  myFinishRank
};