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
        if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
      }
      return 0;
    };

    return {
      totalRecords: pickNum("totalRecords", "recordCount", "totalRecord", "total"),
      todayRecords: pickNum("todayRecords", "todayCount", "todayRecord", "today"),
      activeChallenges: pickNum("activeChallenges", "challengeActive", "ongoingChallenges", "challengeCount"),
      totalPoints: pickNum("totalPoints", "pointsTotal", "points", "score"),
    };
  },

  // trend 可能是数组，也可能是 {list: []} / {data: []}
  normalizeTrend(raw) {
    let arr = raw;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      arr = raw.list || raw.data || raw.items || [];
    }
    if (!Array.isArray(arr)) return [];

    // 兼容字段 date/day/time + value/count/weight
    const out = arr
      .map((it) => {
        const date = it.date || it.day || it.time || it.label || "";
        const value =
          (typeof it.value === "number" && it.value) ||
          (typeof it.count === "number" && it.count) ||
          (typeof it.weight === "number" && it.weight) ||
          (typeof it.kcal === "number" && it.kcal) ||
          (typeof it.value === "string" && Number(it.value)) ||
          0;
        return { date: String(date), value: Number(value) || 0 };
      })
      .filter((x) => x.date);

    // 如果后端没给 date，只给了 7 个数字，也兜底
    if (out.length === 0 && arr.length > 0 && typeof arr[0] === "number") {
      return arr.map((v, idx) => ({ date: `Day${idx + 1}`, value: Number(v) || 0 }));
    }

    return out;
  },

  // 画一个轻量折线图（不依赖第三方库）
  drawTrendChart(list) {
    const query = wx.createSelectorQuery();
    query.select("#trendCanvas").fields({ node: true, size: true }).exec((res) => {
      const canvas = res?.[0]?.node;
      const width = res?.[0]?.width || 300;
      const height = res?.[0]?.height || 160;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const dpr = wx.getSystemInfoSync().pixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // 清空
      ctx.clearRect(0, 0, width, height);

      // 背景
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, width, height);

      // 没数据就画提示
      if (!list || list.length < 2) {
        ctx.fillStyle = "#888";
        ctx.font = "14px sans-serif";
        ctx.fillText("暂无趋势数据", 12, 28);
        return;
      }

      const padding = 18;
      const chartW = width - padding * 2;
      const chartH = height - padding * 2;

      const values = list.map((x) => x.value);
      let minV = Math.min(...values);
      let maxV = Math.max(...values);
      if (minV === maxV) {
        // 避免除 0
        minV = minV - 1;
        maxV = maxV + 1;
      }

      const xStep = chartW / (list.length - 1);
      const yOf = (v) => padding + (maxV - v) * (chartH / (maxV - minV));

      // 网格线
      ctx.strokeStyle = "#eeeeee";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartW, y);
        ctx.stroke();
      }

      // 折线
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      list.forEach((p, i) => {
        const x = padding + xStep * i;
        const y = yOf(p.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 点
      ctx.fillStyle = "#111";
      list.forEach((p, i) => {
        const x = padding + xStep * i;
        const y = yOf(p.value);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // 标注 min/max
      ctx.fillStyle = "#666";
      ctx.font = "12px sans-serif";
      ctx.fillText(`max: ${maxV}`, padding, 14);
      ctx.fillText(`min: ${minV}`, padding, height - 6);
    });
  },
});