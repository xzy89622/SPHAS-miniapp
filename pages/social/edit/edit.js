const socialApi = require('../../api/social.js');

Page({
  data: {
    id: 0,
    loading: true,
    submitting: false,
    content: '',
    images: []
  },

  async onLoad(options) {
    const id = Number(options.id || 0);
    this.setData({ id });
    await this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true });

    try {
      const res = await socialApi.postDetail(this.data.id);
      const post = res && res.post ? res.post : {};
      const status = Number(post.status);

      if (status !== 3) {
        wx.showToast({
          title: '仅已驳回帖子可修改',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 600);
        return;
      }

      this.setData({
        content: post.content || '',
        images: socialApi.parseImagesJson(post.imagesJson)
      });
    } catch (e) {
      wx.showToast({
        title: e.msg || e.message || '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onInput(e) {
    this.setData({
      content: e.detail.value || ''
    });
  },

  chooseImgs() {
    const remain = 6 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({
        title: '最多 6 张',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const list = res.tempFilePaths || [];
        this.setData({
          images: this.data.images.concat(list)
        });
      }
    });
  },

  removeImg(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const next = this.data.images.slice();
    next.splice(idx, 1);
    this.setData({
      images: next
    });
  },

  preview(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;

    wx.previewImage({
      current: src,
      urls: this.data.images
    });
  },

  async submit() {
    const content = (this.data.content || '').trim();
    if (!content) {
      wx.showToast({
        title: '内容不能为空',
        icon: 'none'
      });
      return;
    }

    if (this.data.submitting) return;

    this.setData({ submitting: true });

    try {
      const finalUrls = [];

      for (const path of this.data.images) {
        if (/^https?:\/\//i.test(path)) {
          finalUrls.push(path);
        } else {
          const url = await socialApi.uploadImage(path);
          finalUrls.push(url);
        }
      }

      await socialApi.updateRejectedPost({
        postId: this.data.id,
        content,
        imagesJson: JSON.stringify(finalUrls)
      });

      wx.showToast({
        title: '已重新提交审核',
        icon: 'success'
      });

      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/social/detail/detail?id=${this.data.id}`
        });
      }, 300);
    } catch (e) {
      wx.showToast({
        title: e.msg || e.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});