import { Content, isVideoContent } from '../../../../model/content'

interface ISlideState {
  favorAnimating: boolean,
  shareAnimating: boolean,
}

interface IData {
  currentSlides: Content[]
  circular: boolean
  slideStates: ISlideState[]
}

type Props = {
  duration: WechatMiniprogram.Component.AllProperty
  easingFunction: WechatMiniprogram.Component.AllProperty
  loop: WechatMiniprogram.Component.AllProperty
  contentList: WechatMiniprogram.Component.AllProperty
}

type Methods = {
  // the functions starting with underscore(_)  will be not used in UI
  _contentListChanged: (newVal: Content[]) => void
  _rearrange: (currentSlideIndex: number, direction: 'up' | 'down') => Promise<number>
  _playByIndex: (slideIndex: number) => void
  // TODO: Tap Event
  _pauseByIndex: (e: WechatMiniprogram.CustomEvent, slideIndex: number) => void
  _trigger: (e: WechatMiniprogram.CustomEvent, type: string, ext?: AnyObject) => void
  // UI functions
  handleAnimationFinish: (e: WechatMiniprogram.SwiperAnimationFinish) => void
  handleAdError: (e: WechatMiniprogram.AdError) => void
  handlePlay: (e: WechatMiniprogram.VideoPlay) => void
  handlePause: (e: WechatMiniprogram.VideoPause) => void
  handleEnded: (e: WechatMiniprogram.VideoEnded) => void
  handleError: (e: WechatMiniprogram.VideoError) => void
  handleTimeUpdate: (e: WechatMiniprogram.VideoTimeUpdate) => void
  handleWaiting: (e: WechatMiniprogram.VideoWaiting) => void
  handleProgress: (e: WechatMiniprogram.VideoPregress) => void
  // TODO: Meta Data Event
  handleLoadedMetaData: (e: WechatMiniprogram.CustomEvent) => void

  // TODO: Tap Event
  handleTapVideo: (e: WechatMiniprogram.CustomEvent) => void
  // TODO: Tap Event
  handleTapAuthorInfo: (e: WechatMiniprogram.CustomEvent) => void
  // TODO: Tap Event
  handleTapCommentBtn: (e: WechatMiniprogram.CustomEvent) => void
  // TODO: Tap Event
  handleTapFavorBtn: (e: WechatMiniprogram.CustomEvent) => void

}

interface ContentState {
  isPlaying: boolean
}

interface CustomOption {
  shadowData: {
    videoContentsState: ContentState[]
    videoContexts: WechatMiniprogram.VideoContext[]
    // maxPlayRate: number[]
    currentSlideIndex: number
  }
}

