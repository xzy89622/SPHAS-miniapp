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
        myChallenges,
        trendRaw
      ] = await Promise.all([
        auth.profile().catch(() => null),
        request.get('/api/dashboard/overview').catch(() => ({})),
        pointsApi.myPointSummary().catch(() => ({ totalPoints: 0 })),
        request.get('/api/health/latest', { limit: 100 }).catch(() => []),
        request.get('/api/challenge/my').catch(() => []),
        request.get('/api/dashboard/trend', { days: 7 }).catch(() => [])
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
        healthLatest || [],
        myChallenges || []
      );

      const trendList = this.normalizeTrend(trendRaw || []);

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

  pickNumber(obj, keys, defaultValue = 0) {
    const source = obj || {};
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
    }
    return defaultValue;
  },

  normalizeOverview(overviewRaw, pointSummary, healthLatest, myChallenges) {
    const latestList = this.getArrayFromAny(healthLatest);
    const challengeList = this.getArrayFromAny(myChallenges);

    const totalPoints =
      (pointSummary && (
        pointSummary.totalPoints ||
        pointSummary.total ||
        pointSummary.points ||
        pointSummary.score
      )) || 0;

    const totalRecordsFallback = latestList.length;

    const today = this.formatDate(new Date());
    const todayRecordsFallback = latestList.filter(item => {
      const t = item && (item.recordDate || item.createTime || item.updateTime || '');
      return String(t).slice(0, 10) === today;
    }).length;

    const activeChallengesFallback = challengeList.filter(item => {
      return !(item.finished === 1 || item.finished === true);
    }).length;

    const stats7 = overviewRaw && overviewRaw.stats7days ? overviewRaw.stats7days : {};
    const latest = overviewRaw && overviewRaw.latest ? overviewRaw.latest : {};

    const totalRecords = this.pickNumber(
      overviewRaw,
      ['totalRecords', 'total', 'recordsTotal'],
      totalRecordsFallback
    );

    const todayRecords = this.pickNumber(
      overviewRaw,
      ['todayRecords', 'today', 'todayTotal'],
      this.pickNumber(stats7, ['count'], todayRecordsFallback)
    );

    const activeChallenges = this.pickNumber(
      overviewRaw,
      ['activeChallenges', 'challenges', 'challengeActive'],
      activeChallengesFallback
    );

    return {
      totalRecords: Number(totalRecords || 0),
      todayRecords: Number(todayRecords || 0),
      activeChallenges: Number(activeChallenges || 0),
      totalPoints: Number(totalPoints || 0),
      latestBmi: latest && latest.bmi ? Number(latest.bmi) : 0
    };
  },

  normalizeTrend(raw) {
    const list = this.getArrayFromAny(raw);

    if (!list.length) {
      return [];
    }

    const last7Days = [];
    const valueMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const full = this.formatDate(d);
      const short = full.slice(5);
      last7Days.push({ full, short });
      valueMap[full] = null;
    }

    list.forEach(item => {
      const fullTime = item && item.time ? String(item.time) : '';
      const fullDate = fullTime.slice(0, 10);
      if (!valueMap.hasOwnProperty(fullDate)) return;

      const value = this.pickTrendValue(item);
      if (value === null || value === undefined || Number.isNaN(value)) return;

      valueMap[fullDate] = Number(value);
    });

    return last7Days.map(x => ({
      date: x.short,
      fullDate: x.full,
      value: valueMap[x.full] == null ? 0 : valueMap[x.full]
    }));
  },

  pickTrendValue(item) {
    if (!item) return null;

    const bmi = Number(item.bmi);
    if (!Number.isNaN(bmi) && bmi > 0) return bmi;

    const weightKg = Number(item.weightKg);
    if (!Number.isNaN(weightKg) && weightKg > 0) return weightKg;

    const steps = Number(item.steps);
    if (!Number.isNaN(steps) && steps > 0) return steps;

    const sleepHours = Number(item.sleepHours);
    if (!Number.isNaN(sleepHours) && sleepHours > 0) return sleepHours;

    const bloodSugar = Number(item.bloodSugar);
    if (!Number.isNaN(bloodSugar) && bloodSugar > 0) return bloodSugar;

    return null;
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
        const minV = Math.min.apply(null, values.concat([0]));

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

          const y = padTop + h - ((v - minV) / ((maxV - minV) || 1)) * h;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        values.forEach((v, i) => {
          const x = values.length === 1
            ? padLeft + w / 2
            : padLeft + (w * i) / (values.length - 1);

          const y = padTop + h - ((v - minV) / ((maxV - minV) || 1)) * h;

          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        list.forEach((point, i) => {
          const x = list.length === 1
            ? padLeft + w / 2
            : padLeft + (w * i) / (list.length - 1);
          ctx.fillText(point.date, x - 14, height - 8);
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