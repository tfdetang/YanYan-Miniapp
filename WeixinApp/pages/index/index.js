const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data:{
    momentList:[],
    channelList:[],
    activeUsers: []
  },

  onLoad: function(option){
    var that = this
    app.loadMoments(0).then(res => {
      that.setData({
        momentList: res.data.moment_list
      })
      wx.setStorageSync("moments", res.data.moment_list)
    })

    app.loadChannelList(0).then(res => {
      that.setData({
        channelList: res.data.channel_list
      })
    })

    app.getActiveUsers('active').then(res => {
      that.setData({
        activeUsers: res.data.author_list
      })
    })
  },

  onPullDownRefresh: function () { //下拉刷新信息
    var that = this
    wx.showNavigationBarLoading()
    app.loadMoments(0).then(res => {
      that.setData({
        momentList: res.data.moment_list
      })
    })
    app.loadChannelList(0).then(res => {
      that.setData({
        channelList: res.data.channel_list
      })
      wx.stopPullDownRefresh()
      wx.hideNavigationBarLoading()
      wx.showToast({
        title: '刷新完毕',
        icon: 'success',
        duration: 800
      })
    })
    app.getActiveUsers('active').then(res => {
      that.setData({
        activeUsers: res.data.author_list
      })
    })
  },

  toMessage: function (event) { // 跳转链接
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var url = '../message_detail/message_detail?messageid=' + messageId + '&focus='
    wx.navigateTo({
      url: url,
    })
  },

  toUser: function (event) { // 访问用户页面
    var that = this
    var userId = event.currentTarget.dataset.userid
    var selfId = wx.getStorageSync('userinfo').user_id
    if (userId != selfId) {
      var url = '../users/users?userid=' + userId
      wx.navigateTo({
        url: url,
      })
    }
  },

  toChannel: function (event) {
    var that = this
    var channelName = event.currentTarget.dataset.name
    var url = '../channel_message/channel_message?channelname=' + channelName
    wx.navigateTo({
      url: url,
    })
  },

  toMoment: function (event) {
    var that = this
    var idx = event.currentTarget.dataset.idx
    var url = '../moment/moment?idx=' + idx
    wx.navigateTo({
      url: url,
    })
  }

})