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

// 2）我的积分流水（返回分页原始结果，给前端自己判断是否还有更多）
async function myPointRecordPage(params) {
  const res = await request.get(
    '/api/points/record/my/page',
    Object.assign(
      {
        pageNum: 1,
        pageSize: 10
      },
      params || {}
    )
  );

  const records =
    Array.isArray(res) ? res :
    Array.isArray(res.records) ? res.records :
    Array.isArray(res.list) ? res.list :
    res.data && Array.isArray(res.data.records) ? res.data.records :
    res.data && Array.isArray(res.data.list) ? res.data.list :
    [];

  const total =
    res.total ||
    (res.data && res.data.total) ||
    0;

  const pageNum =
    res.pageNum ||
    (res.data && res.data.pageNum) ||
    (params && params.pageNum) ||
    1;

  const pageSize =
    res.pageSize ||
    (res.data && res.data.pageSize) ||
    (params && params.pageSize) ||
    10;

  return {
    records,
    total,
    pageNum,
    pageSize
  };
}

// 兼容旧调用
async function myPointRecords(params) {
  const page = await myPointRecordPage(params);
  return page.records || [];
}

// 3）我的徽章
async function myBadges() {
  const res = await request.get('/api/badge/my');
  return unwrapList(res);
}

// 4）积分排行榜
async function pointLeaderboard(params) {
  const res = await request.get(
    '/api/points/leaderboard/top',
    Object.assign(
      {
        topN: 10
      },
      params || {}
    )
  );
  return unwrapList(res);
}

// 5）我的积分排名
async function myPointRank() {
  const res = await request.get('/api/points/leaderboard/me');
  return unwrapObj(res);
}

module.exports = {
  myPointSummary,
  myPointRecordPage,
  myPointRecords,
  myBadges,
  pointLeaderboard,
  myPointRank
};