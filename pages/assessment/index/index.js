// pages/assessment/index/index.js
// ✅ 提交评估后再拉一次今日推荐，把 reason/diet/sport 合并展示

const request = require('../../../utils/request');

Page({
  data: {
    loading: false,
    submitting: false,
    questions: [],
    answers: {},
    result: null
  },

  onLoad() {
    this.loadQuestions();
  },

  async loadQuestions() {
    this.setData({ loading: true });

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

      this.setData({ questions, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      console.log('[assessment] loadQuestions fail', e);
    }
  },

  _inferUiType(text, options) {
    const t = String(text || '');
    if (/(多少|几|小时|次数|分钟|公斤|千克|斤|厘米|cm|kg)/.test(t)) return 'number';
    if (/(是否|有没有|吗|需要不需要)/.test(t)) return 'boolean';
    if (options && options.length > 0) return 'choice';
    return 'text';
  },

  _parseOptions(optionsJson, qid) {
    if (!optionsJson) return [];

    try {
      const parsed = JSON.parse(optionsJson);
      if (Array.isArray(parsed)) return parsed.map((it, idx) => this._normalizeOption(it, idx, qid));
      if (parsed && typeof parsed === 'object') {
        const arr = parsed.options || parsed.list || parsed.items;
        if (Array.isArray(arr)) return arr.map((it, idx) => this._normalizeOption(it, idx, qid));
      }
    } catch (e) {}

    const text = String(optionsJson);
    const parts = text.includes('|') ? text.split('|') : (text.includes(',') ? text.split(',') : []);
    if (parts.length > 0) {
      return parts.map((p, idx) => ({
        label: String(p).trim() || `选项${idx + 1}`,
        value: `${qid}_${idx}`,
        score: 0,
        dimension: 'default'
      }));
    }
    return [];
  },

  _normalizeOption(it, idx, qid) {
    if (typeof it === 'string' || typeof it === 'number') {
      return { label: String(it), value: `${qid}_${idx}`, score: 0, dimension: 'default' };
    }

    const obj = it || {};
    const label = obj.label || obj.text || obj.name || obj.content || `选项${idx + 1}`;
    let rawValue = obj.value;
    if (rawValue === undefined || rawValue === null || rawValue === '') rawValue = idx;

    return {
      label,
      value: `${qid}_${String(rawValue)}`,
      score: Number(obj.score !== undefined ? obj.score : 0),
      dimension: obj.dimension || obj.dim || obj.type || 'default'
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
    // ✅ 保证 scores 不为空（后端评估/推荐都能用）
    const scores = {};
    const answers = this.data.answers;

    this.data.questions.forEach(q => {
      const chosen = answers[q.id];
      if (chosen === undefined || chosen === null || String(chosen).trim() === '') return;

      if (q.uiType === 'choice') {
        const opt = (q.options || []).find(o => String(o.value) === String(chosen));
        if (!opt) return;
        const dim = opt.dimension || 'default';
        const s = Number(opt.score || 0);
        scores[dim] = (scores[dim] || 0) + (Number.isFinite(s) ? s : 0);
        return;
      }

      if (q.uiType === 'boolean') {
        const v = String(chosen);
        const s = (v === 'yes' || v === 'true' || v === '1') ? 1 : 0;
        scores.default = (scores.default || 0) + s;
        return;
      }

      if (q.uiType === 'number') {
        const n = Number(chosen);
        scores.default = (scores.default || 0) + (Number.isFinite(n) ? n : 0);
        return;
      }

      scores.default = (scores.default || 0) + 0;
    });

    if (Object.keys(scores).length === 0) scores.default = 1;
    return scores;
  },

  async _tryGetLatestBodyInfo() {
    try {
      const latest = await request.get('/api/health/latest');
      const info = latest && latest.data ? latest.data : latest;
      if (!info) return null;

      const height = info.height || info.heightCm || info.userHeight;
      const weight = info.weight || info.weightKg || info.userWeight;
      if (!height || !weight) return null;

      return { height, weight };
    } catch (e) {
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
      const payload = { scores, answers: this.data.answers };

      const bodyInfo = await this._tryGetLatestBodyInfo();
      if (bodyInfo) {
        payload.height = bodyInfo.height;
        payload.weight = bodyInfo.weight;
      }

      // 1) 评估
      const evalRes = await request.post('/api/assessment/evaluate', payload);
      console.log('[assessment] evaluate res =', evalRes);

      // 2) 推荐（拿到 reason/diet/sport）
      let recRes = null;
      try {
        recRes = await request.get('/api/recommend/today');
        console.log('[assessment] recommend today res =', recRes);
      } catch (e) {
        console.log('[assessment] recommend today fail', e);
      }

      // 3) 合并展示：以推荐为主，补上评估字段
      const merged = Object.assign({}, evalRes || {}, recRes || {});
      this.setData({ result: merged, submitting: false });

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