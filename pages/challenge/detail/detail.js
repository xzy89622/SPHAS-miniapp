const challengeApi = require('../../api/challenge');

Page({
  data: {
    id: null,
    loading: false,
    saving: false,

    detail: null,
    myJoin: null,

    progressTopList: [],
    finishTopList: [],
    myProgressRank: null,
    myFinishRank: null,

    progressInput: ''
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    if (!id) {
      wx.showToast({
        title: '挑战ID无效',
        icon: 'none'
      });
      return;
    }

    this.setData({ id });
    this.reloadAll();
  },

  onPullDownRefresh() {
    this.reloadAll().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async reloadAll() {
    if (!this.data.id) return;

    this.setData({
      loading: true
    });

    try {
      const id = this.data.id;

      const [
        detailRes,
        myListRes,
        progressTopRes,
        finishTopRes,
        myProgressRes,
        myFinishRes
      ] = await Promise.all([
        challengeApi.challengeDetail(id).catch(() => null),
        challengeApi.myChallenges().catch(() => ({ records: [] })),
        challengeApi.progressTop(id, 10).catch(() => []),
        challengeApi.finishTop(id, 10).catch(() => []),
        challengeApi.myProgressRank(id).catch(() => null),
        challengeApi.myFinishRank(id).catch(() => null)
      ]);

      const myList = Array.isArray(myListRes.records) ? myListRes.records : [];
      const myJoin = myList.find(item => Number(item.challengeId) === Number(id)) || null;

      this.setData({
        detail: detailRes,
        myJoin,
        progressTopList: Array.isArray(progressTopRes) ? progressTopRes : [],
        finishTopList: Array.isArray(finishTopRes) ? finishTopRes : [],
        myProgressRank: myProgressRes,
        myFinishRank: myFinishRes,
        progressInput: myJoin && myJoin.progressValue != null ? String(myJoin.progressValue) : ''
      });
    } catch (e) {
      console.error('[challenge detail] reload fail =', e);
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

  onProgressInput(e) {
    this.setData({
      progressInput: e.detail.value
    });
  },

  // 参加挑战
  async onJoin() {
    if (!this.data.id) return;

    try {
      await challengeApi.joinChallenge(this.data.id);

      wx.showToast({
        title: '参加成功',
        icon: 'success'
      });

      await this.reloadAll();
    } catch (e) {
      console.error('[challenge detail] join fail =', e);
      wx.showToast({
        title: e.msg || e.message || '参加失败',
        icon: 'none'
      });
    }
  },

  // 保存进度
  async onSaveProgress() {
    if (!this.data.myJoin) {
      wx.showToast({
        title: '请先参加挑战',
        icon: 'none'
      });
      return;
    }

    const progressValue = Number((this.data.progressInput || '').trim());
    if (Number.isNaN(progressValue) || progressValue < 0) {
      wx.showToast({
        title: '请输入正确进度',
        icon: 'none'
      });
      return;
    }

    this.setData({
      saving: true
    });

    try {
      await challengeApi.updateProgress({
        challengeId: this.data.id,
        progressValue
      });

      wx.showToast({
        title: '进度已更新',
        icon: 'success'
      });

      await this.reloadAll();
    } catch (e) {
      console.error('[challenge detail] save progress fail =', e);
      wx.showToast({
        title: e.msg || e.message || '更新失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        saving: false
      });
    }
  },

  // 完成挑战
  async onFinish() {
    if (!this.data.myJoin) {
      wx.showToast({
        title: '请先参加挑战',
        icon: 'none'
      });
      return;
    }

    try {
      await challengeApi.finishChallenge(this.data.id);

      wx.showToast({
        title: '挑战已完成',
        icon: 'success'
      });

      await this.reloadAll();
    } catch (e) {
      console.error('[challenge detail] finish fail =', e);
      wx.showToast({
        title: e.msg || e.message || '完成失败',
        icon: 'none'
      });
    }
  }
});