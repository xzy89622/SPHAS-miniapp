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

function calcPercent(progressValue, targetValue) {
  const progress = Number(progressValue || 0);
  const target = Number(targetValue || 0);
  if (!target || target <= 0) return 0;
  let p = Math.round((progress / target) * 100);
  if (p < 0) p = 0;
  if (p > 100) p = 100;
  return p;
}

Page({
  data: {
    loading: false,
    errMsg: '',
    list: [],
    finishedCount: 0
  },

  onLoad() {
    const app = getApp();
    if (!app || typeof app.requireLogin !== 'function') return;
    if (!app.requireLogin()) return;
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh());
  },

  async loadList() {
    this.setData({
      loading: true,
      errMsg: '',
      list: []
    });

    try {
      const joinRes = await api.myChallenges();
      const joinList = Array.isArray(joinRes.records) ? joinRes.records : [];

      if (joinList.length === 0) {
        this.setData({
          list: [],
          finishedCount: 0
        });
        return;
      }

      const detailTasks = joinList.map(async (join) => {
        try {
          const detailRes = await api.challengeDetail(join.challengeId);
          const ch = detailRes && detailRes.challenge ? detailRes.challenge : {};

          const targetValue = Number(ch.targetValue || ch.target_value || ch.target || 0);
          const progressValue = Number(join.progressValue || join.progress_value || 0);
          const percent = calcPercent(progressValue, targetValue);

          return {
            id: ch.id || join.challengeId,
            title: ch.title || '挑战',
            description: ch.description || '暂无描述',
            type: ch.type,
            typeText: mapTypeText(ch.type),
            targetValue,
            rewardPoints: Number(ch.rewardPoints || ch.reward_points || ch.points || 0),
            startDateText: formatDateText(ch.startDate || ch.start_date || ch.startTime),
            endDateText: formatDateText(ch.endDate || ch.end_date || ch.endTime),
            joined: true,
            finished: toBool(join.finished),
            progressValue,
            progressPercent: percent,
            progressBarStyle: `width:${percent}%;`
          };
        } catch (e) {
          return null;
        }
      });

      const detailList = await Promise.all(detailTasks);
      const finalList = detailList.filter(Boolean);
      const finishedCount = finalList.filter(item => item.finished).length;

      this.setData({
        list: finalList,
        finishedCount
      });
    } catch (e) {
      console.error('[challenge my] load fail =', e);
      this.setData({
        errMsg: e.msg || e.message || '加载失败'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.navigateTo({
      url: `/pages/challenge/detail/detail?id=${id}`
    });
  }
});