import { GameRuntime } from '@game-core/runtime/GameRuntime';
import type { Operation } from '@game-core/gameplay/mathRush';
import { createWeChatLayout, drawWeChatScreen, hitTest, type WeChatAction, type WeChatLayout } from './canvasShell';
import { createWeChatPlatform } from './platform';
import { getWx, type WeChatMiniGameWX, type WeChatTouchEvent } from './wxTypes';

interface ShellOptions {
  wxApi?: WeChatMiniGameWX;
}

export class WeChatMiniGameShell {
  private readonly wxApi: WeChatMiniGameWX | undefined;
  private readonly canvas: { width: number; height: number; getContext(contextId: '2d'): CanvasRenderingContext2D | null };
  private readonly ctx: CanvasRenderingContext2D;
  private readonly platform;
  private readonly runtime;
  private layout: WeChatLayout | null = null;
  private unsubscribe: (() => void) | null = null;

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
      this.layout = createWeChatLayout(state, this.canvas.width, this.canvas.height);
      drawWeChatScreen(this.ctx, state, this.layout);
    });
    this.bindTouchEvents();
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private createCanvas(): { width: number; height: number; getContext(contextId: '2d'): CanvasRenderingContext2D | null } {
    const canvas = this.wxApi?.createCanvas?.();
    if (!canvas) {
      throw new Error('wx.createCanvas is required for the WeChat Mini Game shell.');
    }

    const info = this.wxApi?.getSystemInfoSync?.() ?? {};
    const pixelRatio = info.pixelRatio && info.pixelRatio > 0 ? info.pixelRatio : 1;
    const logicalWidth = info.windowWidth ?? 375;
    const logicalHeight = info.windowHeight ?? 667;
    canvas.width = Math.round(logicalWidth * pixelRatio);
    canvas.height = Math.round(logicalHeight * pixelRatio);

    const context = canvas.getContext('2d');
    context?.scale(pixelRatio, pixelRatio);

    return {
      width: logicalWidth,
      height: logicalHeight,
      getContext: () => context,
    };
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
}

export function startWeChatMiniGame(options: ShellOptions = {}): WeChatMiniGameShell {
  const shell = new WeChatMiniGameShell(options);
  shell.start();
  return shell;
}

startWeChatMiniGame();

export type { Operation };
