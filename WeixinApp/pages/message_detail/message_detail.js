const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    focus: false,
    message: {},
    replies: [],
    replyTo: {},
    replyValue: '',
    textValue: '',
    toolsHidden: true
  },
  onLoad: function (option) {
    app.loadMessage(option.messageid).then(res => {
      var that = this
      that.setData({
        message: res.data,
        replyTo: res.data,
      })
      app.loadReplies(option.messageid, 0).then(res => {
        var that = this
        console.log(res.data.replies)
        that.setData({
          replies: res.data.replies,
        })
      })
    })
  },
  getFocus: function(event){
    var message = event.currentTarget.dataset.message
    this.setData({
      replyTo: message,
      focus: true
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
  showTools: function (event) {
    var that = this
    that.setData({
      toolsHidden: false
    })
  },
  getText: function (event) {
    var that = this
    that.setData({
      textValue: event.detail.value
    })
  },
  replySubmit: function (event) {
    var that = this
    var replyId = that.data.replyTo.id
    var comment = that.data.textValue
    if (comment){
      wx.showToast({
        title: '正在发送',
        icon: 'loading',
        mask: true,
        duration: 1000
      })
      app.messageReply(replyId, comment).then(res => {
        wx.showToast({
          title: '评论成功',
          icon: 'success',
          duration: 800
        })
        app.loadReplies(that.data.message.id, 0).then(res => {
          that.setData({
            replies: res.data.replies,
            toolsHidden: true,
            replyValue: '',
            textValue: ''
          })
        })
      })
    }else{
      wx.showToast({
        title: '评论不可为空',
        mask: true,
        duration: 1000
      })
    }
  },

  toMessage: function (event) {
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var url = '../message_detail/message_detail?messageid=' + messageId
    wx.navigateTo({
      url: url,
    })
  },

  favoMessage: function (event) {
    wx.showToast({
      icon: 'loading',
      mask: true,
      duration: 1000
    })
    var that = this
    var messageId = that.data.message.id
    var favoCount = "message.favo_count"
    var isFavoed = "message.is_favoed"
    app.favoMessage(messageId).then(res => {
      var params = {}
      params[favoCount] = res.data.count
      params[isFavoed] = res.data.favo
      that.setData(params)
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
    console.log(index)
    var messageId = event.currentTarget.dataset.message.id
    var favoCount = "replies[" + index + "].favo_count"
    var isFavoed = "replies[" + index + "].is_favoed"
    app.favoMessage(messageId).then(res => {
      var params = {}
      params[favoCount] = res.data.count
      params[isFavoed] = res.data.favo
      that.setData(params)
    })
  }
})