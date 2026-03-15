const request = require('../../utils/request');

// 挑战分页
function challengePage(params) {
  return request.get('/api/challenge/page', params || {});
}

// 挑战详情
function challengeDetail(id) {
  return request.get(`/api/challenge/detail/${id}`);
}

// 参加挑战
function joinChallenge(id) {
  return request.post(`/api/challenge/join/${id}`, {});
}

// 更新进度
function updateProgress(payload) {
  return request.post('/api/challenge/progress/set', payload || {});
}

// 完成挑战
function finishChallenge(id) {
  return request.post(`/api/challenge/finish/${id}`, {});
}

// 进度榜 topN
function progressTop(challengeId, topN) {
  return request.get('/api/challenge/leaderboard/progress/top', {
    challengeId,
    topN: topN || 10
  });
}

// 完成榜 topN
function finishTop(challengeId, topN) {
  return request.get('/api/challenge/leaderboard/finish/top', {
    challengeId,
    topN: topN || 10
  });
}

// 我的进度排名
function myProgressRank(challengeId) {
  return request.get('/api/challenge/leaderboard/progress/me', {
    challengeId
  });
}

// 我的完成排名
function myFinishRank(challengeId) {
  return request.get('/api/challenge/leaderboard/finish/me', {
    challengeId
  });
}

/**
 * 我的挑战列表
 * 后端这里返回的是 List<ChallengeJoin>
 * 这里统一包装一下，前端页面就不用改太多
 */
async function myChallenges(params) {
  const res = await request.get('/api/challenge/my', params || {});
  const list = Array.isArray(res) ? res : [];

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