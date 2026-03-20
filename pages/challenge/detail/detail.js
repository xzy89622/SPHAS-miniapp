const challengeApi = require('../../api/challenge');

function formatDateText(v) {
  if (!v) return '-';
  return String(v).slice(0, 10);
}

function formatDateTimeText(v) {
  if (!v) return '';
  return String(v).replace('T', ' ').slice(0, 19);
}

function mapTypeText(type) {
  const map = {
    STEP: '步数挑战',
    RUN: '跑步挑战',
    DIET: '饮食挑战',
    CUSTOM: '自定义挑战'
  };
  return map[type] || type || '健康挑战';
}

function toBool(v) {
  return v === true || v === 1 || v === '1';
}

// 把后端详情接口返回的数据整理一下
function normalizeDetail(res) {
  const raw = res || {};
  const challenge = raw.challenge || raw || {};

  return {
    id: challenge.id || raw.id || null,
    title: challenge.title || raw.title || '',
    description: challenge.description || raw.description || '',
    type: challenge.type || raw.type || '',
    typeText: mapTypeText(challenge.type || raw.type),
    targetValue: Number(challenge.targetValue || raw.targetValue || 0),
    rewardPoints: Number(challenge.rewardPoints || raw.rewardPoints || 0),
    startDate: formatDateText(challenge.startDate || raw.startDate),
    endDate: formatDateText(challenge.endDate || raw.endDate),
    joined: toBool(raw.joined),
    myProgress: Number(raw.myProgress || 0),
    finished: toBool(raw.finished)
  };
}

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

      const detail = normalizeDetail(detailRes);

      const myList = Array.isArray(myListRes.records) ? myListRes.records : [];
      const myJoin = myList.find(item => Number(item.challengeId) === Number(id)) || null;

      this.setData({
        detail,
        myJoin: myJoin
          ? {
              ...myJoin,
              progressValue: Number(myJoin.progressValue || 0),
              finished: toBool(myJoin.finished),
              finishTime: formatDateTimeText(myJoin.finishTime)
            }
          : null,
        progressTopList: Array.isArray(progressTopRes) ? progressTopRes : [],
        finishTopList: Array.isArray(finishTopRes)
          ? finishTopRes.map(item => ({
              ...item,
              finishTime: formatDateTimeText(item.finishTime)
            }))
          : [],
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