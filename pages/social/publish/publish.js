// pages/social/publish/publish.js
const api = require('../../api/social');

Page({
  data: {
    content: '',
    images: [], // 本地临时路径
    submitting: false
  },

  onInput(e) {
    this.setData({ content: e.detail.value || '' });
  },

  chooseImgs() {
    const remain = 6 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多 6 张', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const list = (res.tempFilePaths || []);
        this.setData({ images: this.data.images.concat(list) });
      }
    });
  },

  removeImg(e) {
    const idx = e.currentTarget.dataset.idx;
    const next = this.data.images.slice();
    next.splice(idx, 1);
    this.setData({ images: next });
  },

  preview(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ urls: this.data.images, current: src });
  },

  async submit() {
    const content = (this.data.content || '').trim();
    if (!content) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      // 1) 先上传图片（如果有）
      const urls = [];
      for (const path of this.data.images) {
        const url = await api.uploadImage(path);
        urls.push(url);
      }

      // 2) 发帖（imagesJson 是 JSON 数组字符串）
      await api.createPost({
        content,
        imagesJson: JSON.stringify(urls)
      });

      wx.showToast({ title: '已提交审核', icon: 'success' });

      // 返回社区页并刷新
      setTimeout(() => {
        wx.navigateBack();
      }, 300);
    } catch (e) {
      wx.showToast({ title: e.msg || '发布失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});