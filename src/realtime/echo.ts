import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { apiFetch } from '../api/client';

(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

interface ChannelAuthorizationData {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
}

let echo: Echo<'pusher'> | null = null;

/**
 * No-op stand-in used when Pusher isn't configured. Every caller in this app
 * only ever does `getEcho().private(x).listen(y, cb)` / `.stopListening(y, cb)`,
 * so this stub covers that surface without connecting anywhere or throwing.
 */
const noopChannel = {
  listen: () => noopChannel,
  stopListening: () => noopChannel,
};
const noopEcho = { private: () => noopChannel, disconnect: () => {} } as unknown as Echo<'pusher'>;

/**
 * Single lazily-created Echo instance for the whole app. Uses a custom
 * authorizer instead of Echo's default cookie-based auth request, because
 * this SPA authenticates with a Sanctum Bearer token (see api/client.ts),
 * not a session cookie — apiFetch() already knows how to attach it.
 */
export function getEcho(): Echo<'pusher'> {
  if (echo) return echo;

  if (!import.meta.env.VITE_PUSHER_APP_KEY) {
    return noopEcho;
  }

  echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: { name: string }) => ({
      authorize(
        socketId: string,
        callback: (error: Error | null, authData: ChannelAuthorizationData | null) => void
      ) {
        apiFetch<ChannelAuthorizationData>('/broadcasting/auth', {
          method: 'POST',
          body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
        })
          .then((data) => callback(null, data))
          .catch((error) => callback(error instanceof Error ? error : new Error('Error de autorización'), null));
      },
    }),
  });

  return echo;
}

export function disconnectEcho(): void {
  if (echo) {
    echo.disconnect();
    echo = null;
  }
}
