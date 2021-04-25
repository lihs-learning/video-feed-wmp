import systemInfo from '../../common/systemInfo/index'
import * as api from '../../api/index'
import { Content, isVideoContent } from '../../model/content'

// 页面参数的类型

interface IPageData {
  contentList: Content[]
  safePositionBottom: number
  safePositionTop: number
}

interface IShadowData {
  currentContentIndex: number
  initId?: number
}

interface IQuery {
  contentId?: number
  uid?: number
  pageName?: string
}

interface IPageFunc {
  // ============ 事件 ============ //
  handleTapAuthorInfo?: () => void
  handleTapCommentBtn?: () => void
  handleTapFavorBtn?: () => void
  handleTapBack?: () => void
  handleSlideChange?: () => void
  handlePlay?: () => void
  handlePause?: () => void
  handleUserPause?: () => void
  handleTimeUpdate?: () => void
  handleEnded?: () => void
  handleError?: () => void
  handleWaiting?: () => void
  handleProgress?: () => void
  handleLoadedMetaData?: () => void
  handleAdError?: () => void
  tryShowInterstitialAd?: () => void
  // ============ 辅助 ============ //
  fetchNextList: () => void
}

interface IPageOptions extends IPageFunc {
  // 不需要直接在页面展示的数据状态
  shadowData: IShadowData
  // 页面 query 参数
  query: IQuery
}

Page<IPageData, IPageOptions>({
  data: {
    contentList: [],
    safePositionBottom: 0,
    safePositionTop: 0,
  },
  shadowData: {
    currentContentIndex: 0,
    initId: -1,
  },
  query: {},
  // ============ 页面生命周期 ============ //
  onLoad(query) {
    const {
      contentId,
      uid,
      pageName,
    } = query
    this.query = {
      contentId: contentId ? parseInt(contentId, 10) : undefined,
      uid: uid ? parseInt(uid, 10) : undefined,
      pageName,
    }
    this.shadowData.initId = this.query.contentId
  },
  onReady() {
    // 拉取推荐内容
    this.fetchNextList()

    // 处理 iPhone X 的 UI 兼容问题
    const safeArea = systemInfo.safeArea;
    if (safeArea) {
      this.setData({
        safePositionBottom: safeArea.bottom - safeArea.height > 20 ? safeArea.bottom - safeArea.height : 0,
        safePositionTop: safeArea.top > 20 ? safeArea.top : 0,
      })
    }
  },

  onShareAppMessage() {
    const { contentList } = this.data
    const { currentContentIndex } = this.shadowData
    const currentContent = contentList[currentContentIndex]

    if (!isVideoContent(currentContent)) {
      return
    }

    // const sharePath = share.getSharePath

    return {
      title: currentContent.shareTitle ?? currentContent.title,
      // path: sharePath,
      imageUrl: currentContent.shareCoverUrl ?? currentContent.cUrl,
    }
  },

  // ============ 事件 ============ //
  handleTapBack() {
    wx.navigateBack()
  },
  // ============ 辅助 ============ //
  fetchNextList() {
    const { contentList } = this.data
    api.fetchRecommend()
      .then(res => {
        console.log('lihs debug', res)
        this.setData({
          contentList: contentList.concat(res.content.list)
        })
      })
  }
})
