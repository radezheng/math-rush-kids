import type { Difficulty, Operation } from '@game-core/gameplay/mathRush';
import type { SessionState } from '@game-core/runtime/GameRuntime';

export type WeChatAction =
  | { type: 'toggle-operation'; operation: Operation }
  | { type: 'toggle-settings' }
  | { type: 'adjust-question-count'; delta: number }
  | { type: 'adjust-max-number'; delta: number }
  | { type: 'set-difficulty'; difficulty: Difficulty }
  | { type: 'start' }
  | { type: 'digit'; digit: string }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'submit' }
  | { type: 'next' }
  | { type: 'replay' }
  | { type: 'home' };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HitTarget extends Rect {
  action: WeChatAction;
  label: string;
  disabled?: boolean;
}

export interface WeChatLayout {
  width: number;
  height: number;
  topInset: number;
  settingsExpanded: boolean;
  targets: HitTarget[];
}

export interface WeChatLayoutOptions {
  topInset?: number;
  settingsExpanded?: boolean;
}

const OPERATION_META: Array<{ id: Operation; label: string; icon: string }> = [
  { id: 'add', label: '加法', icon: '+' },
  { id: 'subtract', label: '减法', icon: '−' },
  { id: 'multiply', label: '乘法', icon: '×' },
  { id: 'divide', label: '除法', icon: '÷' },
];

const DIFFICULTY_META: Array<{ id: Difficulty; label: string }> = [
  { id: 'easy', label: '轻松' },
  { id: 'normal', label: '普通' },
  { id: 'challenge', label: '挑战' },
];

const KEYPAD_ITEMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清空', '0', '退格'];
const QUESTION_COUNT_MIN = 5;
const QUESTION_COUNT_MAX = 30;
const MAX_NUMBER_MIN = 10;
const MAX_NUMBER_MAX = 100;
const SETTING_STEP = 5;

export function createWeChatLayout(state: SessionState, width: number, height: number, options: WeChatLayoutOptions = {}): WeChatLayout {
  const targets: HitTarget[] = [];
  const safeWidth = Math.max(300, width);
  const safeHeight = Math.max(480, height);
  const topInset = Math.max(0, Math.min(options.topInset ?? 0, Math.floor(safeHeight * 0.22)));
  const settingsExpanded = options.settingsExpanded ?? false;

  if (state.screen === 'home') {
    addHomeTargets(targets, state, safeWidth, safeHeight, topInset, settingsExpanded);
  } else if (state.screen === 'question') {
    addQuestionTargets(targets, state, safeWidth, safeHeight, topInset);
  } else if (state.screen === 'feedback') {
    targets.push({ x: 28, y: safeHeight - 104, width: safeWidth - 56, height: 64, label: '下一步', action: { type: 'next' } });
  } else if (state.screen === 'result') {
    targets.push({ x: 28, y: safeHeight - 152, width: safeWidth - 56, height: 56, label: '再来一局', action: { type: 'replay' } });
    targets.push({ x: 28, y: safeHeight - 84, width: safeWidth - 56, height: 52, label: '返回首页', action: { type: 'home' } });
  }

  return { width: safeWidth, height: safeHeight, topInset, settingsExpanded, targets };
}

export function hitTest(layout: WeChatLayout, x: number, y: number): HitTarget | null {
  for (let index = layout.targets.length - 1; index >= 0; index -= 1) {
    const target = layout.targets[index];
    if (!target.disabled && x >= target.x && x <= target.x + target.width && y >= target.y && y <= target.y + target.height) {
      return target;
    }
  }
  return null;
}

export function drawWeChatScreen(ctx: CanvasRenderingContext2D, state: SessionState, layout: WeChatLayout): void {
  clear(ctx, layout.width, layout.height);
  drawBackground(ctx, layout.width, layout.height);
  drawHeader(ctx, state, layout);

  if (state.screen === 'home') {
    drawHome(ctx, state, layout);
  } else if (state.screen === 'question') {
    drawQuestion(ctx, state, layout);
  } else if (state.screen === 'feedback') {
    drawFeedback(ctx, state, layout);
  } else if (state.screen === 'result') {
    drawResult(ctx, state, layout);
  }
}

