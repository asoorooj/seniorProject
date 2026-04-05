export type MessageInit = {
  id?: number;
  sessionId?: number;
  isUser: boolean;
  textMessage: string;
  timestamp: Date;
  avatarUrl?: string;
  status?: "sending" | "sent" | "failed";
};

export class Message {
  id?: number;
  sessionId?: number;
  isUser: boolean;
  textMessage: string;
  timestamp: Date;
  avatarUrl?: string;
  status?: "sending" | "sent" | "failed";

  constructor({
    id,
    sessionId,
    isUser,
    textMessage,
    timestamp,
    avatarUrl,
    status,
  }: MessageInit) {
    this.id = id;
    this.sessionId = sessionId;
    this.isUser = isUser;
    this.textMessage = textMessage;
    this.timestamp = timestamp;
    this.avatarUrl = avatarUrl;
    this.status = status;
  }
}
