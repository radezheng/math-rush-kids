import type { PlatformAPI } from '@game-core/platform/types';

export function createWeChatPlatform(): PlatformAPI {
  throw new Error('WeChat adapter not implemented yet. Add wx-specific input, storage, audio, and lifecycle wiring here.');
}
