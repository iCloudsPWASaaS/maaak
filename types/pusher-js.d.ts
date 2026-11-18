declare module "pusher-js" {
  export interface PusherChannel {
    bind<T>(event: string, callback: (payload: T) => void): void;
    unbind_all(): void;
  }

  export interface PusherOptions {
    cluster?: string;
    authEndpoint?: string;
    [key: string]: unknown;
  }

  export default class Pusher {
    constructor(key: string, options?: PusherOptions);
    subscribe(channelName: string): PusherChannel;
    unsubscribe(channelName: string): void;
    disconnect(): void;
  }
}
