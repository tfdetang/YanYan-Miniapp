const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
var WxParse = require('../../wxParse/wxParse.js')
const app = getApp()

Page({
  data: {
    author: false,
    isHideLoadMore: true,
    focus: false,
    retweetCheck: false,
    originHidden: true,
    imgList: [],
    imgLength: 0,
    origin: {},
    message: {},
    replies: [],
    replyTo: {},
    replyValue: '',
    textValue: '',
    toolsHidden: true,
    uploadHidden: true
  },
  onLoad: function (option) {
    var that = this
    app.loadMessage(option.messageid).then(res => {
      that.setData({
        message: res.data,
        replyTo: res.data,
        focus: option.focus,
        retweetCheck: option.retweetCheck,
      })
      if (res.data.author_id == wx.getStorageSync('userinfo').user_id){
        that.setData({
          author: true
        })
      }
      var article = that.data.message.body
      WxParse.wxParse('article', 'html', article, that, 5);
      if (res.data.quoted) {
        that.setData({
          origin: res.data.quoted
        })
        var originArticle = res.data.quoted.body
        WxParse.wxParse('originArticle', 'html', originArticle, that, 5);
      }
      app.loadReplies(option.messageid, 0).then(res => {
        var that = this
        console.log(res.data.replies)
        that.setData({
          replies: res.data.replies,
        })
      })
    })
  },

  onPullDownRefresh: function () { //下拉刷新信息
    var that = this
    wx.showNavigationBarLoading()
    app.loadReplies(that.data.message.id, 0).then(res => {
      var that = this
      console.log(res.data.replies)
      that.setData({
        replies: res.data.replies,
      })
      wx.stopPullDownRefresh()
      wx.hideNavigationBarLoading()
      wx.showToast({
        title: '评论刷新完毕',
        icon: 'success',
        duration: 800
      })
    })
  },

  onReachBottom: function () { //浏览到底部自动更新信息
    var that = this
    that.setData({
      isHideLoadMore: false
    })
    var messageId = that.data.message.id
    var offset = that.data.replies.length
    app.loadReplies(messageId, offset).then(res => {
      var get_list = res.data.replies
      var old_list = that.data.replies
      var replies = old_list.concat(get_list)
      that.setData({
        replies: replies,
        isHideLoadMore: true
      })
      if (get_list.length == 0) {
        wx.showToast({
          title: '已经到底了',
          duration: 800
        })
      }
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

  popImg: function (event) { // 用户点击图片右上角的叉，取消图片
    var that = this
    var idx = event.currentTarget.dataset.index
    var imgList = that.data.imgList
    imgList.splice(idx, 1)
    var uploadHidden = imgList.length == 0
    that.setData({
      imgList: imgList,
      imgLength: imgList.length,
      uploadHidden: uploadHidden
    })
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
          var rMessageId = res.data.messageId
          var tempFilePaths = that.data.imgList
          app.upLoadImg(tempFilePaths, rMessageId)
          wx.showToast({
            title: '评论&转发成功',
            icon: 'success',
            duration: 800
          })
        })
      } else { //不勾选转发
        app.messageReply(replyId, comment).then(res => {
          var rMessageId = res.data.messageId
          var tempFilePaths = that.data.imgList
          app.upLoadImg(tempFilePaths, rMessageId)
          wx.showToast({
            title: '评论成功',
            icon: 'success',
            duration: 800
          })
        })
      }
      app.loadReplies(messageId, 0).then(res => {
        that.setData({
          replies: res.data.replies,
          toolsHidden: true,
          replyValue: '',
          focus: false,
          retweetCheck: false,
          textValue: '',
          uploadHidden: true,
          imgList: []
        })
      })
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
  },
  
  delLink: function (event) {
    var that = this
    wx.showModal({
      title: '提示',
      content: '您确定要将这条推文删除吗(该操作不可撤销)？',
      success: function (res) {
        if (res.confirm) {
          app.delMessage(that.data.message.id).then(res => {
            wx.showToast({
              title: '已删除推文',
              mask: true,
              duration: 1000
            })            
          })
        } else if (res.cancel) {
          console.log('用户点击取消')
        }
      }
    })
  },

  wxParseTagATap: function (e) {
    var href = e.currentTarget.dataset.src;
    //我们可以在这里进行一些路由处理
    if (href.length > 0) {
      if (href[0] == '#') {
        wx.navigateTo({
          url: '../channel_message/channel_message?channelname=' + href.substring(1),
        })
      } else if (href[0] == '@') {
        wx.navigateTo({
          url: '../users/users?userid=' + href.substring(1),
        })
      }
    }
  }
})