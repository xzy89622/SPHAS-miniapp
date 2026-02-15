// pages/notice/detail/detail.js
// 公告详情页：拉取 /api/notice/{id}，并把 HTML 富文本转成 rich-text nodes 进行渲染

const { request } = require('../../../utils/request');

Page({
  data: {
    id: '',
    detail: null,
    nodes: [] // rich-text 渲染用
  },

  onLoad(query) {
    const id = query.id || '';
    this.setData({ id });

    if (!id) {
      wx.showToast({ title: '未获取到公告ID', icon: 'none' });
      return;
    }

    this.loadDetail();
  },

  async loadDetail() {
    try {
      const detail = await request({
        url: `/api/notice/${this.data.id}`,
        method: 'GET'
      });

      const html = (detail && detail.content) ? detail.content : '';

      this.setData({
        detail,
        nodes: htmlToNodes(html)
      });
    } catch (e) {
      // request 内部已 toast
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

  // 1) 规范化换行/段落
  let s = String(html)
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/&nbsp;/g, ' ');

  // 2) 把 <img ... src="..."> 转成占位符，后续转 nodes
  const imgList = [];
  s = s.replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, (_, src) => {
    const index = imgList.length;
    imgList.push(src);
    return `[[[IMG_${index}]]]`;
  });

  // 3) 把 a 标签转占位：[[[A_href]]]text[[[/A]]]
  s = s.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    return `[[[A_${href}]]]${text}[[[/A]]]`;
  });

  // 4) 常见样式标签映射成占位符，最后再生成 span
  s = s
    .replace(/<(strong|b)>/gi, '[[[B]]]')
    .replace(/<\/(strong|b)>/gi, '[[[/B]]]')
    .replace(/<(em|i)>/gi, '[[[I]]]')
    .replace(/<\/(em|i)>/gi, '[[[/I]]]')
    .replace(/<(s|del)>/gi, '[[[S]]]')
    .replace(/<\/(s|del)>/gi, '[[[/S]]]')
    .replace(/<u>/gi, '[[[U]]]')
    .replace(/<\/u>/gi, '[[[/U]]]');

  // 5) 清掉其他标签（保留纯文本）
  s = s.replace(/<[^>]+>/g, '');

  // 6) 按换行拆段
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
    // IMG 占位
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

    // A 占位开始
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

    // 样式开始
    const tagStart = text.slice(i).match(/^\[\[\[(B|I|S|U)\]\]\]/);
    if (tagStart) {
      styleStack.push(tagStart[1]);
      i += tagStart[0].length;
      continue;
    }

    // 样式结束
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

    // 普通文本：吃到下一个 token 为止
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
