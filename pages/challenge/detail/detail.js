const api = require('../../api/challenge.js');

function formatDateText(v) {
  if (!v) return '-';
  return String(v).slice(0, 10);
}

function mapTypeText(type) {
  const map = {
    STEP: '步数挑战',
    RUN: '跑步挑战',
    DIET: '饮食挑战'
  };
  return map[type] || type || '健康挑战';
}

function toBool(v) {
  return v === true || v === 1 || v === '1';
}

function pickUserName(item) {
  return item.nickname || item.userName || item.username || `用户${item.userId || ''}`;
}

Page({
  data: {
    id: 0,
    loading: true,
    errMsg: '',
    detail: null,

    joined: false,
    finished: false,
    progressValue: 0,
    progressInput: '',

    progressPercent: 0,
    progressRankList: [],
    finishRankList: [],
    myProgressRank: null,
    myFinishRank: null
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    this.setData({ id });
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  async loadAll() {
    this.setData({
      loading: true,
      errMsg: ''
    });

    try {
      const detailRes = await api.challengeDetail(this.data.id);
      const detailRaw = detailRes.challenge || detailRes.detail || detailRes || {};

      const detail = {
        ...detailRaw,
        typeText: mapTypeText(detailRaw.type),
        targetValue: Number(detailRaw.targetValue || detailRaw.target_value || detailRaw.target || 0),
        rewardPoints: Number(detailRaw.rewardPoints || detailRaw.reward_points || detailRaw.points || 0),
        startDateText: formatDateText(detailRaw.startDate || detailRaw.start_date || detailRaw.startTime),
        endDateText: formatDateText(detailRaw.endDate || detailRaw.end_date || detailRaw.endTime)
      };

      const joined = toBool(detailRes.joined ?? detail.joined ?? detail.isJoined);
      const finished = toBool(detailRes.finished ?? detail.finished ?? detail.isFinished);
      const progressValue = Number(
        detailRes.myProgress ??
        detailRes.progressValue ??
        detail.progressValue ??
        detail.progress_value ??
        0
      );

      const progressPercent = detail.targetValue
        ? Math.min(100, Math.round((progressValue / detail.targetValue) * 100))
        : 0;

      let progressRankList = [];
      let finishRankList = [];
      let myProgressRank = null;
      let myFinishRank = null;

      try {
        progressRankList = await api.progressTop(this.data.id, 10);
      } catch (e) {
        console.error('[challenge] progressTop fail =', e);
      }

      try {
        finishRankList = await api.finishTop(this.data.id, 10);
      } catch (e) {
        console.error('[challenge] finishTop fail =', e);
      }

      try {
        myProgressRank = await api.myProgressRank(this.data.id);
      } catch (e) {
        console.error('[challenge] myProgressRank fail =', e);
      }

      try {
        myFinishRank = await api.myFinishRank(this.data.id);
      } catch (e) {
        console.error('[challenge] myFinishRank fail =', e);
      }

      const finalProgressRankList = (Array.isArray(progressRankList) ? progressRankList : []).map((item, index) => ({
        ...item,
        rankText: item.rank ? item.rank : (index + 1),
        userText: pickUserName(item),
        scoreText: item.score ? item.score : (item.progressValue ? item.progressValue : 0)
      }));

      const finalFinishRankList = (Array.isArray(finishRankList) ? finishRankList : []).map((item, index) => ({
        ...item,
        rankText: item.rank ? item.rank : (index + 1),
        userText: pickUserName(item),
        scoreText: item.score ? item.score : (item.finishTime ? item.finishTime : 0)
      }));

      this.setData({
        detail,
        joined,
        finished,
        progressValue,
        progressPercent,
        progressRankList: finalProgressRankList,
        finishRankList: finalFinishRankList,
        myProgressRank,
        myFinishRank
      });
    } catch (e) {
      console.error('[challenge detail] load fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '加载失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onProgressInput(e) {
    this.setData({
      progressInput: e.detail.value || ''
    });
  },

  async joinNow() {
    try {
      wx.showLoading({ title: '报名中' });
      await api.joinChallenge(this.data.id);
      wx.hideLoading();

      wx.showToast({
        title: '报名成功',
        icon: 'success'
      });

      await this.loadAll();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: e.msg || e.message || '报名失败',
        icon: 'none'
      });
    }
  },

  async saveProgress() {
    const value = Number(this.data.progressInput || 0);
    if (!value || value < 0) {
      wx.showToast({
        title: '请输入正确进度值',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '保存中' });
      await api.updateProgress({
        challengeId: this.data.id,
        progressValue: value
      });
      wx.hideLoading();

      wx.showToast({
        title: '进度已更新',
        icon: 'success'
      });

      this.setData({ progressInput: '' });
      await this.loadAll();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: e.msg || e.message || '更新失败',
        icon: 'none'
      });
    }
  },

  fillTarget() {
    const targetValue = this.data.detail ? this.data.detail.targetValue : 0;
    this.setData({
      progressInput: String(targetValue || '')
    });
  },

  async finishNow() {
    try {
      wx.showLoading({ title: '提交中' });
      await api.finishChallenge(this.data.id);
      wx.hideLoading();

      wx.showToast({
        title: '挑战完成',
        icon: 'success'
      });

      await this.loadAll();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: e.msg || e.message || '完成失败',
        icon: 'none'
      });
    }
  }
});