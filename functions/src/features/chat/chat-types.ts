export type ChatMessageType = "text";
export type ChatModerationStatus = "clean";

export interface SendMessageInput {
  matchId: string;
  clientMessageId: string;
  text: string;
}

export interface SendMessageResponse {
  status: "sent";
  messageId: string;
  createdAt: string;
  text: string;
}

export interface MarkMatchReadInput {
  matchId: string;
}

export interface MarkMatchReadResponse {
  status: "read";
}

export interface SetMatchMutedInput {
  matchId: string;
  muted: boolean;
}

export interface SetMatchMutedResponse {
  status: "muted";
  muted: boolean;
}

export interface ChatStore {
  sendMessage(
    uid: string,
    input: SendMessageInput,
    now: Date,
  ): Promise<SendMessageResponse>;
  markMatchRead(
    uid: string,
    input: MarkMatchReadInput,
    now: Date,
  ): Promise<MarkMatchReadResponse>;
  setMatchMuted(
    uid: string,
    input: SetMatchMutedInput,
    now: Date,
  ): Promise<SetMatchMutedResponse>;
}

export interface ChatDependencies {
  store: ChatStore;
  now: () => Date;
}
