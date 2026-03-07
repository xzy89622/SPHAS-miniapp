// pages/points/index/index.js
const api = require('../../api/points.js');

Page({
  data: {
    summary: {},
    myRank: {},
    badges: [],
    leaderboard: [],
    records: [],
    loading: false,
    errMsg: ''
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  getRecordTypeText(type) {
    const map = {
      POST_CREATE: '发布帖子',
      POST_LIKE: '点赞互动',
      POST_COMMENT: '评论互动',
      CHALLENGE_FINISH: '完成挑战',
      CHALLENGE_JOIN: '参与挑战',
      LOGIN_DAILY: '每日登录',
      SIGN_IN: '每日签到'
    };
    return map[type] || type || '积分变动';
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    return String(timeStr)
      .replace('T', ' ')
      .replace(/\.\d+$/, '')
      .slice(0, 16);
  },

  normalizeRecords(records) {
    if (!Array.isArray(records)) return [];
    return records.map(item => {
      const points = Number(item.points || 0);
      return {
        ...item,
        typeText: this.getRecordTypeText(item.type || item.bizType),
        timeText: this.formatTime(item.createTime || item.updateTime),
        pointsText: `${points > 0 ? '+' : ''}${points}`
      };
    });
  },

  normalizeLeaderboard(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item, index) => ({
      ...item,
      showRank: item.rank || (index + 1),
      showName: item.nickname || item.username || ('用户' + (item.userId || (index + 1))),
      showPoints: item.totalPoints || item.points || item.score || 0
    }));
  },

  normalizeBadges(list) {
    if (!Array.isArray(list)) return [];
    return list.map(item => ({
      ...item,
      showName: item.name || item.badgeName || '未命名徽章',
      showDesc: item.description || item.remark || ''
    }));
  },

  async loadAll() {
    this.setData({
      loading: true,
      errMsg: ''
    });

    try {
      const [summary, myRank, badges, leaderboard, records] = await Promise.all([
        api.myPointSummary().catch(() => ({ totalPoints: 0 })),
        api.myPointRank().catch(() => ({})),
        api.myBadges().catch(() => []),
        api.pointLeaderboard().catch(() => []),
        api.myPointRecords().catch(() => [])
      ]);

      console.log('[points] summary =', summary);
      console.log('[points] myRank =', myRank);
      console.log('[points] badges =', badges);
      console.log('[points] leaderboard =', leaderboard);
      console.log('[points] records =', records);

      this.setData({
        summary: summary || {},
        myRank: myRank || {},
        badges: this.normalizeBadges(badges),
        leaderboard: this.normalizeLeaderboard(leaderboard),
        records: this.normalizeRecords(records)
      });
    } catch (e) {
      console.log('[points] loadAll fail', e);
      this.setData({
        errMsg: e.msg || '加载失败'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  }
});