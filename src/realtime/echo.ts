import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { apiFetch } from '../api/client';

(window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

interface ChannelAuthorizationData {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
}

let echo: Echo<'reverb'> | null = null;

/**
 * Single lazily-created Echo instance for the whole app. Uses a custom
 * authorizer instead of Echo's default cookie-based auth request, because
 * this SPA authenticates with a Sanctum Bearer token (see api/client.ts),
 * not a session cookie — apiFetch() already knows how to attach it.
 */
export function getEcho(): Echo<'reverb'> {
  if (echo) return echo;

  echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
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
  echo?.disconnect();
  echo = null;
}
