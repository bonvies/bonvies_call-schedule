export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  // 供 callMonitorCore 的 pendingCalls 精準比對用（見 dequeueCall）。由 freeSwitchApi.makeMorningCall()
  // 把回應的 request_id 填進來；沒拿到時留空，callMonitorCore 會自動退回 FIFO 比對。
  callId?: string;
}
