// utils/request.js
// 兼容两种写法：
// 1) request("GET", "/api/xx", data)
// 2) request({ url:"/api/xx", method:"GET", data:{}, header:{} })
// 并支持动态 BASE_URL：优先读 Storage 的 BASE_URL

function getBaseUrl() {
  const stored = wx.getStorageSync("BASE_URL");
  if (stored) return stored;

  const app = getApp && getApp();
  if (app && app.globalData && app.globalData.BASE_URL) return app.globalData.BASE_URL;

  // 兜底（开发者工具可用）
  return "http://localhost:8080";
}

function getToken() {
  return wx.getStorageSync("token") || "";
}

function buildAuthHeader(token) {
  if (!token) return {};
  if (String(token).toLowerCase().startsWith("bearer ")) return { Authorization: token };
  return { Authorization: `Bearer ${token}` };
}

function assertUrl(url) {
  if (!url || typeof url !== "string") {
    console.error("request url is invalid =>", url);
    console.trace("request url invalid trace");
    wx.showToast({ title: "请求路径为空(url)", icon: "none" });
    return false;
  }
  if (!url.startsWith("/")) {
    console.error("request url must start with / =>", url);
    console.trace("request url format trace");
    wx.showToast({ title: "请求路径必须以/开头", icon: "none" });
    return false;
  }
  return true;
}

function coreRequest(method, url, data = {}, extra = {}) {
  return new Promise((resolve, reject) => {
    if (!assertUrl(url)) return reject({ msg: "invalid url", url });

    const baseUrl = getBaseUrl();
    const fullUrl = baseUrl + url;
    const token = getToken();

    wx.request({
      url: fullUrl,
      method,
      data,
      header: {
        "Content-Type": "application/json",
        ...buildAuthHeader(token),
        ...(extra.header || {})
      },
      success(res) {
        const d = res.data;

        // 兼容统一返回：{ code, msg, data }
        if (d && typeof d === "object" && "code" in d) {
          if (d.code === 0 || d.code === 200) return resolve(d.data);
          wx.showToast({ title: d.msg || "请求失败", icon: "none" });
          return reject(d);
        }

        resolve(d);
      },
      fail(err) {
        console.error("wx.request fail =>", fullUrl, err);
        wx.showToast({ title: "网络错误", icon: "none" });
        reject(err);
      }
    });
  });
}

// ✅ 关键：同时兼容两种入参
function request(arg1, arg2, arg3, arg4) {
  // 写法2：request({ url, method, data, header })
  if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
    const opt = arg1;
    const method = String(opt.method || "GET").toUpperCase();
    const url = opt.url || opt.path || opt.endpoint; // 兼容别名
    const data = opt.data || {};
    const extra = { header: opt.header || {} };
    return coreRequest(method, url, data, extra);
  }

  // 写法1：request(method, url, data, extra)
  const method = String(arg1 || "GET").toUpperCase();
  const url = arg2;
  const data = arg3 || {};
  const extra = arg4 || {};
  return coreRequest(method, url, data, extra);
}

function upload(url, filePath, name = "file", formData = {}, extra = {}) {
  return new Promise((resolve, reject) => {
    if (!assertUrl(url)) return reject({ msg: "invalid url", url });

    const baseUrl = getBaseUrl();
    const fullUrl = baseUrl + url;
    const token = getToken();

    wx.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header: {
        ...buildAuthHeader(token),
        ...(extra.header || {})
      },
      success(res) {
        try {
          const d = JSON.parse(res.data || "{}");
          if (d.code === 0 || d.code === 200) return resolve(d.data);
          wx.showToast({ title: d.msg || "上传失败", icon: "none" });
          reject(d);
        } catch (e) {
          reject(e);
        }
      },
      fail(err) {
        console.error("wx.uploadFile fail =>", fullUrl, err);
        wx.showToast({ title: "上传失败", icon: "none" });
        reject(err);
      }
    });
  });
}

module.exports = {
  request,
  get: (url, data, extra) => coreRequest("GET", url, data, extra),
  post: (url, data, extra) => coreRequest("POST", url, data, extra),
  upload,
  getToken
};