function addHomeTargets(targets: HitTarget[], state: SessionState, width: number, height: number, topInset: number, settingsExpanded: boolean): void {
  const horizontalMargin = 28;
  const gap = 10;
  const contentWidth = width - horizontalMargin * 2;
  const heroY = topInset + 62;
  const settingsY = heroY + 70;
  const settingsHeight = settingsExpanded ? 196 : 60;

  targets.push({ x: horizontalMargin, y: settingsY, width: contentWidth, height: 60, label: '练习设置', action: { type: 'toggle-settings' } });

  if (settingsExpanded) {
    const rowTop = settingsY + 68;
    addStepperTargets(targets, '题数', 'adjust-question-count', state.settings.questionCount, QUESTION_COUNT_MIN, QUESTION_COUNT_MAX, horizontalMargin + 124, rowTop, contentWidth - 124);
    addStepperTargets(targets, '数字范围', 'adjust-max-number', state.settings.maxNumber, MAX_NUMBER_MIN, MAX_NUMBER_MAX, horizontalMargin + 124, rowTop + 52, contentWidth - 124);

    const pillWidth = (contentWidth - gap * 2) / 3;
    DIFFICULTY_META.forEach((difficulty, index) => {
      targets.push({
        x: horizontalMargin + index * (pillWidth + gap),
        y: settingsY + 152,
        width: pillWidth,
        height: 38,
        label: difficulty.label,
        action: { type: 'set-difficulty', difficulty: difficulty.id },
      });
    });
  }

  const cardWidth = (contentWidth - gap) / 2;
  const desiredOperationTop = settingsY + settingsHeight + 28;
  const fixedStartY = height - 76;
  const maxOperationTop = fixedStartY - 116;
  const operationTop = Math.max(topInset + 242, Math.min(desiredOperationTop, maxOperationTop));
  OPERATION_META.forEach((operation, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    targets.push({
      x: horizontalMargin + col * (cardWidth + gap),
      y: operationTop + row * 58,
      width: cardWidth,
      height: 50,
      label: operation.label,
      action: { type: 'toggle-operation', operation: operation.id },
    });
  });

  const startY = Math.min(height - 76, operationTop + 2 * 58 + 16);
  targets.push({ x: horizontalMargin, y: startY, width: contentWidth, height: 56, label: '快速开始', action: { type: 'start' }, disabled: state.settings.operations.length === 0 });
}

function addStepperTargets(
  targets: HitTarget[],
  label: string,
  actionType: 'adjust-question-count' | 'adjust-max-number',
  value: number,
  min: number,
  max: number,
  x: number,
  y: number,
  width: number,
): void {
  const buttonSize = 40;
  const plusAction: WeChatAction = actionType === 'adjust-question-count' ? { type: 'adjust-question-count', delta: SETTING_STEP } : { type: 'adjust-max-number', delta: SETTING_STEP };
  const minusAction: WeChatAction = actionType === 'adjust-question-count' ? { type: 'adjust-question-count', delta: -SETTING_STEP } : { type: 'adjust-max-number', delta: -SETTING_STEP };
  targets.push({ x, y, width: buttonSize, height: buttonSize, label: `${label} -`, action: minusAction, disabled: value <= min });
  targets.push({ x: x + width - buttonSize, y, width: buttonSize, height: buttonSize, label: `${label} +`, action: plusAction, disabled: value >= max });
}

function addQuestionTargets(targets: HitTarget[], state: SessionState, width: number, height: number, topInset: number): void {
  const gap = 10;
  const keyWidth = (width - 56 - gap * 2) / 3;
  const keyHeight = 48;
  const keypadTop = Math.max(topInset + 274, height - 310);

  KEYPAD_ITEMS.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    targets.push({
      x: 28 + col * (keyWidth + gap),
      y: keypadTop + row * (keyHeight + gap),
      width: keyWidth,
      height: keyHeight,
      label: item,
      action: item === '清空' ? { type: 'clear' } : item === '退格' ? { type: 'backspace' } : { type: 'digit', digit: item },
    });
  });

  targets.push({ x: 28, y: keypadTop + 4 * (keyHeight + gap) + 6, width: width - 56, height: 56, label: '提交答案', action: { type: 'submit' }, disabled: state.answerInput.length === 0 });
  targets.push({ x: 28, y: topInset + 12, width: 88, height: 36, label: '首页', action: { type: 'home' } });
}

