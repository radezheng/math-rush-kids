import { createWeChatLayout, hitTest } from './canvasShell.js';
import type { SessionState } from '@game-core/runtime/GameRuntime';

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown): void {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`Expected ${expectedText}, got ${actualText}`);
  }
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

type RectLike = { x: number; y: number; width: number; height: number; label: string };

function bottom(rect: RectLike): number {
  return rect.y + rect.height;
}

function overlaps(a: RectLike, b: RectLike): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && bottom(a) > b.y;
}

function assertNoOverlap(targets: RectLike[], message: string): void {
  for (let index = 0; index < targets.length; index += 1) {
    for (let next = index + 1; next < targets.length; next += 1) {
      assert(!overlaps(targets[index], targets[next]), `${message}: ${targets[index].label} overlaps ${targets[next].label}`);
    }
  }
}

function assertWithinViewport(layout: ReturnType<typeof createWeChatLayout>, message: string): void {
  for (const target of layout.targets) {
    assert(target.x >= 0, `${message}: ${target.label} starts before left edge`);
    assert(target.y >= layout.topInset, `${message}: ${target.label} starts above safe content`);
    assert(target.x + target.width <= layout.width, `${message}: ${target.label} exceeds right edge`);
    assert(bottom(target) <= layout.height, `${message}: ${target.label} exceeds bottom edge`);
  }
}

function assertAdPinnedNearBottom(layout: ReturnType<typeof createWeChatLayout>, message: string): void {
  const adSlot = layout.targets.find((item) => item.label === '广告位预留');
  assert(adSlot?.disabled, `${message}: missing disabled ad slot`);
  const bottomMargin = layout.height - bottom(adSlot!);
  assert(bottomMargin >= 12 && bottomMargin <= 16, `${message}: ad slot bottom margin should be 12-16, got ${bottomMargin}`);
}

function assertQuickStartOrder(layout: ReturnType<typeof createWeChatLayout>, message: string): void {
  const start = layout.targets.find((item) => item.action.type === 'start');
  const operations = layout.targets.filter((item) => item.action.type === 'toggle-operation');
  const adSlot = layout.targets.find((item) => item.label === '广告位预留');
  assert(start, `${message}: missing quick start`);
  assert(adSlot?.disabled, `${message}: missing disabled ad slot`);
  assert(operations.every((operation) => bottom(operation) <= start!.y), `${message}: quick start should stay below operation controls`);
  assert(bottom(start!) <= adSlot!.y, `${message}: quick start should stay above ad slot`);
  assert(bottom(adSlot!) <= layout.height, `${message}: ad slot should fit inside viewport`);
}

const baseState: SessionState = {
  screen: 'home',
  settings: {
    operations: ['add', 'subtract'],
    questionCount: 10,
    maxNumber: 20,
    difficulty: 'normal',
  },
  question: null,
  questionNumber: 0,
  answerInput: '',
  feedback: null,
  progress: {
    current: 0,
    total: 0,
    correctCount: 0,
    streak: 0,
    bestStreak: 0,
  },
  results: null,
  attempts: [],
  bestStars: 0,
  bestAccuracy: 0,
};

const homeLayout = createWeChatLayout(baseState, 375, 667);
const defaultOperation = homeLayout.targets.find((item) => item.action.type === 'toggle-operation' && item.action.operation === 'add');
const defaultStart = homeLayout.targets.find((item) => item.action.type === 'start');
assert(defaultOperation, 'default home should expose operation targets');
assert(defaultStart, 'default home should expose quick start target');
assertDeepEqual(hitTest(homeLayout, defaultOperation!.x + 12, defaultOperation!.y + 12)?.action, { type: 'toggle-operation', operation: 'add' });
assertEqual(hitTest(homeLayout, defaultStart!.x + defaultStart!.width / 2, defaultStart!.y + defaultStart!.height / 2)?.action.type, 'start');

const safeCollapsedHomeLayout = createWeChatLayout(baseState, 375, 667, { topInset: 70, settingsExpanded: false });
assertEqual(safeCollapsedHomeLayout.topInset, 70);
assertNoOverlap(safeCollapsedHomeLayout.targets, 'collapsed 375x667 safe-area home targets should not overlap');
assertWithinViewport(safeCollapsedHomeLayout, 'collapsed 375x667 safe-area home targets should fit viewport');
assertAdPinnedNearBottom(safeCollapsedHomeLayout, 'collapsed 375x667 safe-area home');
const collapsedStats = safeCollapsedHomeLayout.targets.find((item) => item.label === '最高记录 / 排行榜');
const collapsedAdSlot = safeCollapsedHomeLayout.targets.find((item) => item.label === '广告位预留');
assert(collapsedStats?.disabled, 'home should include a disabled compact record/leaderboard stats card');
assert(collapsedAdSlot?.disabled, 'home should include a disabled bottom ad slot placeholder');
assertQuickStartOrder(safeCollapsedHomeLayout, 'collapsed 375x667 safe-area home');
const settingsToggle = safeCollapsedHomeLayout.targets.find((item) => item.action.type === 'toggle-settings');
assert(settingsToggle, 'collapsed home should expose a practice settings toggle');
assertDeepEqual(hitTest(safeCollapsedHomeLayout, settingsToggle!.x + 20, settingsToggle!.y + 20)?.action, { type: 'toggle-settings' });
assert(
  !safeCollapsedHomeLayout.targets.some((item) => item.action.type === 'adjust-question-count' || item.action.type === 'adjust-max-number'),
  'collapsed settings should keep detailed setting controls hidden',
);
const shiftedOperation = safeCollapsedHomeLayout.targets.find((item) => item.action.type === 'toggle-operation' && item.action.operation === 'add');
assert(shiftedOperation && shiftedOperation.y >= 260, 'safe-area home operation controls should start below header and settings summary');

