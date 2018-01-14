const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const app = getApp()

Page({
  data: {
    focus: false,
    retweetCheck: false,
    originHidden: true,
    imgList: [],
    imgLength: 0,
    message: {},
    replies: [],
    replyTo: {},
    replyValue: '',
    textValue: '',
    toolsHidden: true,
    uploadHidden: true
  },
  onLoad: function (option) {
    app.loadMessage(option.messageid).then(res => {
      var that = this
      that.setData({
        message: res.data,
        replyTo: res.data,
        focus: option.focus,
        retweetCheck: option.retweetCheck,
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

  uploadImg: function (options) { // 选择图片的逻辑
    var that = this
    if (that.data.imgLength < 4) {
      wx.chooseImage({
        count: 4 - that.data.imgLength,
        sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
        sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
        success: function (res) {
          var oldImgList = that.data.imgList
          var newImgList = oldImgList.concat(res.tempFilePaths)
          var length = newImgList.length
          that.setData({
            imgList: newImgList,
            imgLength: length,
            uploadHidden: false
          })
          console.log(newImgList)
        }
      })
    } else {
      wx.showToast({
        title: '最多上传4张',
        duration: 1000
      })
    }
  },

  getFocus: function (event) { // 回复推文或回复别的回复时，自动获得文本聚焦
    var message = event.currentTarget.dataset.message
    this.setData({
      replyTo: message,
      toolsHidden: false,
      focus: true
    })
  },

  showOrigin: function (event) {
    this.setData({
      originHidden: false
    })
  },

  showTools: function (event) { //文本框聚焦时显示工具栏
    this.setData({
      toolsHidden: false,
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

  getText: function (event) { // 自动获得文本框里文字的值，用于提交（不使用表单）
    var that = this
    that.setData({
      textValue: event.detail.value
    })
  },

  replySubmit: function (event) { // 回复推文
    var that = this
    var replyId = that.data.replyTo.id
    var comment = that.data.textValue
    var ifRetweet = that.data.retweetCheck
    var messageId = that.data.message.id
    if (comment) {
      wx.showToast({
        title: '正在发送',
        icon: 'loading',
        mask: true,
        duration: 1000
      })
      if (ifRetweet) { //如果勾选了转发
        app.retweetMessage(replyId, comment).then(res => {
          wx.showToast({
            title: '评论&转发成功',
            icon: 'success',
            duration: 800
          })
          app.loadReplies(messageId, 0).then(res => {
            that.setData({
              replies: res.data.replies,
              toolsHidden: true,
              replyValue: '',
              textValue: '',
              focus: false,
              retweetCheck: false,
            })
          })
        })
      } else { //不勾选转发
        app.messageReply(replyId, comment).then(res => {
          wx.showToast({
            title: '评论成功',
            icon: 'success',
            duration: 800
          })
          app.loadReplies(messageId, 0).then(res => {
            that.setData({
              replies: res.data.replies,
              toolsHidden: true,
              replyValue: '',
              focus: false,
              retweetCheck: false,
              textValue: ''
            })
          })
        })
      }
    } else {
      wx.showToast({
        title: '评论不可为空',
        mask: true,
        duration: 1000
      })
    }
  },

  toMessage: function (event) { //从推文跳转到另一条推文
    var that = this
    var messageId = event.currentTarget.dataset.messageid
    var url = '../message_detail/message_detail?messageid=' + messageId
    wx.navigateTo({
      url: url,
    })
  },

  favoMessage: function (event) { //点击推文工具条上的喜爱
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

  retweetButton: function (event) { //点击推文工具条上的转发
    var that = this
    var messageId = that.data.message.id
    var quoteCount = "message.quote_count"
    var isQuoted = "message.is_quoted"
    var message = that.data.message
    wx.showActionSheet({
      itemList: ['转发', '转发并回复'],
      success: function (res) {
        if (res.tapIndex == 0) {
          app.retweetMessage(messageId, "").then(res => {
            var params = {}
            params[quoteCount] = res.data.quotecount
            params[isQuoted] = true
            that.setData(params)
          })
        } else {
          that.setData({
            replyTo: message,
            toolsHidden: false,
            retweetCheck: true,
            focus: true
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

  checkBox: function (e) {  //勾选并转发的选项
    var that = this
    if (e.detail.value.length > 0) {
      that.setData({
        retweetCheck: true
      })
    } else {
      that.setData({
        retweetCheck: false
      })
    }
  },

  favoButton: function (event) { //喜爱下方的评论
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