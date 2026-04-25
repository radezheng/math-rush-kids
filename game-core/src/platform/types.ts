export interface InputSnapshot {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

export interface InputAdapter {
  getSnapshot(): InputSnapshot;
  endFrame(): void;
}

export interface StorageAdapter {
  getNumber(key: string, fallback: number): number;
  setNumber(key: string, value: number): void;
}

export interface AudioAdapter {
  playTap(): void;
}

export interface LifecycleAdapter {
  onPause(callback: () => void): void;
  onResume(callback: () => void): void;
}

export interface PlatformAPI {
  input: InputAdapter;
  storage: StorageAdapter;
  audio: AudioAdapter;
  lifecycle: LifecycleAdapter;
}