function clear(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#fff7ad');
  gradient.addColorStop(0.45, '#ffe0f0');
  gradient.addColorStop(1, '#bde7ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  circle(ctx, width - 54, 80, 70);
  circle(ctx, 40, 150, 46);
}

function drawHeader(ctx: CanvasRenderingContext2D, state: SessionState, layout: WeChatLayout): void {
  text(ctx, '口算冲冲冲', 28, layout.topInset + 34, 24, '#26304f', 'bold');
  text(ctx, `最高 ${state.bestStars || 0} 星 · ${Math.round(state.bestAccuracy * 100)}%`, 28, layout.topInset + 62, 13, '#65708f');
}

function drawHome(ctx: CanvasRenderingContext2D, state: SessionState, layout: WeChatLayout): void {
  const heroY = layout.topInset + 62;
  panel(ctx, 22, heroY, layout.width - 44, 60, '#ffffffcc');
  text(ctx, '选择运算，马上开始练习', 42, heroY + 24, 19, '#26304f', 'bold');
  text(ctx, `${state.settings.questionCount} 题 · ${state.settings.maxNumber} 以内 · ${difficultyLabel(state.settings.difficulty)} · ${formatOperationsSummary(state.settings.operations)}`, 42, heroY + 47, 13, '#65708f');

  const settingsToggle = layout.targets.find((item) => item.action.type === 'toggle-settings');
  if (settingsToggle) {
    const settingsHeight = layout.settingsExpanded ? 196 : 60;
    panel(ctx, settingsToggle.x - 4, settingsToggle.y - 4, settingsToggle.width + 8, settingsHeight + 8, '#ffffffd9');
    text(ctx, '练习设置', settingsToggle.x + 16, settingsToggle.y + 20, 15, '#26304f', 'bold');
    text(ctx, formatSettingsSummary(state), settingsToggle.x + 16, settingsToggle.y + 43, 13, '#65708f');
    text(ctx, layout.settingsExpanded ? '收起' : '展开', settingsToggle.x + settingsToggle.width - 18, settingsToggle.y + 30, 14, '#5b7cfa', 'bold', 'right');
  }

  if (layout.settingsExpanded && settingsToggle) {
    text(ctx, '题数', settingsToggle.x + 16, settingsToggle.y + 88, 14, '#26304f', 'bold');
    text(ctx, `${state.settings.questionCount} 题`, layout.width / 2, settingsToggle.y + 88, 16, '#26304f', 'bold', 'center');
    text(ctx, '数字范围', settingsToggle.x + 16, settingsToggle.y + 140, 14, '#26304f', 'bold');
    text(ctx, `${state.settings.maxNumber} 以内`, layout.width / 2, settingsToggle.y + 140, 16, '#26304f', 'bold', 'center');
    text(ctx, '难度', settingsToggle.x + 16, settingsToggle.y + 174, 14, '#26304f', 'bold');

    for (const target of layout.targets.filter((item) => item.action.type === 'adjust-question-count' || item.action.type === 'adjust-max-number')) {
      button(ctx, target, target.disabled ? '#e0e5f2' : '#ffffffee', target.disabled ? '#a8b0c8' : '#26304f');
      text(ctx, target.label.endsWith('+') ? '+' : '−', target.x + target.width / 2, target.y + 23, 22, target.disabled ? '#a8b0c8' : '#26304f', 'bold', 'center');
    }

    for (const target of layout.targets.filter((item) => item.action.type === 'set-difficulty')) {
      const action = target.action;
      const active = action.type === 'set-difficulty' && state.settings.difficulty === action.difficulty;
      button(ctx, target, active ? '#ff8a4c' : '#ffffffee', active ? '#ffffff' : '#26304f');
      text(ctx, target.label, target.x + target.width / 2, target.y + 24, 14, active ? '#ffffff' : '#26304f', 'bold', 'center');
    }
  }

  const firstOperation = layout.targets.find((item) => item.action.type === 'toggle-operation');
  if (firstOperation) {
    text(ctx, '选择运算', 28, firstOperation.y - 14, 16, '#26304f', 'bold');
  }
  for (const target of layout.targets.filter((item) => item.action.type === 'toggle-operation')) {
    const action = target.action;
    const meta = action.type === 'toggle-operation' ? OPERATION_META.find((item) => item.id === action.operation) : undefined;
    const active = action.type === 'toggle-operation' && state.settings.operations.includes(action.operation);
    button(ctx, target, active ? '#5b7cfa' : '#ffffffd9', active ? '#ffffff' : '#26304f');
    text(ctx, `${meta?.icon ?? ''} ${target.label}`, target.x + target.width / 2, target.y + 30, 16, active ? '#ffffff' : '#26304f', 'bold', 'center');
  }

  const start = layout.targets.find((item) => item.action.type === 'start');
  if (start) {
    button(ctx, start, start.disabled ? '#b8c0d8' : '#13b981', '#ffffff');
    text(ctx, start.disabled ? '至少选择一种运算' : '🚀 快速开始', start.x + start.width / 2, start.y + 34, 19, '#ffffff', 'bold', 'center');
  }
}

function drawQuestion(ctx: CanvasRenderingContext2D, state: SessionState, layout: WeChatLayout): void {
  const question = state.question;
  if (!question) return;
  const home = layout.targets.find((item) => item.action.type === 'home');
  if (home) {
    button(ctx, home, '#ffffffaa', '#65708f');
    text(ctx, '首页', home.x + home.width / 2, home.y + 24, 14, '#65708f', 'bold', 'center');
  }

  const contentY = Math.max(116, layout.topInset + 104);
  text(ctx, `第 ${state.questionNumber}/${state.progress.total} 题`, 28, contentY, 18, '#26304f', 'bold');
  text(ctx, `答对 ${state.progress.correctCount} · 连对 ${state.progress.streak}`, layout.width - 28, contentY, 14, '#65708f', 'normal', 'right');
  panel(ctx, 28, contentY + 18, layout.width - 56, 132, '#ffffffd9');
  text(ctx, `${operationLabel(question.operation)}闯关`, layout.width / 2, contentY + 48, 15, '#65708f', 'bold', 'center');
  text(ctx, `${question.left} ${question.symbol} ${question.right}`, layout.width / 2, contentY + 98, 42, '#26304f', 'bold', 'center');
  text(ctx, state.answerInput || '？', layout.width / 2, contentY + 138, 28, state.answerInput ? '#13b981' : '#9aa3bd', 'bold', 'center');

  for (const target of layout.targets.filter((item) => item.action.type === 'digit' || item.action.type === 'clear' || item.action.type === 'backspace' || item.action.type === 'submit')) {
    const isSubmit = target.action.type === 'submit';
    button(ctx, target, target.disabled ? '#b8c0d8' : isSubmit ? '#5b7cfa' : '#ffffffee', isSubmit ? '#ffffff' : '#26304f');
    text(ctx, target.label, target.x + target.width / 2, target.y + (isSubmit ? 35 : 30), isSubmit ? 18 : 20, isSubmit ? '#ffffff' : '#26304f', 'bold', 'center');
  }
}

function drawFeedback(ctx: CanvasRenderingContext2D, state: SessionState, layout: WeChatLayout): void {
  const feedback = state.feedback;
  const question = state.question;
  if (!feedback || !question) return;
  const panelY = Math.max(124, layout.topInset + 90);
  panel(ctx, 26, panelY, layout.width - 52, 322, '#ffffffdd');
  text(ctx, feedback.isCorrect ? '🎉' : '💛', layout.width / 2, panelY + 58, 48, '#26304f', 'bold', 'center');
  text(ctx, feedback.message, layout.width / 2, panelY + 108, 22, '#26304f', 'bold', 'center');
  text(ctx, feedback.detail, layout.width / 2, panelY + 150, 16, '#65708f', 'normal', 'center');
  text(ctx, `${question.prompt} ${feedback.correctAnswer}`, layout.width / 2, panelY + 198, 24, feedback.isCorrect ? '#13b981' : '#ff8a4c', 'bold', 'center');
  text(ctx, `当前连对 ${feedback.streakAfter} · 已答对 ${state.progress.correctCount}/${state.progress.total}`, layout.width / 2, panelY + 250, 15, '#65708f', 'normal', 'center');
  if (feedback.streakReward) {
    text(ctx, feedback.streakReward, layout.width / 2, panelY + 290, 15, '#5b7cfa', 'bold', 'center');
  }

  const next = layout.targets.find((item) => item.action.type === 'next');
  if (next) {
    button(ctx, next, '#13b981', '#ffffff');
    text(ctx, state.questionNumber >= state.progress.total ? '🏁 查看成绩' : '➡️ 下一题', next.x + next.width / 2, next.y + 39, 20, '#ffffff', 'bold', 'center');
  }
}

function drawResult(ctx: CanvasRenderingContext2D, state: SessionState, layout: WeChatLayout): void {
  const result = state.results;
  if (!result) return;
  const panelY = Math.max(116, layout.topInset + 80);
  panel(ctx, 24, panelY, layout.width - 48, 326, '#ffffffdd');
  text(ctx, result.badge, layout.width / 2, panelY + 62, 52, '#26304f', 'bold', 'center');
  text(ctx, result.rewardTitle, layout.width / 2, panelY + 104, 18, '#ff8a4c', 'bold', 'center');
  text(ctx, result.rankLabel, layout.width / 2, panelY + 142, 28, '#26304f', 'bold', 'center');
  text(ctx, Array.from({ length: 3 }, (_, index) => (index < result.stars ? '⭐' : '☆')).join(' '), layout.width / 2, panelY + 184, 24, '#f4b400', 'bold', 'center');
  text(ctx, `答对 ${result.correctCount}/${result.total} · 正确率 ${result.accuracyText}`, layout.width / 2, panelY + 236, 17, '#65708f', 'bold', 'center');
  text(ctx, `最佳连对 ${result.bestStreak} · 金币 ${result.coins}`, layout.width / 2, panelY + 270, 17, '#65708f', 'bold', 'center');

  for (const target of layout.targets.filter((item) => item.action.type === 'replay' || item.action.type === 'home')) {
    const replay = target.action.type === 'replay';
    button(ctx, target, replay ? '#5b7cfa' : '#ffffffd9', replay ? '#ffffff' : '#26304f');
    text(ctx, target.label, target.x + target.width / 2, target.y + 35, 18, replay ? '#ffffff' : '#26304f', 'bold', 'center');
  }
}

function button(ctx: CanvasRenderingContext2D, rect: Rect, fill: string, stroke: string): void {
  roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 16);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke === '#ffffff' ? 'rgba(255,255,255,0.35)' : 'rgba(38,48,79,0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string): void {
  roundedRect(ctx, x, y, width, height, 24);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight: 'normal' | 'bold' = 'normal',
  align: CanvasTextAlign = 'left',
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function operationLabel(operation: Operation): string {
  return OPERATION_META.find((item) => item.id === operation)?.label ?? '口算';
}

function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_META.find((item) => item.id === difficulty)?.label ?? '普通';
}

function formatOperationsSummary(operations: Operation[]): string {
  if (operations.length === 0) return '未选运算';
  return operations.map((operation) => operationLabel(operation)).join(' / ');
}

function formatSettingsSummary(state: SessionState): string {
  return `${state.settings.questionCount} 题 / ${state.settings.maxNumber} 以内 / ${difficultyLabel(state.settings.difficulty)} / ${formatOperationsSummary(state.settings.operations)}`;
}
