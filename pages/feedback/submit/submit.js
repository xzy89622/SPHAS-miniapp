const { request } = require('../../../utils/request');
const { uploadFeedbackImage } = require('../../../utils/upload');

Page({
  data: {
    title: '',
    content: '',
    images: [],        // 本地临时路径
    submitting: false
  },

  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },

  chooseImage() {
    const { images } = this.data;
    if (images.length >= 6) {
      wx.showToast({ title: '最多上传6张', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: 6 - images.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = (res.tempFiles || []).map(f => f.tempFilePath);
        this.setData({ images: images.concat(paths) });
      }
    });
  },

  preview(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ current: src, urls: this.data.images });
  },

  async onSubmit() {
    const { title, content, images } = this.data;

    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (!content.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    try {
      this.setData({ submitting: true });
      wx.showLoading({ title: '提交中...' });

      // 1) 先上传图片，拿到 URL 列表
      const attachmentUrls = [];
      for (const path of images) {
        const url = await uploadFeedbackImage(path);
        attachmentUrls.push(url);
      }

      // 2) 提交反馈
      await request({
        url: '/api/feedback/submit',
        method: 'POST',
        data: { title, content, attachmentUrls }
      });

      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
      wx.navigateBack();
    } catch (e) {
      wx.hideLoading();
    } finally {
      this.setData({ submitting: false });
    }
  }
});
