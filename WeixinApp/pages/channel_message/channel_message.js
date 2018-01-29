// pages/channel_message/channel_message.js
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({

  data: {
    channelName: "",
    messageList: [],
    isHideLoadMore: true,
    isNoMore: false,
  },


  onLoad: function (options) {
    var that = this
    var channelName = options.channelname
    app.loadChannelMessages(channelName, 0).then(res => {
      that.setData({
        messageList: res.data.message_list,
        channelName: channelName
      })
      wx.setNavigationBarTitle({
        title: "#" + channelName,
      })
    })
  },

  previewImage: function (event) { // 点击图片直接显示图片预览
    var current = event.currentTarget.dataset.current
    var urls = event.currentTarget.dataset.all
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  toMessage: function (event) { // 跳转链接
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var focus = event.currentTarget.dataset.focus
    var url = '../message_detail/message_detail?messageid=' + messageId + '&focus=' + focus
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

  favoButton: function (event) { //点击喜爱
    wx.showToast({
      icon: 'loading',
      title: '操作中',
      mask: true,
      duration: 1000
    })
    var that = this
    var listName = event.currentTarget.dataset.listname
    var index = event.currentTarget.dataset.idx
    var messageId = event.currentTarget.dataset.message.id
    var favoCount = listName + "[" + index + "].favo_count"
    var isFavoed = listName + "[" + index + "].is_favoed"
    app.favoMessage(messageId).then(res => {
      var params = {}
      params[favoCount] = res.data.count
      params[isFavoed] = res.data.favo
      that.setData(params)
    })
  },

  retweetButton: function (event) { //点击转发
    var that = this
    var listName = event.currentTarget.dataset.listname
    var index = event.currentTarget.dataset.idx
    var messageId = event.currentTarget.dataset.message.id
    var url = '../message_detail/message_detail?messageid=' + messageId + '&focus=true'
    var quoteCount = listName + "[" + index + "].quote_count"
    var isQuoted = listName + "[" + index + "].is_quoted"
    wx.showActionSheet({
      itemList: ['转发', '转发并回复'],
      success: function (res) {
        if (res.tapIndex == 0) {  //直接转发
          app.retweetMessage(messageId, "").then(res => {
            var params = {}
            params[quoteCount] = res.data.quotecount
            params[isQuoted] = true
            that.setData(params)
          })
        } else { // 转发并回复
          wx.navigateTo({
            url: url + '&retweetCheck=true',
          })
        }
        console.log(res.tapIndex)
        console.log(messageId)
      },
      fail: function (res) {
        console.log(res.errMsg)
      }
    })
  },

  onPullDownRefresh: function () {
    var that = this
    wx.showNavigationBarLoading()
    app.loadChannelMessages(that.data.channelName, 0).then(res => {
      that.setData({
        messageList: res.data.message_list,
      })
      wx.stopPullDownRefresh()
      wx.hideNavigationBarLoading()
      wx.showToast({
        title: '刷新完毕',
        icon: 'success',
        duration: 800
      })
    })
  },


  onReachBottom: function () {
    var that = this
    that.setData({
      isHideLoadMore: false
    })
    var start = that.data.messageList.length
    var old_list = that.data.messageList
    app.loadChannelMessages(that.data.channelName, start).then(res => {
      var get_list = res.data.message_list
      var list_message = old_list.concat(get_list)
      that.setData({
        messageList: list_message,
        isHideLoadMore: true
      })
      if (get_list.length == 0) {
        that.setData({
          isNoMore: true
        })
        wx.showToast({
          title: '已经到底了',
          duration: 800
        })
      }
    })
  },
})