// pages/article/detail/detail.js
// 健康科普-文章详情（对接后端：GET /api/article/{id}）
// 将 HTML 富文本 detail.content 转为 rich-text nodes 渲染

const { request } = require('../../../utils/request');

Page({
  data: {
    id: '',
    detail: null,
    nodes: []
  },

  onLoad(query) {
    const id = query.id || '';
    this.setData({ id });

    if (!id) {
      wx.showToast({ title: '未获取到文章ID', icon: 'none' });
      return;
    }

    this.loadDetail();
  },

  async loadDetail() {
    try {
      const detail = await request({
        url: `/api/article/${this.data.id}`,
        method: 'GET'
      });

      // 兼容：如果 request 没有自动取 data，这里兜底
      const realDetail = detail && detail.data ? detail.data : detail;

      const html = (realDetail && realDetail.content) ? realDetail.content : '';

      this.setData({
        detail: realDetail,
        nodes: htmlToNodes(html)
      });
    } catch (e) {
      // request 内一般会 toast
    }
  }
});

/**
 * 轻量 HTML -> rich-text nodes 转换
 * 支持：p, br, strong/b, em/i, s/del, u, a, img
 * 不支持的标签会被去掉，但保留文本
 */
function htmlToNodes(html) {
  if (!html) return [];

  let s = String(html)
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/&nbsp;/g, ' ');

  const imgList = [];
  s = s.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
    const index = imgList.length;
    imgList.push(src);
    return `[[[IMG_${index}]]]`;
  });

  s = s.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    return `[[[A_${href}]]]${text}[[[/A]]]`;
  });

  s = s
    .replace(/<(strong|b)>/gi, '[[[B]]]')
    .replace(/<\/(strong|b)>/gi, '[[[/B]]]')
    .replace(/<(em|i)>/gi, '[[[I]]]')
    .replace(/<\/(em|i)>/gi, '[[[/I]]]')
    .replace(/<(s|del)>/gi, '[[[S]]]')
    .replace(/<\/(s|del)>/gi, '[[[/S]]]')
    .replace(/<u>/gi, '[[[U]]]')
    .replace(/<\/u>/gi, '[[[/U]]]');

  s = s.replace(/<[^>]+>/g, '');

  const lines = s.split('\n').map(t => t.trim()).filter(Boolean);

  const nodes = [];
  for (const line of lines) {
    nodes.push(...parseInline(line, imgList));
    nodes.push({ type: 'text', text: '\n' });
  }

  return nodes;
}

function parseInline(text, imgList) {
  const out = [];
  let i = 0;
  const styleStack = [];

  function currentStyle() {
    const styles = [];
    for (const s of styleStack) {
      if (s === 'B') styles.push('font-weight:700;');
      if (s === 'I') styles.push('font-style:italic;');
      if (s === 'S') styles.push('text-decoration:line-through;');
      if (s === 'U') styles.push('text-decoration:underline;');
    }
    return styles.join('');
  }

  while (i < text.length) {
    const imgMatch = text.slice(i).match(/^\[\[\[IMG_(\d+)\]\]\]/);
    if (imgMatch) {
      const idx = Number(imgMatch[1]);
      const src = imgList[idx];
      if (src) {
        out.push({
          name: 'img',
          attrs: { src, style: 'max-width:100%;height:auto;display:block;' }
        });
        
      }
      i += imgMatch[0].length;
      continue;
    }

    const aStart = text.slice(i).match(/^\[\[\[A_(.+?)\]\]\]/);
    if (aStart) {
      const href = aStart[1];
      i += aStart[0].length;

      const endIdx = text.indexOf('[[[/A]]]', i);
      const inner = endIdx === -1 ? text.slice(i) : text.slice(i, endIdx);

      out.push({
        name: 'a',
        attrs: { href },
        children: [{ type: 'text', text: inner }]
      });

      i = endIdx === -1 ? text.length : endIdx + '[[[/A]]]'.length;
      continue;
    }

    const tagStart = text.slice(i).match(/^\[\[\[(B|I|S|U)\]\]\]/);
    if (tagStart) {
      styleStack.push(tagStart[1]);
      i += tagStart[0].length;
      continue;
    }

    const tagEnd = text.slice(i).match(/^\[\[\[\/(B|I|S|U)\]\]\]/);
    if (tagEnd) {
      const t = tagEnd[1];
      for (let k = styleStack.length - 1; k >= 0; k--) {
        if (styleStack[k] === t) {
          styleStack.splice(k, 1);
          break;
        }
      }
      i += tagEnd[0].length;
      continue;
    }

    const nextPos = findNextTokenPos(text, i);
    const chunk = text.slice(i, nextPos);

    if (chunk) {
      const style = currentStyle();
      if (style) {
        out.push({
          name: 'span',
          attrs: { style },
          children: [{ type: 'text', text: chunk }]
        });
      } else {
        out.push({ type: 'text', text: chunk });
      }
    }

    i = nextPos;
  }

  return out;
}

function findNextTokenPos(text, start) {
  const tokens = [
    '[[[IMG_',
    '[[[A_',
    '[[[B]]]', '[[[/B]]]',
    '[[[I]]]', '[[[/I]]]',
    '[[[S]]]', '[[[/S]]]',
    '[[[U]]]', '[[[/U]]]'
  ];

  let min = text.length;
  for (const t of tokens) {
    const p = text.indexOf(t, start);
    if (p !== -1 && p < min) min = p;
  }
  return min;
}
