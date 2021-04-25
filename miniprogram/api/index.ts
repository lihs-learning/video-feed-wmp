import { Content } from '../model/content'

import request from './adapter'

interface IRecommendResult {
  list: Content[]
}

export function fetchRecommend() {
  return request<void, IRecommendResult>({
    url: 'https://example.com/v1/recommend_list',
  })
}
