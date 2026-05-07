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
  const sections = measureHomeSections(width, height, topInset, settingsExpanded);
  const { gap, operationCardHeight, operationGap, operationRowStep, scale } = sections.metrics;

  targets.push({ ...sections.stats, label: '最高记录 / 排行榜', action: { type: 'home' }, disabled: true });
  targets.push({ ...sections.settingsToggle, label: '练习设置', action: { type: 'toggle-settings' } });

  if (settingsExpanded) {
    const rowTop = sections.settingsPanel.y + sections.settingsToggle.height + gap;
    const stepperX = sections.settingsPanel.x + Math.round(112 * scale);
    const stepperWidth = sections.settingsPanel.width - Math.round(112 * scale);
    const rowStep = Math.round(40 * scale);
    addStepperTargets(targets, '题数', 'adjust-question-count', state.settings.questionCount, QUESTION_COUNT_MIN, QUESTION_COUNT_MAX, stepperX, rowTop, stepperWidth, scale);
    addStepperTargets(targets, '数字范围', 'adjust-max-number', state.settings.maxNumber, MAX_NUMBER_MIN, MAX_NUMBER_MAX, stepperX, rowTop + rowStep, stepperWidth, scale);

    const pillWidth = (sections.settingsPanel.width - gap * 2) / 3;
    DIFFICULTY_META.forEach((difficulty, index) => {
      targets.push({
        x: sections.settingsPanel.x + index * (pillWidth + gap),
        y: rowTop + rowStep + Math.round(40 * scale),
        width: pillWidth,
        height: Math.round(30 * scale),
        label: difficulty.label,
        action: { type: 'set-difficulty', difficulty: difficulty.id },
      });
    });
  }

  const cardWidth = (sections.operations.width - operationGap) / 2;
  OPERATION_META.forEach((operation, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    targets.push({
      x: sections.operations.x + col * (cardWidth + operationGap),
      y: sections.operations.y + row * operationRowStep,
      width: cardWidth,
      height: operationCardHeight,
      label: operation.label,
      action: { type: 'toggle-operation', operation: operation.id },
    });
  });

  targets.push({ ...sections.start, label: '快速开始', action: { type: 'start' }, disabled: state.settings.operations.length === 0 });
  targets.push({ ...sections.ad, label: '广告位预留', action: { type: 'home' }, disabled: true });
}

interface HomeMetrics {
  margin: number;
  contentWidth: number;
  gap: number;
  operationGap: number;
  heroHeight: number;
  statsHeight: number;
  settingsHeight: number;
  settingsToggleHeight: number;
  operationsHeight: number;
  operationCardHeight: number;
  operationRowStep: number;
  startHeight: number;
  adHeight: number;
  adBottomMargin: number;
  scale: number;
  compact: boolean;
}

interface HomeSections {
  hero: Rect;
  stats: Rect;
  settingsPanel: Rect;
  settingsToggle: Rect;
  operations: Rect;
  start: Rect;
  ad: Rect;
  metrics: HomeMetrics;
}

function measureHomeMetrics(width: number, height: number, topInset: number, settingsExpanded: boolean): HomeMetrics {
  const availableHeight = Math.max(360, height - topInset);
  const scale = Math.max(0.72, Math.min(1, availableHeight / 620));
  const compact = scale < 0.96 || width <= 375;
  const margin = compact ? 24 : 28;
  const contentWidth = width - margin * 2;
  const gap = Math.max(5, Math.round(10 * scale));
  const operationGap = Math.max(6, Math.round(10 * scale));
  const heroHeight = Math.round((settingsExpanded ? 40 : 48) * scale);
  const statsHeight = Math.round((settingsExpanded ? 38 : 48) * scale);
  const settingsHeight = settingsExpanded ? Math.round(160 * scale) : Math.round(54 * scale);
  const settingsToggleHeight = Math.min(settingsHeight, Math.round(54 * scale));
  const operationCardHeight = Math.round(44 * scale);
  const operationRowStep = operationCardHeight + Math.max(5, Math.round(8 * scale));
  const operationsHeight = operationRowStep + operationCardHeight;
  const startHeight = Math.round(50 * scale);
  const adHeight = Math.round(42 * scale);
  const adBottomMargin = Math.max(12, Math.min(16, Math.round(14 * scale)));

  return {
    margin,
    contentWidth,
    gap,
    operationGap,
    heroHeight,
    statsHeight,
    settingsHeight,
    settingsToggleHeight,
    operationsHeight,
    operationCardHeight,
    operationRowStep,
    startHeight,
    adHeight,
    adBottomMargin,
    scale,
    compact,
  };
}

