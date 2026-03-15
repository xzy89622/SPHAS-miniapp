const request = require('../../../utils/request');

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function toDateTimeString(dateStr) {
  return `${dateStr} 08:00:00`;
}

Page({
  data: {
    submitting: false,
    completionText: '0/6',
    bmiText: '--',
    healthHint: '待填写',
    form: {
      recordDate: '',
      heightCm: '',
      weightKg: '',
      systolic: '',
      diastolic: '',
      heartRate: '',
      steps: '',
      sleepHours: '',
      remark: ''
    }
  },

  onLoad(options) {
    const date = options && options.recordDate ? options.recordDate : today();
    this.setData({ 'form.recordDate': date });
    this.updateDerivedState();
  },

  onDateChange(e) {
    this.setData({ 'form.recordDate': e.detail.value });
  },

  onInput(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ [`form.${k}`]: e.detail.value }, () => {
      this.updateDerivedState();
    });
  },

  updateDerivedState() {
    const f = this.data.form;

    const fields = [
      f.heightCm,
      f.weightKg,
      f.systolic,
      f.diastolic,
      f.heartRate,
      f.steps,
      f.sleepHours
    ];

    const filled = fields.filter(v => v !== '' && v !== null && v !== undefined).length;
    const completionText = `${filled}/7`;

    const heightM = Number(f.heightCm) / 100;
    const weightKg = Number(f.weightKg);

    let bmiText = '--';
    let healthHint = '待填写';

    if (heightM > 0 && weightKg > 0) {
      const bmi = weightKg / (heightM * heightM);
      bmiText = bmi.toFixed(1);

      if (bmi < 18.5) {
        healthHint = '偏瘦';
      } else if (bmi < 24) {
        healthHint = '正常';
      } else if (bmi < 28) {
        healthHint = '偏高';
      } else {
        healthHint = '肥胖风险';
      }
    } else if (filled > 0) {
      healthHint = '信息待完善';
    }

    this.setData({
      completionText,
      bmiText,
      healthHint
    });
  },

  validate() {
    const f = this.data.form;

    if (!f.recordDate) return '请选择日期';

    if (f.heightCm && (Number(f.heightCm) < 80 || Number(f.heightCm) > 250)) {
      return '身高请填写 80~250 之间';
    }

    if (f.weightKg && (Number(f.weightKg) < 20 || Number(f.weightKg) > 300)) {
      return '体重请填写 20~300 之间';
    }

    if (f.systolic && (Number(f.systolic) < 60 || Number(f.systolic) > 260)) {
      return '收缩压请填写 60~260 之间';
    }

    if (f.diastolic && (Number(f.diastolic) < 40 || Number(f.diastolic) > 180)) {
      return '舒张压请填写 40~180 之间';
    }

    if (f.heartRate && (Number(f.heartRate) < 30 || Number(f.heartRate) > 220)) {
      return '心率请填写 30~220 之间';
    }

    if (f.steps && (Number(f.steps) < 0 || Number(f.steps) > 100000)) {
      return '步数请填写 0~100000 之间';
    }

    if (f.sleepHours && (Number(f.sleepHours) < 0 || Number(f.sleepHours) > 24)) {
      return '睡眠时长请填写 0~24 之间';
    }

    if (!f.heightCm && !f.weightKg && !f.systolic && !f.diastolic && !f.heartRate && !f.steps && !f.sleepHours) {
      return '请至少填写一项健康数据';
    }

    return '';
  },

  toNum(v, type = 'float') {
    if (v === '' || v === null || v === undefined) return undefined;
    const n = type === 'int' ? parseInt(v, 10) : parseFloat(v);
    return Number.isNaN(n) ? undefined : n;
  },

  buildHealthPayload() {
    const f = this.data.form;

    return {
      recordDate: f.recordDate,
      heightCm: this.toNum(f.heightCm),
      weightKg: this.toNum(f.weightKg),
      systolic: this.toNum(f.systolic, 'int'),
      diastolic: this.toNum(f.diastolic, 'int'),
      heartRate: this.toNum(f.heartRate, 'int'),
      steps: this.toNum(f.steps, 'int'),
      sleepHours: this.toNum(f.sleepHours),
      remark: f.remark || undefined
    };
  },

  buildMetricPayload() {
    const f = this.data.form;

    return {
      recordTime: toDateTimeString(f.recordDate),
      heightCm: this.toNum(f.heightCm),
      weightKg: this.toNum(f.weightKg),
      systolic: this.toNum(f.systolic, 'int'),
      diastolic: this.toNum(f.diastolic, 'int'),
      steps: this.toNum(f.steps, 'int'),
      sleepHours: this.toNum(f.sleepHours)
    };
  },

  async saveBaseHealthRecord(payload) {
    return request({
      url: '/api/health/record',
      method: 'POST',
      data: payload
    });
  },

  async saveMetricRecord(payload) {
    const hasMetricCore =
      payload.heightCm !== undefined ||
      payload.weightKg !== undefined ||
      payload.systolic !== undefined ||
      payload.diastolic !== undefined ||
      payload.steps !== undefined ||
      payload.sleepHours !== undefined;

    if (!hasMetricCore) {
      return null;
    }

    return request({
      url: '/api/user/metrics',
      method: 'POST',
      data: payload
    });
  },

  async onSubmit() {
    const msg = this.validate();
    if (msg) {
      wx.showToast({ title: msg, icon: 'none' });
      return;
    }

    const healthPayload = this.buildHealthPayload();
    const metricPayload = this.buildMetricPayload();

    try {
      this.setData({ submitting: true });

      await this.saveBaseHealthRecord(healthPayload);

      try {
        await this.saveMetricRecord(metricPayload);
      } catch (metricErr) {
        console.error('[health record] save metric fail:', metricErr);
      }

      wx.showModal({
        title: '保存成功',
        content: '数据已同步保存，是否立即前往体质评估页？',
        confirmText: '去评估',
        cancelText: '看记录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/assessment/index/index' });
          } else {
            wx.navigateTo({ url: '/pages/health/latest/latest' });
          }
        }
      });
    } catch (e) {
      console.error('[health record] save fail:', e);
      wx.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goLatest() {
    wx.navigateTo({ url: '/pages/health/latest/latest' });
  }
});