const socialApi = require('../../api/social');

Page({
  data: {
    id: 0,
    loading: false,
    saving: false,
    content: '',
    imageList: [],
    maxImageCount: 9,
    detail: null,
    canEdit: false
  },

  onLoad(options) {
    const id = Number(options.id || 0);
    if (!id) {
      wx.showToast({
        title: '帖子ID无效',
        icon: 'none'
      });
      return;
    }

    this.setData({ id });
    this.loadDetail();
  },

  async loadDetail() {
    if (!this.data.id) return;

    this.setData({
      loading: true
    });

    try {
      const res = await socialApi.postDetail(this.data.id);
      const post = res && res.post ? res.post : {};
      const imageList = Array.isArray(post.images) ? post.images : [];
      const canEdit = Number(post.status) === 3;

      this.setData({
        detail: post,
        content: post.content || '',
        imageList,
        canEdit
      });

      if (!canEdit) {
        wx.showToast({
          title: '只有已驳回的帖子才能编辑',
          icon: 'none'
        });
      }
    } catch (e) {
      console.error('[social edit] loadDetail fail =', e);
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

  onContentInput(e) {
    this.setData({
      content: e.detail.value || ''
    });
  },

  chooseImages() {
    if (!this.data.canEdit) {
      wx.showToast({
        title: '当前状态不可编辑',
        icon: 'none'
      });
      return;
    }

    const remain = this.data.maxImageCount - this.data.imageList.length;
    if (remain <= 0) {
      wx.showToast({
        title: `最多上传${this.data.maxImageCount}张图片`,
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const files = (res.tempFiles || []).map(item => item.tempFilePath).filter(Boolean);
        if (!files.length) return;

        wx.showLoading({
          title: '上传中'
        });

        try {
          const uploaded = [];
          for (const filePath of files) {
            const url = await socialApi.uploadSocialImage(filePath);
            uploaded.push(url);
          }

          this.setData({
            imageList: this.data.imageList.concat(uploaded).slice(0, this.data.maxImageCount)
          });
        } catch (e) {
          console.error('[social edit] upload fail =', e);
          wx.showToast({
            title: e.msg || e.message || '上传失败',
            icon: 'none'
          });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    wx.previewImage({
      current: url,
      urls: this.data.imageList
    });
  },

  removeImage(e) {
    if (!this.data.canEdit) {
      wx.showToast({
        title: '当前状态不可编辑',
        icon: 'none'
      });
      return;
    }

    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;

    const next = this.data.imageList.slice();
    next.splice(index, 1);

    this.setData({
      imageList: next
    });
  },

  async onSubmit() {
    if (this.data.saving) return;

    if (!this.data.canEdit) {
      wx.showToast({
        title: '只有已驳回的帖子才能重新提交',
        icon: 'none'
      });
      return;
    }

    const content = String(this.data.content || '').trim();
    if (!content) {
      wx.showToast({
        title: '请输入日志内容',
        icon: 'none'
      });
      return;
    }

    this.setData({
      saving: true
    });

    try {
      await socialApi.updatePost({
        postId: this.data.id,
        content,
        imagesJson: JSON.stringify(this.data.imageList)
      });

      wx.showToast({
        title: '已重新提交审核',
        icon: 'success'
      });

      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/social/mine/mine'
        });
      }, 350);
    } catch (e) {
      console.error('[social edit] submit fail =', e);
      wx.showToast({
        title: e.msg || e.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        saving: false
      });
    }
  }
});