Component<IData, Props, Methods, CustomOption>({
  properties: {
    duration: {
      type: Number,
      value: 500,
    },
    easingFunction: {
      type: String,
      value: 'default',
    },
    loop: {
      type: Boolean,
      value: true,
    },
    contentList: {
      type: Array,
      value: [],
      observer: function observer(newVal: Content[]) {
        // TODO: #wmp-ts-weak TS 这里检查不到类型，加上判断比较好
        if (!Array.isArray(newVal) || newVal.some(item => !item)) {
          return
        }
        this._contentListChanged(newVal)
      }
    }
  },

  data: {
    currentSlides: [], // what will display in UI
    circular: false, // can swipe circular
    slideStates: [],
  },

  lifetimes: {
    attached() {
      const videoElementIDs = [
        'video_element_1',
        'video_element_2',
        'video_element_3',
      ]

      this.shadowData = {
        videoContentsState: videoElementIDs.map(() => ({
          isPlaying: false,
        })),
        videoContexts: videoElementIDs.map(id => wx.createVideoContext(id, this)),
        // maxPlayRate: [],
        currentSlideIndex: 0,
      }

      this.setData({
        slideStates: videoElementIDs.map(() => ({
          favorAnimating: false,
          shareAnimating: false,
        }))
      })
    }
  },

  methods: {
    // the functions starting with underscore(_)  will be not used in UI
    _contentListChanged(newVal) {
      // newVal must be valid.
      // If it may contain invalid value, should be filter before calling
      const {
        currentSlides,
      } = this.data
      if (!newVal.length) {
        return
      }
      if (currentSlides.length !== 3) {
        this.setData({
          currentSlides: newVal.slice(0, 3),
        }, () => {
          this._playByIndex(0)
        })
      }
    },
    _rearrange(currentSlideIndex, direction) {
      const {
        contentList,
        currentSlides: prevCurrentSlides,
      } = this.data

      const nextCurrentSlides = prevCurrentSlides.slice()

      const currentSlide = prevCurrentSlides[currentSlideIndex]
      let currentContentIndex = contentList.findIndex((content: Content) => content.id === currentSlide.id)

      if (currentContentIndex < 0) {
        throw Error('can\'t find currentContentIndex')
      }

      if (currentSlide.type === 'ad' && currentSlide.isErrored) {
        currentContentIndex = currentSlide.recordIndex + (direction === 'up' ? 1 : -1)
        nextCurrentSlides[currentSlideIndex] = contentList[currentContentIndex]
      }

      let circular = true
      /**
       * prev = (cur + (3 - 1)) % 3
       * 0 -> 2
       * 1 -> 0
       * 2 -> 1
       */
      const prevSlideIndex = (currentSlideIndex + (3 - 1)) % 3
      if (currentContentIndex - 1 >= 0) {
        nextCurrentSlides[prevSlideIndex] = contentList[currentContentIndex - 1]
      } else {
        circular = false
        // nextCurrentSlides[prevSlideIndex] = contentList[contentList.length - 1]
      }
      /**
       * next = (cur + 1) % 3
       * 0 -> 1
       * 1 -> 2
       * 2 -> 0
       */
      const nextSlideIndex = (currentSlideIndex + 1) % 3
      if (currentContentIndex + 1 < contentList.length) {
        nextCurrentSlides[nextSlideIndex] = contentList[currentContentIndex + 1]
      } else {
        // circular = false
        nextCurrentSlides[nextSlideIndex] = contentList[0]
      }

      // 找出重置分享引导卡片状态：新放入 nextCurrentSlides 的 slide
      const resetIndex = nextCurrentSlides.findIndex(slide => !prevCurrentSlides.some(oldSlide => oldSlide.id === slide.id))
      const shareTipsUserClosedKey = `buttonState[${resetIndex}].shareTipsUserClosed`
      const shareTipsShowKey = `buttonState[${resetIndex}].shareTipsShow`
      let resetShareTipsState = {}
      // prevCurrentSlides[0:2] == videoList[0:2] 时，不会有新的 slide
      if (resetIndex >= 0) {
        resetShareTipsState = {
          [shareTipsUserClosedKey]: false,
          [shareTipsShowKey]: false,
        }
      }

      return new Promise(resolve => {
        this.setData({
          circular,
          currentSlides: nextCurrentSlides,
          ...resetShareTipsState,
        }, () => {
          resolve(currentContentIndex)
        })
      })
    },
    _playByIndex(slideIndex) {
      const {
        currentSlides,
      } = this.data
      this.shadowData.videoContexts.forEach((ctx, idx) => {
        ctx.pause()
        // TODO: 后续需要想办法（如 data-xx）放入 onPause() 中
        this.shadowData.videoContentsState[idx].isPlaying = false
      })
      if (isVideoContent(currentSlides[slideIndex])) {
        this.shadowData.videoContexts[slideIndex].play()
        // TODO: 后续需要想办法（如 data-xx）放入 onPlay() 中
        this.shadowData.videoContentsState[slideIndex].isPlaying = true

      }
      this.shadowData.currentSlideIndex = slideIndex
    },
    _pauseByIndex(e, slideIndex) {
      const {
        currentSlides,
      } = this.data
      if (isVideoContent(currentSlides[slideIndex])) {
        this.shadowData.videoContexts[slideIndex].pause()
        // TODO: 后续需要想办法（如 data-xx）放入 onPause() 中
        this.shadowData.videoContentsState[slideIndex].isPlaying = false
      }
      this._trigger(e, 'UserPause')
    },
    _trigger(e, type, ext: AnyObject = {}) {
      const detail = e.detail
      const activeId = e.target.dataset.id

      this.triggerEvent(type, {
        ...detail,
        activeId,
        ...ext,
      })
    },
    // --------------- Event ---------------
    handleAnimationFinish(e) {
      const {
        currentSlides,
        slideStates,
      } = this.data

      const { currentSlideIndex: lastSlideIndex } = this.shadowData

      // 判断是否重排
      const {
        current: currentSlideIndex,
      } = e.detail;

      const diff = currentSlideIndex - lastSlideIndex;

      if (diff === 0) {
        return;
      }

      // 获取滑动顺序
      const direction =
      diff === 1 || diff === -(currentSlides.length - 1)
      ? 'up'
      : 'down';

      // 重置最大播放时长
      // this.shadowData.maxPlayRate[currentSlideIndex] = 0;

      // 重置按钮动画
      this.setData({
        buttonState: slideStates.map((state) => ({
          ...state,
          favorAnimating: false,
          shareAnimating: false,
          endTipsShow: false, // A/B SwiperPageEndTips
        })),
      });

      // 重排序
      this._rearrange(currentSlideIndex, direction).then(currentContentIndex => {
        this._playByIndex(currentSlideIndex);

        // 通知外界变化
        this.triggerEvent('change', {
          activeId: currentSlides[currentSlideIndex].id,// 在广告出问题的时候，id 是错误的，因为引用了旧的 currentSlides
          currentContentIndex,
          // prevMaxPlayRate: this.shadowData.maxPlayRate[lastSlideIndex],
        })
      });
    },
    handleAdError(e) {
      const {
        currentSlides,
      } = this.data
      const adId = e.target.dataset.id
      const erroredAdIndex = currentSlides.findIndex(slide => slide.id === adId)
      const isErroredKey = `currentSlides[${erroredAdIndex}].isErrored`
      this.setData({
        [isErroredKey]: true,
      })
      this._trigger(e, 'aderror')
    },
    handlePlay(e) {
      this._trigger(e, 'play')
    },
    handlePause(e) {
      this._trigger(e, 'pause')
    },
    handleEnded(e) {
      const {
        currentSlideIndex
      } = this.shadowData
      const shareTipsUserClosedKey = `buttonState[${currentSlideIndex}].shareTipsUserClosed`
      const nextData = {
        [shareTipsUserClosedKey]: false,
      }
      this.setData(nextData)
      this._trigger(e, 'ended')
    },
    handleError(e) {
      this._trigger(e, 'error')
    },
    handleTimeUpdate(e) {
      const {
        currentTime,
        duration,
      } = e.detail
      const {
        id
      } = e.target.dataset
      const {
        slideStates,
        currentSlides,
      } = this.data
      const slideIndex = currentSlides.findIndex(slide => slide.id === id)
      // this.shadowData.maxPlayRate[slideIndex] = Math.max(
      //   Math.round((currentTime / duration || 0) * 100),
      //   this.shadowData.maxPlayRate[slideIndex] || 0,
      // )
      if (currentTime > 1 && !slideStates[slideIndex].shareAnimating) {
        const shareAnimationKey = `buttonState[${slideIndex}].shareAnimating`
        this.setData({
          [shareAnimationKey]: true,
        })
      }
      if (
        duration > 60 &&
        currentTime > 25
      ) {
        const shareAnimationKey = `buttonState[${slideIndex}].shareTipsShow`
        this.setData({
          [shareAnimationKey]: true,
        })
      }
      this._trigger(e, 'timeupdate')
    },
    handleWaiting: function onWaiting(e) {
      this._trigger(e, 'wait')
    },
    handleProgress: function onProgress(e) {
      this._trigger(e, 'progress')
    },
    handleLoadedMetaData: function onLoadedMetaData(e) {
      this._trigger(e, 'loadedmetadata')
    },
    // --------------- HCI ---------------
    handleTapVideo(e) {
      const {
        currentSlideIndex,
        videoContentsState,
      } = this.shadowData
      if (videoContentsState[currentSlideIndex].isPlaying) {
        this._pauseByIndex(e, currentSlideIndex)
      } else {
        this._playByIndex(currentSlideIndex)
      }
    },
    handleTapAuthorInfo(e) {
      this._trigger(e, 'tapauthorinfo')
    },
    handleTapCommentBtn(e) {
      this._trigger(e, 'tapcommentbtn')
    },
    handleTapFavorBtn(e) {
      const {
        currentSlides,
      } = this.data
      const {
        currentSlideIndex,
      } = this.shadowData
      const currentContent = currentSlides[currentSlideIndex]
      if (!isVideoContent(currentContent)) {
        return
      }
      // 取消点赞的功能是完整实现的，按需注释/打开下方 if 代码块即可
      // if (currentContent.isFavored) {
      //   return
      // }
      const isFavoredKey = `currentSlides[${currentSlideIndex}].isFavored`
      const favorCountTipKey = `currentSlides[${currentSlideIndex}].favorCountTip`
      const favorAnimationKey = `buttonState[${currentSlideIndex}].favorAnimating`
      let favorTip = ''
      if (currentContent.favorCount < 10000) {
        favorTip = currentContent.isFavored ? '已取消' : '已点赞'
      }
      this.setData({
        [isFavoredKey]: currentContent.isFavored ? 0 : 1,
        [favorCountTipKey]: favorTip,
        [favorAnimationKey]: !currentContent.isFavored,
      })
      this._trigger(e, 'tapfavorbtn')
    },
  },
})

