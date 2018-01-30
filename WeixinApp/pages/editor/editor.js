// pages/editor/editor.js
const config = require('../../utils/config.js')
const app = getApp()

Page({

  data: {
    avatar: "",
    initText: "有什么新鲜事？",
    focus: true,
    imgList: [],
    buttonLoading: "",
    textValue: "",
    imgLength: 0,
    swiperCurrent: 0,
    showTopPopup: false,
    searchFocus: false,
    searchValue: "",
    searchMethod: 'user',
    searchList: []
  },

  onLoad: function (options) {
    var avatarImg = wx.getStorageSync('userinfo').avatar
    this.setData({
      avatar: avatarImg
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
            imgLength: length
          })
          console.log(newImgList)
        }
      })
    }else{
      wx.showToast({
        title: '最多上传4张',
        duration: 1000
      })
    }
  },

  getText: function (event) { // 直接获取文本框中的文字
    var that = this
    that.setData({
      textValue: event.detail.value
    })
  },

  sendMessage: function (event) { // 发送消息
    var that = this
    var body = that.data.textValue
    if (body || (that.data.imgLength > 0) ){
      that.setData({
        buttonLoading: "zan-btn--loading"
      })
      app.createMessage(body).then(res => {
        var messageId = res.data.messageId
        var tempFilePaths = that.data.imgList
        app.upLoadImg(tempFilePaths, messageId)
        setTimeout(function(){
          that.setData({
            buttonLoading: ""
          })
          wx.reLaunch({
            url: "../followed/index"
          })
        }, 2000)
      })
    }else{
      wx.showToast({
        title: '请说点什么吧',
        duration: 1000
      })
    }
  },

  popImg: function (event) { // 用户点击图片右上角的叉，取消图片
    var that = this
    var idx = event.currentTarget.dataset.index
    var imgList = that.data.imgList
    imgList.splice(idx, 1)
    console.log(imgList)
    that.setData({
      imgList: imgList,
      swiperCurrent: 0,
      imgLength: imgList.length
    })
  },

  searchInput(event) {
    var that = this
    var text = event.detail.value
    var method = that.data.searchMethod
    if (text.length > 0) {
      if (method == 'user') {
        app.searchUsers(text).then(res => {
          console.log(res.data.user_list)
          that.setData({
            searchList: res.data.user_list
          })
        })
      } else {
        app.searchChannels(text).then(res => {
          console.log(res.data.channel_list)
          that.setData({
            searchList: res.data.channel_list
          })
        })
      }
    }
  },

  search(event) {
    var that = this
    wx.hideKeyboard()
    var method = event.currentTarget.dataset.method
    if (method == 'user') {
      var tag = '@'
    } else {
      var tag = '#'
    }
    that.setData({
      showTopPopup: true,
      searchValue: "",
      searchFocus: true,
      searchTag: tag,
      searchMethod: method
    });
  },

  pasteName(event) {
    var that = this
    wx.hideKeyboard()
    var text = that.data.searchTag + event.currentTarget.dataset.name
    var textValue = that.data.textValue + text + ' '
    that.setData({
      showTopPopup: !that.data.showTopPopup,
      textValue: textValue,
      focus: true
    })
  },

  toggleTopPopup() {
    var that = this
    that.setData({
      showTopPopup: !that.data.showTopPopup
    });
  }
})