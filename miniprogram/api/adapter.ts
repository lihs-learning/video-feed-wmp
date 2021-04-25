// interface Request {
//   uid?: number
//   token?: string
// }

interface Respond<TBody> {
  code: number
  msg?: string
  content: TBody
}

interface IReqOpts<TData> {
  url: string
  method?: 
    | 'OPTIONS'
    | 'GET'
    | 'HEAD'
    | 'POST'
    | 'PUT'
    | 'DELETE'
    | 'TRACE'
    | 'CONNECT'
  data?: TData
  header?: Record<string, string>
  dataType?: 'json' | '其他'
  enableCache?: boolean
  enableHttp2?: boolean
  responseType?: 'text' | 'arraybuffer'
  timeout?: number // 单位 ms
}

function request<TReqData, TResData>(options: IReqOpts<TReqData>, needToken: boolean = true): Promise<Respond<TResData>> {
  return new Promise<Respond<TResData>>((resolve, reject) => {
    wx.request<Respond<TResData>>({
      ...options,
      data: {
        ...options.data,
        token: needToken ? 'xxx' : undefined,
      },
      success: wxRes => {
        resolve(wxRes.data)
      },
      fail: reject,
    })
  })
}

export default request
