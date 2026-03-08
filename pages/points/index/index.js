// pages/points/index/index.js
const api = require('../../api/points.js');

Page({
  data: {
    summary: {},
    myRank: {},
    badges: [],
    leaderboard: [],
    records: [],

    pageNum: 1,
    pageSize: 10,
    hasMore: true,

    loading: false,
    loadingMore: false,
    errMsg: ''
  },

  onLoad() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.loadAll();
  },
  
  onShow() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
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

  getRankClass(rank) {
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    return 'normal';
  },

  getRankBadge(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  },

  normalizeLeaderboard(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item, index) => {
      const rank = item.rank || (index + 1);
      return {
        ...item,
        showRank: rank,
        showName: item.nickname || item.username || ('用户' + (item.userId || (index + 1))),
        showPoints: item.totalPoints || item.points || item.score || 0,
        rankClass: this.getRankClass(rank),
        rankBadge: this.getRankBadge(rank)
      };
    });
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
      errMsg: '',
      pageNum: 1,
      hasMore: true,
      records: []
    });

    try {
      const [summary, myRank, badges, leaderboard, recordPage] = await Promise.all([
        api.myPointSummary().catch(() => ({ totalPoints: 0 })),
        api.myPointRank().catch(() => ({})),
        api.myBadges().catch(() => []),
        api.pointLeaderboard().catch(() => []),
        api.myPointRecordPage({ pageNum: 1, pageSize: this.data.pageSize }).catch(() => ({
          records: [],
          total: 0,
          pageNum: 1,
          pageSize: this.data.pageSize
        }))
      ]);

      const firstRecords = this.normalizeRecords(recordPage.records || []);
      const pageSize = recordPage.pageSize || this.data.pageSize;
      const total = Number(recordPage.total || 0);
      const hasMore = total > firstRecords.length;

      this.setData({
        summary: summary || {},
        myRank: myRank || {},
        badges: this.normalizeBadges(badges),
        leaderboard: this.normalizeLeaderboard(leaderboard),
        records: firstRecords,
        pageNum: 1,
        pageSize,
        hasMore
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
  },

  async loadMoreRecords() {
    if (this.data.loadingMore || !this.data.hasMore) return;

    const nextPage = this.data.pageNum + 1;

    this.setData({
      loadingMore: true
    });

    try {
      const res = await api.myPointRecordPage({
        pageNum: nextPage,
        pageSize: this.data.pageSize
      });

      const newRecords = this.normalizeRecords(res.records || []);
      const allRecords = this.data.records.concat(newRecords);
      const total = Number(res.total || 0);

      this.setData({
        records: allRecords,
        pageNum: nextPage,
        hasMore: total > allRecords.length
      });
    } catch (e) {
      console.log('[points] loadMoreRecords fail', e);
      wx.showToast({
        title: e.msg || '加载更多失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loadingMore: false
      });
    }
  }
});