const request = require('../../utils/request');

function unwrapPage(res) {
  if (!res) {
    return {
      records: [],
      total: 0,
      pageNum: 1,
      pageSize: 10
    };
  }

  if (Array.isArray(res.records)) {
    return {
      records: res.records,
      total: Number(res.total || 0),
      pageNum: Number(res.current || res.pageNum || 1),
      pageSize: Number(res.size || res.pageSize || 10)
    };
  }

  if (res.data && Array.isArray(res.data.records)) {
    return {
      records: res.data.records,
      total: Number(res.data.total || 0),
      pageNum: Number(res.data.current || res.data.pageNum || 1),
      pageSize: Number(res.data.size || res.data.pageSize || 10)
    };
  }

  return {
    records: [],
    total: 0,
    pageNum: 1,
    pageSize: 10
  };
}

function challengePage(params) {
  return request.get('/api/challenge/page', params || {});
}

function challengeDetail(id) {
  return request.get(`/api/challenge/detail/${id}`);
}

function joinChallenge(id) {
  return request.post(`/api/challenge/join/${id}`, {});
}

function updateProgress(payload) {
  return request.post('/api/challenge/progress/set', payload);
}

function finishChallenge(id) {
  return request.post(`/api/challenge/finish/${id}`, {});
}

function progressTop(id, limit) {
  return request.get('/api/challenge/rank/progress', {
    id,
    limit: limit || 10
  });
}

function finishTop(id, limit) {
  return request.get('/api/challenge/rank/finish', {
    id,
    limit: limit || 10
  });
}

function myProgressRank(id) {
  return request.get('/api/challenge/rank/myProgress', { id });
}

function myFinishRank(id) {
  return request.get('/api/challenge/rank/myFinish', { id });
}

/**
 * 后端 /api/challenge/my 返回的是 List<ChallengeJoin>
 * 这里统一包装成分页结构，方便前端继续复用
 */
async function myChallenges(params) {
  const res = await request.get('/api/challenge/my', params || {});
  const list = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : []);
  return {
    records: list,
    total: list.length,
    pageNum: 1,
    pageSize: list.length || 10
  };
}

module.exports = {
  challengePage,
  challengeDetail,
  joinChallenge,
  updateProgress,
  finishChallenge,
  progressTop,
  finishTop,
  myProgressRank,
  myFinishRank,
  myChallenges
};