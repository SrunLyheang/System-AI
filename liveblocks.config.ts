// Define Liveblocks types for your application
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Live cursor position on the canvas, or null when off-canvas.
      cursor: { x: number; y: number } | null;
      // True while this user is waiting on an AI response.
      isThinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // Populated when the React Flow canvas lands (next feature unit).
    Storage: Record<string, never>;

    // Custom user info set when authenticating with a secret key
    UserMeta: {
      // Clerk user ID.
      id: string;
      info: {
        // Display name shown on cursors and avatars.
        name: string;
        // Avatar image URL.
        avatar: string;
        // Deterministic cursor color derived from the user ID.
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: Record<string, never>;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: Record<string, never>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: Record<string, never>;
  }
}

export {};
