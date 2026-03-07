const api = require('../../api/challenge.js');

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

  toBool(v) {
    return v === true || v === 1 || v === '1';
  },

  async loadAll() {
    this.setData({ loading: true, errMsg: '' });

    try {
      const detailRes = await api.challengeDetail(this.data.id);
      console.log('[challenge] detailRes =', detailRes);

      const detail = detailRes.challenge || detailRes.detail || detailRes;

      const joined = this.toBool(detailRes.joined ?? detail.joined ?? detail.isJoined);
      const finished = this.toBool(detailRes.finished ?? detail.finished ?? detail.isFinished);
      const progressValue = Number(detailRes.myProgress ?? detailRes.progressValue ?? detail.progressValue ?? 0);

      let progressRankList = [];
      let finishRankList = [];
      let myProgressRank = null;
      let myFinishRank = null;

      try {
        progressRankList = await api.progressTop(this.data.id, 10);
      } catch (e) {
        console.log('[challenge] progressTop fail', e);
      }

      try {
        finishRankList = await api.finishTop(this.data.id, 10);
      } catch (e) {
        console.log('[challenge] finishTop fail', e);
      }

      try {
        myProgressRank = await api.myProgressRank(this.data.id);
      } catch (e) {
        console.log('[challenge] myProgressRank fail', e);
      }

      try {
        myFinishRank = await api.myFinishRank(this.data.id);
      } catch (e) {
        console.log('[challenge] myFinishRank fail', e);
      }

      this.setData({
        detail,
        joined,
        finished,
        progressValue,
        progressRankList: Array.isArray(progressRankList) ? progressRankList : [],
        finishRankList: Array.isArray(finishRankList) ? finishRankList : [],
        myProgressRank,
        myFinishRank
      });
    } catch (e) {
      this.setData({ errMsg: e.msg || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onProgressInput(e) {
    this.setData({ progressInput: e.detail.value || '' });
  },

  async joinNow() {
    try {
      await api.joinChallenge(this.data.id);
      wx.showToast({ title: '报名成功', icon: 'success' });
      await this.loadAll();
    } catch (e) {
      wx.showToast({ title: e.msg || '报名失败', icon: 'none' });
    }
  },

  async saveProgress() {
    const value = Number(this.data.progressInput || 0);
    if (!value) {
      wx.showToast({ title: '请输入进度值', icon: 'none' });
      return;
    }

    try {
      await api.updateProgress({
        challengeId: this.data.id,
        progressValue: value
      });
      wx.showToast({ title: '进度已更新', icon: 'success' });
      this.setData({ progressInput: '' });
      await this.loadAll();
    } catch (e) {
      wx.showToast({ title: e.msg || '更新失败', icon: 'none' });
    }
  },

  async finishNow() {
    try {
      await api.finishChallenge(this.data.id);
      wx.showToast({ title: '挑战完成', icon: 'success' });
      await this.loadAll();
    } catch (e) {
      wx.showToast({ title: e.msg || '完成失败', icon: 'none' });
    }
  }
});