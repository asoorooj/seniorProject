export type MessageInit = {
  id?: number;
  userId?: number;
  isUser: boolean;
  textMessage: string;
  timestamp: Date;
  avatarUrl?: string;
  status?: "sending" | "sent" | "failed";
};

export class Message {
  id?: number;
  userId?: number;
  isUser: boolean;
  textMessage: string;
  timestamp: Date;
  avatarUrl?: string;
  status?: "sending" | "sent" | "failed";

  constructor({
    id,
    userId,
    isUser,
    textMessage,
    timestamp,
    avatarUrl,
    status,
  }: MessageInit) {
    this.id = id;
    this.userId = userId;
    this.isUser = isUser;
    this.textMessage = textMessage;
    this.timestamp = timestamp;
    this.avatarUrl = avatarUrl;
    this.status = status;
  }
}
