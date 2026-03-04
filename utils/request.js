// utils/request.js
// 统一请求封装（真机可用）
// 规则：Storage(BASE_URL) 优先；否则用 DEFAULT_BASE_URL；严禁真机默认 localhost

const KEY_BASE_URL = "BASE_URL";

// ✅ 改成你的电脑 WLAN IPv4 + 端口（你截图里是 10.20.65.137）
const DEFAULT_BASE_URL = "http://10.20.65.137:8080";

// 是否允许在“开发者工具”里用 localhost（真机不允许）
const ALLOW_LOCALHOST_IN_DEVTOOLS = true;

function isDevtools() {
  // 开发者工具环境
  return wx.getSystemInfoSync().platform === "devtools";
}

function normalizeBaseUrl(url) {
  if (!url) return "";
  let u = String(url).trim();
  u = u.replace(/\/+$/, ""); // 去掉末尾 /
  return u;
}

function isValidHttpUrl(url) {
  return /^https?:\/\/[^/]+(:\d+)?$/i.test(url);
}

function isLocalhost(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

function getBaseUrl() {
  const stored = normalizeBaseUrl(wx.getStorageSync(KEY_BASE_URL));
  let baseUrl = stored || normalizeBaseUrl(DEFAULT_BASE_URL);

  if (!isValidHttpUrl(baseUrl)) {
    // 非法就清空，走错误提示
    baseUrl = "";
  }

  // 真机禁止 localhost；开发者工具按开关决定
  if (baseUrl && isLocalhost(baseUrl)) {
    if (isDevtools() && ALLOW_LOCALHOST_IN_DEVTOOLS) {
      return baseUrl;
    }
    // 真机 or 不允许 devtools localhost
    return "";
  }

  return baseUrl;
}

function getToken() {
  return wx.getStorageSync("token") || "";
}

function buildAuthHeader(headers = {}) {
  const token = getToken();
  if (token) {
    return { ...headers, Authorization: token };
  }
  return headers;
}

function assertRequestReady(baseUrl) {
  if (!baseUrl) {
    wx.showModal({
      title: "接口地址未配置",
      content:
        "请配置 BASE_URL（例如 http://10.20.65.137:8080），真机不能使用 localhost。",
      showCancel: false,
    });
    return false;
  }
  return true;
}

function coreRequest(method, url, data = {}, extra = {}) {
  return new Promise((resolve, reject) => {
    const baseUrl = getBaseUrl();
    if (!assertRequestReady(baseUrl)) {
      return reject({ msg: "BASE_URL not set", url });
    }

    const fullUrl = baseUrl + url;
    const header = buildAuthHeader(extra.header || {});

    wx.request({
      url: fullUrl,
      method,
      data,
      header,
      timeout: extra.timeout || 15000,
      success(res) {
        // 兼容你后端的返回结构：{ code, msg, data }
        const body = res.data;
        if (body && typeof body === "object" && "code" in body) {
          if (body.code === 200 || body.code === 0) return resolve(body.data);
          wx.showToast({ title: body.msg || "请求失败", icon: "none" });
          return reject(body);
        }
        // 如果后端不是这种结构，直接返回整个 res.data
        return resolve(body);
      },
      fail(err) {
        console.error("wx.request fail:", fullUrl, err);
        wx.showToast({ title: "网络错误，请检查后端/防火墙", icon: "none" });
        reject(err);
      },
    });
  });
}

function request(args) {
  // 兼容你原来的调用方式 request({ url, method, data, header })
  const method = (args.method || "GET").toUpperCase();
  const url = args.url || "";
  const data = args.data || {};
  const extra = { header: args.header || {}, timeout: args.timeout };
  return coreRequest(method, url, data, extra);
}

function get(url, data, extra = {}) {
  return coreRequest("GET", url, data || {}, extra);
}
function post(url, data, extra = {}) {
  return coreRequest("POST", url, data || {}, extra);
}

module.exports = {
  request,
  get,
  post,
  // 方便你调试
  _getBaseUrl: getBaseUrl,
};