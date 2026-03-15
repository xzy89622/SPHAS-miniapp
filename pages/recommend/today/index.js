const recommendApi = require('../../api/recommend');

Page({
  data: {
    loading: false,
    saving: false,
    adopting: false,

    recommend: null,
    currentPlan: null,

    checkin: {
      dietDone: 0,
      sportDone: 0,
      remark: ''
    }
  },

  onLoad() {
    this.reloadAll();
  },

  onPullDownRefresh() {
    this.reloadAll().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async reloadAll() {
    this.setData({
      loading: true
    });

    try {
      const [recommendRes, currentPlanRes, todayCheckinRes] = await Promise.all([
        recommendApi.getTodayRecommend().catch(() => null),
        recommendApi.getCurrentPlan().catch(() => ({})),
        recommendApi.getTodayCheckin().catch(() => ({}))
      ]);

      this.setData({
        recommend: this.normalizeRecommend(recommendRes),
        currentPlan: this.normalizePlan(currentPlanRes),
        checkin: {
          dietDone: todayCheckinRes && todayCheckinRes.dietDone ? 1 : 0,
          sportDone: todayCheckinRes && todayCheckinRes.sportDone ? 1 : 0,
          remark: (todayCheckinRes && todayCheckinRes.remark) || ''
        }
      });
    } catch (e) {
      console.error('[recommend] reload fail =', e);
      wx.showToast({
        title: e.msg || e.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  normalizeRecommend(raw) {
    if (!raw) return null;

    return {
      bmi: raw.bmi == null ? '--' : raw.bmi,
      bmiLevel: raw.bmiLevel || '未知',
      scores: raw.scores || {},
      reason: raw.reason || '',
      diet: raw.diet || null,
      sport: raw.sport || null
    };
  },

  normalizePlan(raw) {
    if (!raw || !raw.id) return null;

    return {
      id: raw.id,
      startDate: raw.startDate || '',
      endDate: raw.endDate || '',
      status: raw.status || '',
      diet: raw.diet || null,
      sport: raw.sport || null
    };
  },

  async onRefreshRecommend() {
    if (this.data.loading) return;

    wx.showLoading({
      title: '生成中'
    });

    try {
      await recommendApi.refreshTodayRecommend({});
      await this.reloadAll();

      wx.showToast({
        title: '已刷新推荐',
        icon: 'success'
      });
    } catch (e) {
      console.error('[recommend] refresh fail =', e);
      wx.showToast({
        title: e.msg || e.message || '刷新失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  async onAdoptPlan() {
    if (this.data.adopting) return;

    this.setData({
      adopting: true
    });

    try {
      await recommendApi.adoptTodayPlan();
      await this.reloadAll();

      wx.showToast({
        title: '已采纳方案',
        icon: 'success'
      });
    } catch (e) {
      console.error('[recommend] adopt fail =', e);
      wx.showToast({
        title: e.msg || e.message || '采纳失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        adopting: false
      });
    }
  },

  onToggleDietDone() {
    this.setData({
      'checkin.dietDone': this.data.checkin.dietDone ? 0 : 1
    });
  },

  onToggleSportDone() {
    this.setData({
      'checkin.sportDone': this.data.checkin.sportDone ? 0 : 1
    });
  },

  onRemarkInput(e) {
    this.setData({
      'checkin.remark': e.detail.value
    });
  },

  async onSaveCheckin() {
    if (this.data.saving) return;

    if (!this.data.currentPlan || !this.data.currentPlan.id) {
      wx.showToast({
        title: '请先采纳今日方案',
        icon: 'none'
      });
      return;
    }

    this.setData({
      saving: true
    });

    try {
      await recommendApi.saveTodayCheckin({
        dietDone: this.data.checkin.dietDone ? 1 : 0,
        sportDone: this.data.checkin.sportDone ? 1 : 0,
        remark: (this.data.checkin.remark || '').trim()
      });

      wx.showToast({
        title: '打卡成功',
        icon: 'success'
      });

      await this.reloadAll();
    } catch (e) {
      console.error('[recommend] save checkin fail =', e);
      wx.showToast({
        title: e.msg || e.message || '打卡失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        saving: false
      });
    }
  }
});