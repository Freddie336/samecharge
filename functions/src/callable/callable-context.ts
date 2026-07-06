export interface CallableHandlerContext<TInput> {
  data: TInput;
  uid: string;
  requestId: string;
}

export type CallableHandler<TInput, TResult> = (
  context: CallableHandlerContext<TInput>
) => Promise<TResult> | TResult;