const expandedHomeLayout = createWeChatLayout(baseState, 375, 667, { topInset: 70, settingsExpanded: true });
assertNoOverlap(expandedHomeLayout.targets, 'expanded 375x667 safe-area home targets should not overlap');
assertWithinViewport(expandedHomeLayout, 'expanded 375x667 safe-area home targets should fit viewport');
assertAdPinnedNearBottom(expandedHomeLayout, 'expanded 375x667 safe-area home');
const expandedAdSlot = expandedHomeLayout.targets.find((item) => item.label === '广告位预留');
assert(expandedAdSlot?.disabled, 'expanded home should keep a disabled bottom ad slot placeholder');
const questionPlus = expandedHomeLayout.targets.find((item) => item.action.type === 'adjust-question-count' && item.action.delta === 5);
const questionMinus = expandedHomeLayout.targets.find((item) => item.action.type === 'adjust-question-count' && item.action.delta === -5);
const maxPlus = expandedHomeLayout.targets.find((item) => item.action.type === 'adjust-max-number' && item.action.delta === 5);
const maxMinus = expandedHomeLayout.targets.find((item) => item.action.type === 'adjust-max-number' && item.action.delta === -5);
assert(questionPlus && questionMinus && maxPlus && maxMinus, 'expanded settings should expose plus/minus controls for question count and max number');
assertDeepEqual(hitTest(expandedHomeLayout, questionPlus!.x + questionPlus!.width / 2, questionPlus!.y + questionPlus!.height / 2)?.action, {
  type: 'adjust-question-count',
  delta: 5,
});
assertDeepEqual(hitTest(expandedHomeLayout, maxMinus!.x + maxMinus!.width / 2, maxMinus!.y + maxMinus!.height / 2)?.action, {
  type: 'adjust-max-number',
  delta: -5,
});
assert(expandedHomeLayout.targets.some((item) => item.action.type === 'set-difficulty'), 'difficulty choices should be grouped inside expanded settings');
const expandedStart = expandedHomeLayout.targets.find((item) => item.action.type === 'start');
assert(expandedStart && expandedStart.y + expandedStart.height <= expandedHomeLayout.height - 20, 'expanded home quick start should fit on 375x667');
assertQuickStartOrder(expandedHomeLayout, 'expanded 375x667 safe-area home');

const compactExpandedHomeLayout = createWeChatLayout(baseState, 360, 640, { topInset: 80, settingsExpanded: true });
assertNoOverlap(compactExpandedHomeLayout.targets, 'expanded 360x640 safe-area home targets should not overlap');
assertWithinViewport(compactExpandedHomeLayout, 'expanded 360x640 safe-area home targets should fit viewport');
assertAdPinnedNearBottom(compactExpandedHomeLayout, 'expanded 360x640 safe-area home');
assertQuickStartOrder(compactExpandedHomeLayout, 'expanded 360x640 safe-area home');
assert(compactExpandedHomeLayout.targets.some((item) => item.action.type === 'adjust-question-count'), 'compact expanded settings should keep question count controls');
assert(compactExpandedHomeLayout.targets.some((item) => item.action.type === 'adjust-max-number'), 'compact expanded settings should keep max number controls');
assert(compactExpandedHomeLayout.targets.some((item) => item.action.type === 'set-difficulty'), 'compact expanded settings should keep difficulty choices');

const questionLayout = createWeChatLayout(
  {
    ...baseState,
    screen: 'question',
    answerInput: '12',
    questionNumber: 1,
    question: {
      id: '1-add-1-1-2',
      index: 0,
      operation: 'add',
      symbol: '+',
      left: 1,
      right: 1,
      answer: 2,
      prompt: '1 + 1 = ?',
    },
    progress: { current: 1, total: 10, correctCount: 0, streak: 0, bestStreak: 0 },
  },
  375,
  667,
  { topInset: 70 },
);
assertDeepEqual(hitTest(questionLayout, 190, 376)?.action, { type: 'digit', digit: '2' });
assertEqual(hitTest(questionLayout, 190, 648)?.action.type, 'submit');
const homeTarget = questionLayout.targets.find((item) => item.action.type === 'home');
assert(homeTarget && homeTarget.y >= 70, 'question home button should respect top inset');

console.log('wechat canvas layout tests passed');
