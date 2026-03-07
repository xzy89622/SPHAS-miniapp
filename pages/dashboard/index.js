const api = require("../../utils/request");

Page({
  data: {
    loading: false,
    errorMsg: "",
    overview: {
      totalRecords: 0,
      todayRecords: 0,
      activeChallenges: 0,
      totalPoints: 0,
    },
    trendList: [], // [{date, value}]
  },

  async onLoad() {
    await this.reload();
  },

  async onPullDownRefresh() {
    await this.reload();
    wx.stopPullDownRefresh();
  },

  async reload() {
    this.setData({ loading: true, errorMsg: "" });
    try {
      const [overviewRaw, trendRaw] = await Promise.all([
        api.get("/api/dashboard/overview"),
        api.get("/api/dashboard/trend"),
      ]);

      const overview = this.normalizeOverview(overviewRaw || {});
      const trendList = this.normalizeTrend(trendRaw);

      this.setData({ overview, trendList });
      this.drawTrendChart(trendList);
    } catch (e) {
      console.error(e);
      this.setData({ errorMsg: e?.message || "加载失败，请检查接口/网络/Token" });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 尽可能兼容不同字段名
  normalizeOverview(o) {
    const pickNum = (...keys) => {
      for (const k of keys) {
        const v = o?.[k];
        if (typeof v === "number") return v;
      }
      return 0;
    };

    return {
      totalRecords: pickNum("totalRecords", "total", "recordsTotal"),
      todayRecords: pickNum("todayRecords", "today", "todayTotal"),
      activeChallenges: pickNum("activeChallenges", "challenges", "challengeActive"),
      totalPoints: pickNum("totalPoints", "points", "pointsTotal"),
    };
  },

  normalizeTrend(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.list)) return raw.list;
    if (raw && Array.isArray(raw.records)) return raw.records;
    return [];
  },

  async drawTrendChart(list) {
    // 原文件已有绘制逻辑（你不用动）
    try {
      const query = wx.createSelectorQuery().in(this);
      query.select("#trendCanvas").fields({ node: true, size: true }).exec((res) => {
        const canvas = res?.[0]?.node;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const dpr = wx.getWindowInfo().pixelRatio || 1;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, res[0].width, res[0].height);

        if (!list || list.length === 0) {
          ctx.fillText("暂无趋势数据", 20, 40);
          return;
        }

        const values = list.map((x) => Number(x.value || 0));
        const maxV = Math.max(...values, 1);
        const minV = Math.min(...values, 0);

        const pad = 20;
        const w = res[0].width - pad * 2;
        const h = res[0].height - pad * 2;

        ctx.beginPath();
        values.forEach((v, i) => {
          const x = pad + (w * i) / (values.length - 1);
          const y = pad + h - ((v - minV) / (maxV - minV || 1)) * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    } catch (e) {
      console.log("draw chart fail", e);
    }
  },

  // ✅ 新增：快捷入口跳转
  goCommunity() {
    wx.navigateTo({ url: "/pages/social/list/list" });
  },
  goAssessment() {
    wx.navigateTo({ url: "/pages/assessment/index/index" });
  },
  goRecommend() {
    wx.navigateTo({ url: "/pages/recommend/today/index" });
  },
  goChallenge() {
    wx.navigateTo({ url: "/pages/challenge/list/list" });
  },
  goPoints() {
    wx.navigateTo({ url: "/pages/points/index/index" });
  },
});