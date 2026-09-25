declare module "linebot" {
  export interface LineMessage {
    type: string;
    text: string;
    messageId: string;
  }

  export interface LineSource {
    userId: string;
  }

  export interface LineEvent {
    message: LineMessage;
    source: LineSource;
    reply(message: string): Promise<unknown>;
  }

  export interface LineBotOptions {
    channelId?: string;
    channelSecret?: string;
    channelAccessToken?: string;
  }

  export interface LineBot {
    on(event: "message", listener: (event: LineEvent) => void | Promise<unknown>): void;
    parser(): (request: unknown, response: unknown) => void;
    push(userId: string, message: string): Promise<unknown>;
  }

  const linebot: (options: LineBotOptions) => LineBot;
  export = linebot;
}
