declare module "irc-framework" {
  export interface ConnectOptions {
    host?: string;
    port?: number;
    nick?: string;
    username?: string;
    account?: { name?: string; password?: string };
    tls?: boolean;
    rejectUnauthorized?: boolean;
  }

  export interface Channel {
    join(): void;
  }

  export interface MessageEvent {
    message: string;
    from_server?: boolean;
    target: string;
    nick: string;
    reply(message: string): void;
  }

  export class Client {
    constructor(options?: Record<string, unknown>);
    connect(options: ConnectOptions): void;
    channel(name: string): Channel;
    join(channel: string): void;
    say(target: string, message: string): void;
    on(event: "registered", listener: () => void): this;
    on(event: "message", listener: (event: MessageEvent) => void): this;
  }

  const IRC: {
    Client: typeof Client;
  };

  export default IRC;
}
