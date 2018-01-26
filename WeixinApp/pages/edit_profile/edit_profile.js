// pages/edit_profile/edit_profile.js
const config = require('../../utils/config.js')
const util = require('../../utils/util.js')
const qiniuUploader = require('../../utils/qiniuUploader.js')
const app = getApp()

Page({

  data: {
    introValue: "",
    weixinValue: "",
    region: [],
    initText: "自我介绍一下吧",
    profile_img: "",
    upload: false,
    user: {},
  },

  onLoad: function (options) {
    var that = this
    var userId = wx.getStorageSync('userinfo').user_id
    app.getUser(userId).then(res => {
      that.setData({
        user: res.data,
        profile_img: res.data.profile_img,
        introValue: res.data.intro,
        region: [res.data.province, res.data.city, res.data.district],
        weixinValue: res.data.weixin_id
      })
    })
  },

  getIntroText: function (event) { // 直接获取文本框中的文字
    var that = this
    that.setData({
      introValue: event.detail.value
    })
  },

  getWeixin: function (event) { // 直接获取文本框中的文字
    var that = this
    that.setData({
      weixinValue: event.detail.value
    })
  },

  bindRegionChange: function (e) {
    console.log('picker发送选择改变，携带值为', e.detail.value)
    this.setData({
      region: e.detail.value
    })
  },

  uploadImg: function (options) { // 选择图片的逻辑
    var that = this
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: function (res) {
        var imgPath = res.tempFilePaths
        that.setData({
          profile_img: imgPath,
          upload: true
        })
      }
    })
  },

  submit: function (event) {
    var that = this
    if (that.data.upload) {
      var params = config.getUptoken()
      console.log(that.data.profile_img)
      qiniuUploader.upload(that.data.profile_img[0], (res) => {
        var imgurl = res.hash
        app.editUser(that.data.introValue, that.data.region[0], that.data.region[1], that.data.region[2], that.data.weixinValue, imgurl).then(res => {
          console.log(res.data)
        })
      }, (error) => {
        console.log('error: ' + error);
      },
        params
      );
    } else {
      app.editUser(that.data.introValue, that.data.region[0], that.data.region[1], that.data.region[2], that.data.weixinValue, '').then(res => {
        console.log(res.data)
      })
    }
    wx.showToast({
      title: '保存中',
      icon: 'loading',
      duration: 1000
    })
  }
})