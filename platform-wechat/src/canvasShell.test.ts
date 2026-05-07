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