function measureHomeSections(width: number, height: number, topInset: number, settingsExpanded: boolean): HomeSections {
  const metrics = measureHomeMetrics(width, height, topInset, settingsExpanded);
  const { margin, contentWidth, gap } = metrics;
  const ad = {
    x: margin,
    y: height - metrics.adBottomMargin - metrics.adHeight,
    width: contentWidth,
    height: metrics.adHeight,
  };
  const start = {
    x: margin,
    y: ad.y - gap - metrics.startHeight,
    width: contentWidth,
    height: metrics.startHeight,
  };
  const operations = {
    x: margin,
    y: start.y - gap - metrics.operationsHeight,
    width: contentWidth,
    height: metrics.operationsHeight,
  };

  const minContentTop = topInset + Math.round((settingsExpanded ? 28 : 42) * metrics.scale);
  const fixedBottom = operations.y;
  const naturalHeight = metrics.heroHeight + gap + metrics.statsHeight + gap + metrics.settingsHeight + gap;
  const extraSpace = Math.max(0, fixedBottom - minContentTop - naturalHeight);
  let cursor = minContentTop + Math.min(extraSpace, Math.round(18 * metrics.scale));

  const hero = { x: margin - 4, y: cursor, width: contentWidth + 8, height: metrics.heroHeight };
  cursor += metrics.heroHeight + gap;
  const stats = { x: margin, y: cursor, width: contentWidth, height: metrics.statsHeight };
  cursor += metrics.statsHeight + gap;
  const settingsPanel = { x: margin, y: cursor, width: contentWidth, height: metrics.settingsHeight };
  const settingsToggle = { x: margin, y: cursor, width: contentWidth, height: metrics.settingsToggleHeight };

  return { hero, stats, settingsPanel, settingsToggle, operations, start, ad, metrics };
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
  scale = 1,
): void {
  const buttonSize = Math.round(38 * scale);
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
  const sections = measureHomeSections(layout.width, layout.height, layout.topInset, layout.settingsExpanded);
  const { scale, compact, gap } = sections.metrics;
  const leftPadding = Math.round(16 * scale);
  const heroTitleSize = Math.round((compact ? 15 : 17) * scale);
  const bodySize = Math.round((compact ? 11 : 13) * scale);
  const labelSize = Math.round((compact ? 12 : 14) * scale);
  const buttonSize = Math.round((compact ? 14 : 16) * scale);

  panel(ctx, sections.hero.x, sections.hero.y, sections.hero.width, sections.hero.height, '#ffffffcc');
  text(ctx, compact ? '选择运算开始练习' : '选择运算，马上开始练习', sections.hero.x + leftPadding, sections.hero.y + Math.round(15 * scale), heroTitleSize, '#26304f', 'bold');
  text(ctx, formatHeroSummary(state, compact), sections.hero.x + leftPadding, sections.hero.y + Math.round(34 * scale), bodySize, '#65708f');

  panel(ctx, sections.stats.x, sections.stats.y, sections.stats.width, sections.stats.height, '#ffffffd9');
  text(ctx, '最高记录', sections.stats.x + leftPadding, sections.stats.y + Math.round(15 * scale), labelSize, '#26304f', 'bold');
  text(ctx, `${state.bestStars || 0} 星 · ${Math.round(state.bestAccuracy * 100)}%`, sections.stats.x + leftPadding, sections.stats.y + Math.round(32 * scale), bodySize, '#65708f');
  text(ctx, '排行', sections.stats.x + sections.stats.width - leftPadding, sections.stats.y + Math.round(15 * scale), labelSize, '#26304f', 'bold', 'right');
  text(ctx, '待接入', sections.stats.x + sections.stats.width - leftPadding, sections.stats.y + Math.round(32 * scale), bodySize, '#9aa3bd', 'normal', 'right');

  const settingsToggle = layout.targets.find((item) => item.action.type === 'toggle-settings');
  if (settingsToggle) {
    panel(ctx, sections.settingsPanel.x - 3, sections.settingsPanel.y - 3, sections.settingsPanel.width + 6, sections.settingsPanel.height + 6, '#ffffffd9');
    text(ctx, '练习设置', settingsToggle.x + leftPadding, settingsToggle.y + Math.round(16 * scale), labelSize, '#26304f', 'bold');
    text(ctx, formatSettingsSummary(state, compact), settingsToggle.x + leftPadding, settingsToggle.y + Math.round(36 * scale), bodySize, '#65708f');
    text(ctx, layout.settingsExpanded ? '收起' : '展开', settingsToggle.x + settingsToggle.width - leftPadding, settingsToggle.y + Math.round(26 * scale), labelSize, '#5b7cfa', 'bold', 'right');
  }

  if (layout.settingsExpanded && settingsToggle) {
    const questionMinus = layout.targets.find((item) => item.action.type === 'adjust-question-count' && item.action.delta < 0);
    const maxMinus = layout.targets.find((item) => item.action.type === 'adjust-max-number' && item.action.delta < 0);
    const firstDifficulty = layout.targets.find((item) => item.action.type === 'set-difficulty');
    if (questionMinus) {
      text(ctx, '题数', settingsToggle.x + leftPadding, questionMinus.y + questionMinus.height / 2, labelSize, '#26304f', 'bold');
      text(ctx, `${state.settings.questionCount}题`, layout.width / 2, questionMinus.y + questionMinus.height / 2, labelSize, '#26304f', 'bold', 'center');
    }
    if (maxMinus) {
      text(ctx, '范围', settingsToggle.x + leftPadding, maxMinus.y + maxMinus.height / 2, labelSize, '#26304f', 'bold');
      text(ctx, `${state.settings.maxNumber}内`, layout.width / 2, maxMinus.y + maxMinus.height / 2, labelSize, '#26304f', 'bold', 'center');
    }
    if (firstDifficulty) {
      text(ctx, '难度', settingsToggle.x + leftPadding, firstDifficulty.y - Math.max(7, gap), labelSize, '#26304f', 'bold');
    }

    for (const target of layout.targets.filter((item) => item.action.type === 'adjust-question-count' || item.action.type === 'adjust-max-number')) {
      button(ctx, target, target.disabled ? '#e0e5f2' : '#ffffffee', target.disabled ? '#a8b0c8' : '#26304f');
      text(ctx, target.label.endsWith('+') ? '+' : '−', target.x + target.width / 2, target.y + target.height / 2, Math.round(21 * scale), target.disabled ? '#a8b0c8' : '#26304f', 'bold', 'center');
    }

    for (const target of layout.targets.filter((item) => item.action.type === 'set-difficulty')) {
      const action = target.action;
      const active = action.type === 'set-difficulty' && state.settings.difficulty === action.difficulty;
      button(ctx, target, active ? '#ff8a4c' : '#ffffffee', active ? '#ffffff' : '#26304f');
      text(ctx, target.label, target.x + target.width / 2, target.y + target.height / 2, labelSize, active ? '#ffffff' : '#26304f', 'bold', 'center');
    }
  }

  const firstOperation = layout.targets.find((item) => item.action.type === 'toggle-operation');
  if (firstOperation) {
    text(ctx, '选择运算', 24, firstOperation.y - Math.max(9, gap), labelSize, '#26304f', 'bold');
  }
  for (const target of layout.targets.filter((item) => item.action.type === 'toggle-operation')) {
    const action = target.action;
    const meta = action.type === 'toggle-operation' ? OPERATION_META.find((item) => item.id === action.operation) : undefined;
    const active = action.type === 'toggle-operation' && state.settings.operations.includes(action.operation);
    button(ctx, target, active ? '#5b7cfa' : '#ffffffd9', active ? '#ffffff' : '#26304f');
    text(ctx, `${meta?.icon ?? ''} ${compact ? shortOperationLabel(target.label) : target.label}`, target.x + target.width / 2, target.y + target.height / 2, buttonSize, active ? '#ffffff' : '#26304f', 'bold', 'center');
  }

  const start = layout.targets.find((item) => item.action.type === 'start');
  if (start) {
    button(ctx, start, start.disabled ? '#b8c0d8' : '#13b981', '#ffffff');
    text(ctx, start.disabled ? '至少选一种' : '🚀 快速开始', start.x + start.width / 2, start.y + start.height / 2, Math.round(17 * scale), '#ffffff', 'bold', 'center');
  }

  panel(ctx, sections.ad.x, sections.ad.y, sections.ad.width, sections.ad.height, 'rgba(255,255,255,0.45)');
  text(ctx, '广告位预留', layout.width / 2, sections.ad.y + sections.ad.height / 2, labelSize, '#9aa3bd', 'bold', 'center');
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

function formatOperationsSummary(operations: Operation[], compact = false): string {
  if (operations.length === 0) return '未选运算';
  const labels = operations.map((operation) => operationLabel(operation));
  return compact ? labels.join('/') : labels.join(' / ');
}

function formatHeroSummary(state: SessionState, compact = false): string {
  return [`${state.settings.questionCount}题`, `${state.settings.maxNumber}内`, difficultyLabel(state.settings.difficulty), formatOperationsSummary(state.settings.operations, compact)].join(' · ');
}

function formatSettingsSummary(state: SessionState, compact = false): string {
  if (compact) {
    return `${state.settings.questionCount}题 / ${state.settings.maxNumber}内 / ${difficultyLabel(state.settings.difficulty)} / ${formatOperationsSummary(state.settings.operations, true)}`;
  }
  return `${state.settings.questionCount} 题 / ${state.settings.maxNumber} 以内 / ${difficultyLabel(state.settings.difficulty)} / ${formatOperationsSummary(state.settings.operations)}`;
}

function shortOperationLabel(label: string): string {
  return label.replace('法', '');
}
