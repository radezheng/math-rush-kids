import type {
  AudioAdapter,
  InputAdapter,
  InputSnapshot,
  LifecycleAdapter,
  PlatformAPI,
  StorageAdapter,
} from '@game-core/platform/types';
import type { WeChatMiniGameWX } from './wxTypes';
import { getWx } from './wxTypes';

class WeChatInputAdapter implements InputAdapter {
  private pressed = false;
  private justPressed = false;
  private justReleased = false;

  setPressed(nextPressed: boolean): void {
    if (nextPressed && !this.pressed) {
      this.justPressed = true;
    }
    if (!nextPressed && this.pressed) {
      this.justReleased = true;
    }
    this.pressed = nextPressed;
  }

  getSnapshot(): InputSnapshot {
    return {
      pressed: this.pressed,
      justPressed: this.justPressed,
      justReleased: this.justReleased,
    };
  }

  endFrame(): void {
    this.justPressed = false;
    this.justReleased = false;
  }
}

class WeChatStorageAdapter implements StorageAdapter {
  constructor(private readonly wxApi?: WeChatMiniGameWX) {}

  getNumber(key: string, fallback: number): number {
    try {
      const raw = this.wxApi?.getStorageSync?.(key);
      const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : Number.NaN;
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  setNumber(key: string, value: number): void {
    try {
      this.wxApi?.setStorageSync?.(key, value);
    } catch {
      // Storage is best-effort in the preview shell.
    }
  }
}

class WeChatAudioAdapter implements AudioAdapter {
  constructor(private readonly wxApi?: WeChatMiniGameWX) {}

  playTap(): void {
    try {
      this.wxApi?.vibrateShort?.({ type: 'light' });
    } catch {
      // Haptics are optional.
    }
  }
}

class WeChatLifecycleAdapter implements LifecycleAdapter {
  constructor(private readonly wxApi?: WeChatMiniGameWX) {}

  onPause(callback: () => void): void {
    this.wxApi?.onHide?.(callback);
  }

  onResume(callback: () => void): void {
    this.wxApi?.onShow?.(callback);
  }
}

export interface WeChatPlatform extends PlatformAPI {
  input: WeChatInputAdapter;
}

export function createWeChatPlatform(wxApi: WeChatMiniGameWX | undefined = getWx()): WeChatPlatform {
  return {
    input: new WeChatInputAdapter(),
    storage: new WeChatStorageAdapter(wxApi),
    audio: new WeChatAudioAdapter(wxApi),
    lifecycle: new WeChatLifecycleAdapter(wxApi),
  };
}
