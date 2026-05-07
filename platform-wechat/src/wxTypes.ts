export interface WeChatTouch {
  identifier?: number;
  clientX: number;
  clientY: number;
  pageX?: number;
  pageY?: number;
}

export interface WeChatTouchEvent {
  touches?: WeChatTouch[];
  changedTouches?: WeChatTouch[];
}

export interface WeChatSafeArea {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface WeChatMenuButtonRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface WeChatSystemInfo {
  windowWidth?: number;
  windowHeight?: number;
  pixelRatio?: number;
  statusBarHeight?: number;
  safeArea?: WeChatSafeArea;
}

export interface WeChatCanvas {
  width: number;
  height: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
}

export interface WeChatMiniGameWX {
  createCanvas?: () => WeChatCanvas;
  getSystemInfoSync?: () => WeChatSystemInfo;
  getMenuButtonBoundingClientRect?: () => WeChatMenuButtonRect;
  getStorageSync?: (key: string) => unknown;
  setStorageSync?: (key: string, value: unknown) => void;
  onShow?: (callback: () => void) => void;
  onHide?: (callback: () => void) => void;
  onTouchStart?: (callback: (event: WeChatTouchEvent) => void) => void;
  onTouchEnd?: (callback: (event: WeChatTouchEvent) => void) => void;
  onTouchCancel?: (callback: (event: WeChatTouchEvent) => void) => void;
  vibrateShort?: (options?: { type?: 'light' | 'medium' | 'heavy'; success?: () => void; fail?: () => void }) => void;
  shareAppMessage?: (options: { title: string; imageUrl?: string; query?: string }) => void;
}

declare const wx: WeChatMiniGameWX | undefined;

export function getWx(): WeChatMiniGameWX | undefined {
  return typeof wx === 'undefined' ? undefined : wx;
}
