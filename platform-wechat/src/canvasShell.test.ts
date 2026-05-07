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
assertEqual(hitTest(homeLayout, 40, 242)?.action.type, 'toggle-operation');
assertDeepEqual(hitTest(homeLayout, 40, 242)?.action, { type: 'toggle-operation', operation: 'add' });
assertEqual(hitTest(homeLayout, 188, 515)?.action.type, 'start');

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
);
assertDeepEqual(hitTest(questionLayout, 190, 376)?.action, { type: 'digit', digit: '2' });
assertEqual(hitTest(questionLayout, 190, 648)?.action.type, 'submit');

console.log('wechat canvas layout tests passed');
