//app.js
const config = require('utils/config.js')
const util = require('utils/util.js')
const qiniuUploader = require('utils/qiniuUploader.js')

App({
  onLaunch: function () {
    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    this.login()
  },

  login: function () { //登陆用户，刷新userKey 与 userinfo
    var that = this;
    wx.showToast({
      title: '加载中',
      icon: 'loading',
      duration: 1000
    })
    var wxLogin = util.wxLogin()
    wxLogin().then(res => {
      wx.setStorageSync('code', res.code)
      var wxGetUserInfo = util.wxGetUserInfo()
      return wxGetUserInfo()
    }).then(res => {
      var code = wx.getStorageSync('code')
      var url = config.getHostUrl() + 'login/wechat/'
      var data = {
        code: code,
        userinfo: res.userInfo
      }
      return util.getRequest(url, data)
    }).then(res => {
      wx.setStorageSync('userKey', res.data)
      that.userInfo().then(res => {
        wx.setStorageSync('userinfo', res.data)
      })
    })
  },

  userInfo: function () { // 抓取userinfo
    var that = this
    var url = config.getHostUrl() + 'user/self/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key
    }
    return util.getRequest(url, data)
  },

  globalData: {
    userInfo: null
  },

  loadEvents: function (start, direction) { // 抓取用户所关注的人的动态
    var that = this
    var url = config.getHostUrl() + 'events/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
      start: start,
      direction: direction
    }
    return util.getRequest(url, data)
  },

  favoMessage: function (messageId) { // 用户喜爱某条推文
    var that = this
    var url = config.getHostUrl() + 'message/favo/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
      message_id: messageId
    }
    return util.getRequest(url, data)
  },

  loadMessage: function (messageId) { // 单独载入某条信息
    var that = this
    var url = config.getHostUrl() + 'messages/' + messageId
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
    }
    return util.getRequest(url, data)
  },

  loadReplies: function (messageId, start) { // 载入某条推文的回复
    var that = this
    var url = config.getHostUrl() + 'messages/' + messageId + '/replies/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
      start: start
    }
    return util.getRequest(url, data)
  },

  messageReply: function (messageId, comment) { // 回复某条推文
    var that = this
    var url = config.getHostUrl() + 'message/reply/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
      message_id: messageId,
      comment: comment
    }
    return util.postRequest(url, data)
  },

  createMessage: function(body) {  // 新建某条推文
    var that = this
    var url = config.getHostUrl() + 'message/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
      body: body
    }
    return util.postRequest(url, data)
  },

  retweetMessage: function(messageId, body){ // 转发（转发回复）某条推文
    var that = this
    var url = config.getHostUrl() + 'message/retweet/'
    var data = {
      login_key: wx.getStorageSync('userKey').login_key,
      body: body,
      message_id: messageId
    }
    return util.postRequest(url, data)
  },

  upLoadImg: function (tempFilePaths, messageId) { //上传照片，并附到某条推文上
    var that = this
    for (var i = 0; i < tempFilePaths.length; i++) {
      var params = config.getUptoken()
      qiniuUploader.upload(tempFilePaths[i], (res) => {
        var imgurl = res.hash
        var url = config.getHostUrl() + 'message/uploadimg/'
        var data = {
          login_key: wx.getStorageSync('userKey').login_key,
          message_id: messageId,
          url: imgurl
        }
        util.postRequest(url, data)
      }, (error) => {
        console.log('error: ' + error);
      },
        params
      );
    }
  }
})