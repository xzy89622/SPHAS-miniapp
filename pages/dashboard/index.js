// pages/dashboard/index.js
const request = require('../../utils/request');
const auth = require('../../utils/auth');
const pointsApi = require('../api/points.js');

Page({
  data: {
    loading: false,
    errorMsg: '',

    userInfo: {
      id: '',
      username: '',
      nickname: '',
      role: '',
      phone: ''
    },

    userDisplayName: '未登录用户',
    userRoleText: '未知角色',
    userAvatarText: 'U',
    loginStatusText: '未登录',

    overview: {
      totalRecords: 0,
      todayRecords: 0,
      activeChallenges: 0,
      totalPoints: 0
    },

    trendList: []
  },

  async onLoad() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') {
      this.setData({ errorMsg: '登录校验未生效，请重新编译项目' });
      return;
    }
    if (!app.requireLogin()) return;
    await this.reload();
  },

  onShow() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.loadLocalUserInfo();
  },

  async onPullDownRefresh() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') {
      wx.stopPullDownRefresh();
      return;
    }
    if (!app.requireLogin()) {
      wx.stopPullDownRefresh();
      return;
    }

    await this.reload();
    wx.stopPullDownRefresh();
  },

  loadLocalUserInfo() {
    const userInfo = auth.getUserInfo
      ? (auth.getUserInfo() || {})
      : (wx.getStorageSync('userInfo') || {});
    this.applyUserInfo(userInfo);
  },

  applyUserInfo(userInfo) {
    const info = userInfo || {};
    const displayName = info.nickname || info.username || '未登录用户';

    let roleText = '未知角色';
    if (info.role === 'ADMIN') roleText = '管理员';
    if (info.role === 'USER') roleText = '普通用户';

    const avatarText = displayName ? String(displayName).slice(0, 1) : 'U';
    const loginStatusText = info && info.id ? '已登录' : '未登录';

    this.setData({
      userInfo: {
        id: info.id || '',
        username: info.username || '',
        nickname: info.nickname || '',
        role: info.role || '',
        phone: info.phone || ''
      },
      userDisplayName: displayName,
      userRoleText: roleText,
      userAvatarText: avatarText,
      loginStatusText
    });
  },

  async reload() {
    this.setData({
      loading: true,
      errorMsg: ''
    });

    this.loadLocalUserInfo();

    try {
      const [
        profileRaw,
        overviewRaw,
        pointSummary,
        healthLatest,
        healthPage,
        myChallenges
      ] = await Promise.all([
        auth.profile().catch(() => null),
        request.get('/api/dashboard/overview').catch(() => ({})),
        pointsApi.myPointSummary().catch(() => ({ totalPoints: 0 })),
        request.get('/api/health/latest', { limit: 100 }).catch(() => []),
        request.get('/api/health/page', { pageNum: 1, pageSize: 100 }).catch(() => ({})),
        request.get('/api/challenge/my/list').catch(() => [])
      ]);

      if (profileRaw) {
        if (auth.setUserInfo) {
          auth.setUserInfo(profileRaw);
        } else {
          wx.setStorageSync('userInfo', profileRaw);
          if (profileRaw.id) {
            wx.setStorageSync('userId', profileRaw.id);
          }
        }
        this.applyUserInfo(profileRaw);
      }

      const overview = this.normalizeOverview(
        overviewRaw || {},
        pointSummary || {},
        healthLatest,
        healthPage || {},
        myChallenges
      );

      const trendList = this.buildTrendFromHealth(healthLatest, healthPage);

      this.setData({
        overview,
        trendList
      });

      this.drawTrendChart(trendList);
    } catch (e) {
      console.error('[dashboard] reload fail =', e);
      this.setData({
        errorMsg: (e && e.msg) || (e && e.message) || '加载失败，请检查接口/网络/Token'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  getArrayFromAny(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.records)) return raw.records;
    if (raw && Array.isArray(raw.list)) return raw.list;
    if (raw && raw.data) {
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.data.records)) return raw.data.records;
      if (Array.isArray(raw.data.list)) return raw.data.list;
    }
    return [];
  },

  getTotalFromAny(raw) {
    if (!raw) return 0;
    if (typeof raw.total === 'number') return raw.total;
    if (raw.data && typeof raw.data.total === 'number') return raw.data.total;
    return 0;
  },

  normalizeOverview(o, pointSummary, healthLatest, healthPage, myChallenges) {
    const pickNum = (...keys) => {
      for (const k of keys) {
        const v = o && o[k];
        if (typeof v === 'number') return v;
      }
      return 0;
    };

    const pointTotal =
      (pointSummary && (
        pointSummary.totalPoints ||
        pointSummary.total ||
        pointSummary.points ||
        pointSummary.score
      )) || 0;

    const latestList = this.getArrayFromAny(healthLatest);
    const pageList = this.getArrayFromAny(healthPage);
    const pageTotal = this.getTotalFromAny(healthPage);

    const totalRecords =
      pageTotal ||
      pageList.length ||
      latestList.length ||
      pickNum('totalRecords', 'total', 'recordsTotal');

    const today = this.formatDate(new Date());
    const todayRecords = latestList.filter(item => {
      const t = item && (item.recordDate || item.createTime || item.updateTime || '');
      return String(t).slice(0, 10) === today;
    }).length;

    const challengeList = this.getArrayFromAny(myChallenges);
    const activeChallenges = challengeList.filter(item => {
      return !(item.finished === 1 || item.finished === true);
    }).length;

    return {
      totalRecords: Number(totalRecords || 0),
      todayRecords: Number(todayRecords || pickNum('todayRecords', 'today', 'todayTotal') || 0),
      activeChallenges: Number(activeChallenges || pickNum('activeChallenges', 'challenges', 'challengeActive') || 0),
      totalPoints: Number(pointTotal || 0)
    };
  },

  buildTrendFromHealth(healthLatest, healthPage) {
    const latestList = this.getArrayFromAny(healthLatest);
    const pageList = this.getArrayFromAny(healthPage);
    const sourceList = latestList.length ? latestList : pageList;

    const last7Days = [];
    const countMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const full = this.formatDate(d);
      const short = full.slice(5);
      last7Days.push({ full, short });
      countMap[full] = 0;
    }

    sourceList.forEach(item => {
      const rawDate = item && (item.recordDate || item.createTime || item.updateTime || '');
      const day = String(rawDate).slice(0, 10);
      if (countMap.hasOwnProperty(day)) {
        countMap[day] += 1;
      }
    });

    return last7Days.map(x => ({
      date: x.short,
      fullDate: x.full,
      value: countMap[x.full] || 0
    }));
  },

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  drawTrendChart(list) {
    try {
      const query = wx.createSelectorQuery().in(this);
      query.select('#trendCanvas').fields({ node: true, size: true }).exec((res) => {
        const item = res && res[0];
        const canvas = item && item.node;
        if (!canvas || !item.width || !item.height) return;

        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio || 1;

        canvas.width = item.width * dpr;
        canvas.height = item.height * dpr;
        ctx.scale(dpr, dpr);

        const width = item.width;
        const height = item.height;

        ctx.clearRect(0, 0, width, height);

        if (!list || list.length === 0) {
          ctx.fillStyle = '#999';
          ctx.font = '14px sans-serif';
          ctx.fillText('暂无趋势数据', 20, 40);
          return;
        }

        const values = list.map(x => Number(x.value || 0));
        const maxV = Math.max.apply(null, values.concat([1]));
        const minV = 0;

        const padTop = 20;
        const padBottom = 30;
        const padLeft = 20;
        const padRight = 10;
        const w = width - padLeft - padRight;
        const h = height - padTop - padBottom;

        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        ctx.beginPath();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;

        values.forEach((v, i) => {
          const x = values.length === 1
            ? padLeft + w / 2
            : padLeft + (w * i) / (values.length - 1);
          const y = padTop + h - ((v - minV) / (maxV - minV || 1)) * h;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        values.forEach((v, i) => {
          const x = values.length === 1
            ? padLeft + w / 2
            : padLeft + (w * i) / (values.length - 1);
          const y = padTop + h - ((v - minV) / (maxV - minV || 1)) * h;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        list.forEach((item, i) => {
          const x = list.length === 1
            ? padLeft + w / 2
            : padLeft + (w * i) / (list.length - 1);
          ctx.fillText(item.date, x - 14, height - 8);
        });
      });
    } catch (e) {
      console.log('[dashboard] draw chart fail', e);
    }
  },

  goCommunity() {
    wx.navigateTo({ url: '/pages/social/list/list' });
  },

  goAssessment() {
    wx.navigateTo({ url: '/pages/assessment/index/index' });
  },

  goRecommend() {
    wx.navigateTo({ url: '/pages/recommend/today/index' });
  },

  goChallenge() {
    wx.navigateTo({ url: '/pages/challenge/list/list' });
  },

  goPoints() {
    wx.navigateTo({ url: '/pages/points/index/index' });
  },

  goHealthRecord() {
    wx.navigateTo({ url: '/pages/health/record/record' });
  },

  goMessages() {
    wx.navigateTo({ url: '/pages/message/list/list' });
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确认退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;

        const app = getApp();
        if (app && typeof app.logoutAndJump === 'function') {
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          setTimeout(() => {
            app.logoutAndJump();
          }, 250);
          return;
        }

        if (auth.clearToken) {
          auth.clearToken();
        } else {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userId');
          wx.removeStorageSync('userInfo');
        }

        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  }
});