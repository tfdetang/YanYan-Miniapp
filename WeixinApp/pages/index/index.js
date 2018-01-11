//index.js
//获取应用实例
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    message_list: [],
    isHideLoadMore: true,
  },
  onLoad: function () {
    var that = this
    app.loadEvents(0, 0).then(res => {
      var list_message = res.data.message_list
      that.setData({
        message_list: list_message,
      })
      wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id)
    })
  },

  onPullDownRefresh: function () {
    var that = this
    app.loadEvents(0, 0).then(res => {
      wx.showNavigationBarLoading()
      var list_message = res.data.message_list
      that.setData({
        message_list: list_message,
      })
      wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id)
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
    var bottom = wx.getStorageSync('messageBottom')
    app.loadEvents(bottom, 0).then(res => {
      var get_list = res.data.message_list
      var old_list = that.data.message_list
      var list_message = old_list.concat(get_list)
      that.setData({
        message_list: list_message,
        isHideLoadMore: true
      })
      if (list_message[list_message.length - 1].event_id == bottom) {
        wx.showToast({
          title: '已经到底了',
          duration: 800
        })
      } else {
        wx.setStorageSync('messageBottom', list_message[list_message.length - 1].event_id)
      }
    })
  },

  previewImage: function (event) {
    var current = event.currentTarget.dataset.current
    var urls = event.currentTarget.dataset.all
    wx.previewImage({
      current: current, // 当前显示图片的http链接
      urls: urls // 需要预览的图片http链接列表
    })
  },

  toMessage: function (event) {
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var url = '../message_detail/message_detail?messageid=' + messageId
    wx.navigateTo({
      url: url,
    })
  },

  toEditor: function (event) {
    var that = this
    var url = '../editor/editor'
    wx.navigateTo({
      url: url,
    })
  },

  favoButton: function (event) {
    wx.showToast({
      icon: 'loading',
      mask: true,
      duration: 1000
    })
    var that = this
    var index = event.currentTarget.dataset.idx
    var messageId = event.currentTarget.dataset.message.id
    var favoCount = "message_list[" + index + "].favo_count"
    var isFavoed = "message_list[" + index + "].is_favoed"
    app.favoMessage(messageId).then(res => {
      var params = {}
      params[favoCount] = res.data.count
      params[isFavoed] = res.data.favo
      that.setData(params)
    })
  }
})
