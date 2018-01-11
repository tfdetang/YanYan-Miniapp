// pages/editor/editor.js
Page({

  data: {
    avatar: "",
    initText: "有什么新鲜事？",
    focus: true,
    imgList:[],
    textValue: ""
  },

  onLoad: function (options) {
    var avatarImg = wx.getStorageSync('userinfo').avatar
    this.setData({
      avatar: avatarImg
    })
  },

  uploadImg: function (options) {
    var that = this
    wx.chooseImage({
      count: 4, // 默认9
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: function (res) {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        console.log(res.tempFilePaths)
        that.setData({
          imgList: res.tempFilePaths
        })
        var tempFilePaths = res.tempFilePaths
      }
    })
  }
  
})