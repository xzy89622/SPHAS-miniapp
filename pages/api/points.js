// pages/api/points.js
const request = require('../../utils/request');

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
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return res.data;
  }
  return res;
}

// 1）我的总积分
// GET /api/points/record/my/total
async function myPointSummary() {
  const total = await request.get('/api/points/record/my/total');

  if (typeof total === 'number') {
    return { totalPoints: total };
  }

  if (total && typeof total === 'object') {
    return {
      totalPoints: total.totalPoints || total.total || total.points || total.score || 0
    };
  }

  return { totalPoints: 0 };
}

// 2）我的积分流水
// GET /api/points/record/my/page?pageNum=1&pageSize=10
async function myPointRecords(params) {
  const res = await request.get('/api/points/record/my/page', Object.assign({
    pageNum: 1,
    pageSize: 20
  }, params || {}));

  if (Array.isArray(res)) return res;
  if (Array.isArray(res.records)) return res.records;
  if (Array.isArray(res.list)) return res.list;
  if (res.data && Array.isArray(res.data.records)) return res.data.records;
  if (res.data && Array.isArray(res.data.list)) return res.data.list;

  return [];
}

// 3）我的徽章
// GET /api/badge/my
async function myBadges() {
  const res = await request.get('/api/badge/my');
  return unwrapList(res);
}

// 4）积分排行榜
// GET /api/points/leaderboard/top?topN=10
async function pointLeaderboard(params) {
  const res = await request.get('/api/points/leaderboard/top', Object.assign({
    topN: 10
  }, params || {}));
  return unwrapList(res);
}

// 5）我的积分排名
// GET /api/points/leaderboard/me
async function myPointRank() {
  const res = await request.get('/api/points/leaderboard/me');
  return unwrapObj(res);
}

module.exports = {
  myPointSummary,
  myPointRecords,
  myBadges,
  pointLeaderboard,
  myPointRank
};