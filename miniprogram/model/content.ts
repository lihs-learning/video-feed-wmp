export enum ContentType {
  Video = 'video',
  AD = 'ad',
}

export interface VideoContent {
  // 基本信息
  type: ContentType.Video
  id: number
  vUrl: string
  cUrl: string
  title: string
  authorMid: number
  authorNick: string
  // 交互状态
  isFavored: boolean
  // 分享用的信息，若需要
  shareTitle?: string
  shareCoverUrl?: string
  // 数据信息
  pv: number
  favorCount: number
  commentCount: number
  shareCount: number
  // 日志信息
  sign?: string
}

export interface ADContent {
  type: ContentType.AD
  id: string
  isErrored: boolean
  recordIndex: number // 在播放列表中的位置，用于广告出错时定位到下/上一个视频
}

export type Content = VideoContent | ADContent

export function isVideoContent(content: Content): content is VideoContent {
  return content.type === ContentType.Video
}

export function isADContent(content: Content): content is ADContent {
  return content.type === ContentType.AD
}
