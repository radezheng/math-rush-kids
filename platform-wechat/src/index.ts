import { GameRuntime } from '@game-core/runtime/GameRuntime';
import type { Operation } from '@game-core/gameplay/mathRush';
import { createWeChatLayout, drawWeChatScreen, hitTest, type WeChatAction, type WeChatLayout } from './canvasShell';
import { createWeChatPlatform } from './platform';
import { getWx, type WeChatMenuButtonRect, type WeChatMiniGameWX, type WeChatSystemInfo, type WeChatTouchEvent } from './wxTypes';

interface ShellOptions {
  wxApi?: WeChatMiniGameWX;
}

interface CanvasShellSurface {
  width: number;
  height: number;
  topInset: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
}

export class WeChatMiniGameShell {
  private readonly wxApi: WeChatMiniGameWX | undefined;
  private readonly canvas: CanvasShellSurface;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly platform;
  private readonly runtime;
  private layout: WeChatLayout | null = null;
  private unsubscribe: (() => void) | null = null;
  private settingsExpanded = false;

  constructor(options: ShellOptions = {}) {
    this.wxApi = options.wxApi ?? getWx();
    this.canvas = this.createCanvas();
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context is unavailable in WeChat shell.');
    this.ctx = context;
    this.platform = createWeChatPlatform(this.wxApi);
    this.runtime = new GameRuntime(this.platform);
  }

  start(): void {
    this.unsubscribe?.();
    this.unsubscribe = this.runtime.subscribe((state) => {
      this.layout = createWeChatLayout(state, this.canvas.width, this.canvas.height, {
        topInset: this.canvas.topInset,
        settingsExpanded: this.settingsExpanded,
      });
      drawWeChatScreen(this.ctx, state, this.layout);
    });
    this.bindTouchEvents();
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private createCanvas(): CanvasShellSurface {
    const canvas = this.wxApi?.createCanvas?.();
    if (!canvas) {
      throw new Error('wx.createCanvas is required for the WeChat Mini Game shell.');
    }

    const info = this.wxApi?.getSystemInfoSync?.() ?? {};
    const menuRect = this.readMenuButtonRect();
    const pixelRatio = info.pixelRatio && info.pixelRatio > 0 ? info.pixelRatio : 1;
    const logicalWidth = info.windowWidth ?? 375;
    const logicalHeight = info.windowHeight ?? 667;
    const topInset = computeTopInset(info, menuRect);
    canvas.width = Math.round(logicalWidth * pixelRatio);
    canvas.height = Math.round(logicalHeight * pixelRatio);

    const context = canvas.getContext('2d');
    context?.scale(pixelRatio, pixelRatio);

    return {
      width: logicalWidth,
      height: logicalHeight,
      topInset,
      getContext: () => context,
    };
  }

  private readMenuButtonRect(): WeChatMenuButtonRect | null {
    try {
      return this.wxApi?.getMenuButtonBoundingClientRect?.() ?? null;
    } catch {
      return null;
    }
  }

  private bindTouchEvents(): void {
    this.wxApi?.onTouchStart?.((event) => {
      this.platform.input.setPressed(true);
      this.handleTouch(event);
      this.platform.input.endFrame();
    });
    const release = (): void => {
      this.platform.input.setPressed(false);
      this.platform.input.endFrame();
    };
    this.wxApi?.onTouchEnd?.(release);
    this.wxApi?.onTouchCancel?.(release);
  }

  private handleTouch(event: WeChatTouchEvent): void {
    const touch = event.changedTouches?.[0] ?? event.touches?.[0];
    if (!touch || !this.layout) return;
    const target = hitTest(this.layout, touch.clientX, touch.clientY);
    if (!target) return;
    this.applyAction(target.action);
  }

  private applyAction(action: WeChatAction): void {
    if (action.type === 'toggle-operation') {
      this.runtime.toggleOperation(action.operation);
    } else if (action.type === 'toggle-settings') {
      this.settingsExpanded = !this.settingsExpanded;
      this.redraw();
    } else if (action.type === 'adjust-question-count') {
      const current = this.runtime.getState().settings.questionCount;
      this.runtime.updateSettings({ questionCount: current + action.delta });
    } else if (action.type === 'adjust-max-number') {
      const current = this.runtime.getState().settings.maxNumber;
      this.runtime.updateSettings({ maxNumber: current + action.delta });
    } else if (action.type === 'set-difficulty') {
      this.runtime.setDifficulty(action.difficulty);
    } else if (action.type === 'start') {
      this.runtime.startGame(this.runtime.getState().settings);
    } else if (action.type === 'digit') {
      this.runtime.appendDigit(action.digit);
    } else if (action.type === 'clear') {
      this.runtime.clearAnswer();
    } else if (action.type === 'backspace') {
      this.runtime.backspace();
    } else if (action.type === 'submit') {
      this.runtime.submitCurrentAnswer();
    } else if (action.type === 'next') {
      this.runtime.nextStep();
    } else if (action.type === 'replay') {
      this.runtime.replayWithCurrentSettings();
    } else if (action.type === 'home') {
      this.runtime.goHome();
    }
  }

  private redraw(): void {
    const state = this.runtime.getState();
    this.layout = createWeChatLayout(state, this.canvas.width, this.canvas.height, {
      topInset: this.canvas.topInset,
      settingsExpanded: this.settingsExpanded,
    });
    drawWeChatScreen(this.ctx, state, this.layout);
  }
}

export function computeTopInset(info: WeChatSystemInfo = {}, menuRect: WeChatMenuButtonRect | null = null): number {
  if (menuRect && menuRect.bottom > 0) {
    const menuGap = Math.max(4, menuRect.top - (info.statusBarHeight ?? info.safeArea?.top ?? 0));
    return Math.ceil(menuRect.bottom + menuGap + 8);
  }

  if (info.safeArea?.top !== undefined && info.safeArea.top > 0) {
    return Math.ceil(info.safeArea.top + 24);
  }

  if (info.statusBarHeight !== undefined && info.statusBarHeight > 0) {
    return Math.ceil(info.statusBarHeight + 24);
  }

  return 24;
}

export function startWeChatMiniGame(options: ShellOptions = {}): WeChatMiniGameShell {
  const shell = new WeChatMiniGameShell(options);
  shell.start();
  return shell;
}

startWeChatMiniGame();

export type { Operation };
