const request = require('../../../utils/request');

Page({
  data: {
    loading: false,
    submitting: false,
    questions: [],
    answers: {},
    result: null,
    metricInfo: null
  },

  onLoad() {
    this.initPage();
  },

  async initPage() {
    this.setData({
      loading: true,
      result: null
    });

    try {
      await Promise.all([
        this.loadQuestions(),
        this.preloadLatestMetric()
      ]);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadQuestions() {
    try {
      const list = await request.get('/api/questions/list');
      const raw = Array.isArray(list) ? list : (list.list || list.records || []);

      const questions = raw.map((q, idx) => {
        const qid = q.id || q.questionId || q.qid || (`q_${idx}`);
        const questionText = q.questionText || q.title || q.question || q.content || (`题目${idx + 1}`);
        const options = this._parseOptions(q.optionsJson, qid);
        const uiType = this._inferUiType(questionText, options);
        return { ...q, id: qid, questionText, options, uiType };
      });

      this.setData({ questions });
    } catch (e) {
      console.log('[assessment] loadQuestions fail', e);
      wx.showToast({ title: '题目加载失败', icon: 'none' });
    }
  },

  async preloadLatestMetric() {
    try {
      const metric = await request.get('/api/user/metrics/latest');
      this.setData({ metricInfo: metric || null });
    } catch (e) {
      console.log('[assessment] preload metric fail', e);
    }
  },

  _inferUiType(text, options) {
    const t = String(text || '');
    if (/(多少|几|小时|次数|分钟|公斤|千克|斤|厘米|cm|kg|身高|体重|睡眠|步数)/i.test(t)) return 'number';
    if (/(是否|有没有|吗|需要不需要)/.test(t)) return 'boolean';
    if (options && options.length > 0) return 'choice';
    return 'text';
  },

  _normalizeDimension(dim, questionText) {
    const raw = String(dim || '').trim().toUpperCase();

    if (raw) {
      if (raw.includes('SPORT') || raw.includes('EXERCISE') || raw.includes('运动')) return 'SPORT';
      if (raw.includes('DIET') || raw.includes('FOOD') || raw.includes('饮食')) return 'DIET';
      if (raw.includes('SLEEP') || raw.includes('REST') || raw.includes('睡眠')) return 'SLEEP';
      if (raw.includes('STRESS') || raw.includes('PRESSURE') || raw.includes('压力')) return 'STRESS';
    }

    const t = String(questionText || '');
    if (/运动|锻炼|步行|跑步/.test(t)) return 'SPORT';
    if (/饮食|吃饭|早餐|蔬菜|水果|油脂/.test(t)) return 'DIET';
    if (/睡眠|熬夜|休息/.test(t)) return 'SLEEP';
    if (/压力|焦虑|紧张|情绪/.test(t)) return 'STRESS';

    return 'DEFAULT';
  },

  _parseOptions(optionsJson, qid) {
    if (!optionsJson) return [];

    try {
      const parsed = JSON.parse(optionsJson);

      if (Array.isArray(parsed)) {
        return parsed.map((it, idx) => this._normalizeOption(it, idx, qid));
      }

      if (parsed && typeof parsed === 'object') {
        const arr = parsed.options || parsed.list || parsed.items;
        if (Array.isArray(arr)) {
          return arr.map((it, idx) => this._normalizeOption(it, idx, qid));
        }
      }
    } catch (e) {}

    const text = String(optionsJson);
    const parts = text.includes('|') ? text.split('|') : (text.includes(',') ? text.split(',') : []);

    if (parts.length > 0) {
      return parts.map((p, idx) => ({
        label: String(p).trim() || `选项${idx + 1}`,
        value: `${qid}_${idx}`,
        score: 0,
        dimension: 'DEFAULT'
      }));
    }

    return [];
  },

  _normalizeOption(it, idx, qid) {
    if (typeof it === 'string' || typeof it === 'number') {
      return {
        label: String(it),
        value: `${qid}_${idx}`,
        score: 0,
        dimension: 'DEFAULT'
      };
    }

    const obj = it || {};
    const label = obj.label || obj.text || obj.name || obj.content || `选项${idx + 1}`;

    let rawValue = obj.value;
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      rawValue = idx;
    }

    return {
      label,
      value: `${qid}_${String(rawValue)}`,
      score: Number(obj.score !== undefined ? obj.score : 0),
      dimension: this._normalizeDimension(obj.dimension || obj.dim || obj.type, label)
    };
  },

  onTapOption(e) {
    const qid = e.currentTarget.dataset.qid;
    const value = e.currentTarget.dataset.value;
    const next = Object.assign({}, this.data.answers, { [qid]: String(value) });
    this.setData({ answers: next });
  },

  onInputAnswer(e) {
    const qid = e.currentTarget.dataset.qid;
    const value = e.detail.value;
    const next = Object.assign({}, this.data.answers, { [qid]: value });
    this.setData({ answers: next });
  },

  _isAnswered(q) {
    const v = this.data.answers[q.id];
    return v !== undefined && v !== null && String(v).trim() !== '';
  },

  _buildScores() {
    const scores = {};
    const answers = this.data.answers;

    this.data.questions.forEach(q => {
      const chosen = answers[q.id];
      if (chosen === undefined || chosen === null || String(chosen).trim() === '') return;

      if (q.uiType === 'choice') {
        const opt = (q.options || []).find(o => String(o.value) === String(chosen));
        if (!opt) return;

        const dim = opt.dimension || this._normalizeDimension('', q.questionText);
        const s = Number(opt.score || 0);
        scores[dim] = (scores[dim] || 0) + (Number.isFinite(s) ? Math.round(s) : 0);
        return;
      }

      if (q.uiType === 'boolean') {
        const v = String(chosen).toLowerCase();
        const dim = this._normalizeDimension('', q.questionText);
        const s = (v === 'yes' || v === 'true' || v === '1') ? 1 : 0;
        scores[dim] = (scores[dim] || 0) + s;
        return;
      }

      if (q.uiType === 'number') {
        const dim = this._normalizeDimension('', q.questionText);
        const n = Number(chosen);
        scores[dim] = (scores[dim] || 0) + (Number.isFinite(n) ? Math.round(n) : 0);
        return;
      }

      const dim = this._normalizeDimension('', q.questionText);
      scores[dim] = (scores[dim] || 0) + 0;
    });

    if (Object.keys(scores).length === 0) {
      scores.DEFAULT = 1;
    }

    return scores;
  },

  async _tryGetLatestBodyInfo() {
    try {
      const metric = await request.get('/api/user/metrics/latest');
      if (metric && (metric.heightCm || metric.weightKg || metric.bmi)) {
        this.setData({ metricInfo: metric });
        return {
          height: metric.heightCm,
          weight: metric.weightKg,
          bmi: metric.bmi
        };
      }
    } catch (e) {
      console.log('[assessment] metric latest fail', e);
    }

    try {
      const latest = await request.get('/api/health/latest', { limit: 20 });
      const list = Array.isArray(latest) ? latest : [];
      if (!list.length) return null;

      const first = list[0] || {};
      const height = first.heightCm || first.height || first.userHeight;
      const weight = first.weightKg || first.weight || first.userWeight;

      if (!height || !weight) return null;

      return { height, weight };
    } catch (e) {
      console.log('[assessment] health latest fallback fail', e);
      return null;
    }
  },

  async onSubmit() {
    const notDone = this.data.questions.find(q => !this._isAnswered(q));
    if (notDone) {
      wx.showToast({ title: '还有题目没选完', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    try {
      const scores = this._buildScores();
      const payload = { scores };

      const bodyInfo = await this._tryGetLatestBodyInfo();
      if (!bodyInfo || (!bodyInfo.height && !bodyInfo.weight && !bodyInfo.bmi)) {
        wx.showToast({
          title: '请先去健康记录页录入身高体重',
          icon: 'none'
        });
        this.setData({ submitting: false });
        return;
      }

      const evalRes = await request.post('/api/assessment/evaluate', payload);

      let recRes = null;
      try {
        recRes = await request.post('/api/recommend/today', payload);
      } catch (e) {
        console.log('[assessment] recommend today fail', e);
      }

      const merged = Object.assign({}, evalRes || {}, recRes || {});
      if (bodyInfo && bodyInfo.bmi && !merged.bmi) {
        merged.bmi = bodyInfo.bmi;
      }

      this.setData({
        result: merged,
        submitting: false
      });

      wx.showToast({ title: '评估完成', icon: 'success' });
    } catch (e) {
      this.setData({ submitting: false });
      console.log('[assessment] submit fail', e);
    }
  },

  goRecommend() {
    wx.navigateTo({ url: '/pages/recommend/today/index' });
  }
});