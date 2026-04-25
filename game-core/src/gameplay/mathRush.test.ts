import {
  DEFAULT_OPERATIONS,
  DEFAULT_SETTINGS,
  evaluateAnswer,
  generateQuestion,
  generateQuestionSet,
  normalizeSettings,
  summarizeResults,
  type AttemptRecord,
} from './mathRush.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function runTest(name: string, test: () => void): void {
  try {
    test();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

runTest('normalizeSettings falls back to add + subtract when operations empty by default', () => {
  const settings = normalizeSettings({ operations: [] });
  assert(JSON.stringify(settings.operations) === JSON.stringify(DEFAULT_OPERATIONS), 'expected fallback operations');
  assert(settings.questionCount === DEFAULT_SETTINGS.questionCount, 'expected default question count');
});

runTest('normalizeSettings can preserve empty operations for home selection UI', () => {
  const settings = normalizeSettings({ operations: [] }, true);
  assert(settings.operations.length === 0, 'expected empty operations to remain empty');
});

runTest('subtraction questions never go below zero', () => {
  for (let index = 0; index < 60; index += 1) {
    const question = generateQuestion(index, { operations: ['subtract'], maxNumber: 20, questionCount: 10, difficulty: 'normal' }, sequenceRandom([0.87, 0.41, 0.09]));
    assert(question.left >= question.right, 'expected subtraction left >= right');
    assert(question.answer >= 0, 'expected subtraction answer >= 0');
  }
});

runTest('division questions are always exact', () => {
  for (let index = 0; index < 60; index += 1) {
    const question = generateQuestion(index, { operations: ['divide'], maxNumber: 30, questionCount: 10, difficulty: 'challenge' }, sequenceRandom([0.72, 0.33, 0.66]));
    assert(question.left % question.right === 0, 'expected exact division');
    assert(question.answer === question.left / question.right, 'expected exact quotient');
  }
});

runTest('question set respects requested length and chosen operations', () => {
  const generated = generateQuestionSet({ operations: ['multiply', 'divide'], questionCount: 15, maxNumber: 40, difficulty: 'easy' }, sequenceRandom([0.9, 0.2, 0.7, 0.4, 0.1, 0.6]));
  assert(generated.questions.length === 15, 'expected 15 questions');
  generated.questions.forEach((question) => {
    assert(question.operation === 'multiply' || question.operation === 'divide', 'unexpected operation generated');
  });
});

runTest('evaluateAnswer awards streak bonuses and supports blank answers', () => {
  const question = generateQuestion(0, { operations: ['add'], questionCount: 10, maxNumber: 20, difficulty: 'normal' }, sequenceRandom([0.1, 0.4, 0.2]));
  const correct = evaluateAnswer(question, String(question.answer), 2, sequenceRandom([0]));
  assert(correct.isCorrect, 'expected correct answer');
  assert(correct.streakAfter === 3, 'expected streak to increase');
  assert(Boolean(correct.streakReward), 'expected streak reward at 3 streak');

  const blank = evaluateAnswer(question, '', 5, sequenceRandom([0]));
  assert(blank.userAnswer === null, 'expected blank answer to be null');
  assert(blank.streakAfter === 0, 'expected streak reset');
});

runTest('summarizeResults returns celebratory rewards', () => {
  const attempts: AttemptRecord[] = [
    { questionId: '1', userAnswer: 3, isCorrect: true, streakAfter: 1 },
    { questionId: '2', userAnswer: 4, isCorrect: true, streakAfter: 2 },
    { questionId: '3', userAnswer: 8, isCorrect: true, streakAfter: 3 },
    { questionId: '4', userAnswer: 9, isCorrect: true, streakAfter: 4 },
    { questionId: '5', userAnswer: 10, isCorrect: true, streakAfter: 5 },
  ];
  const result = summarizeResults(5, attempts);
  assert(result.stars === 3, 'expected three stars for perfect run');
  assert(result.rankLabel.length > 0, 'expected rank label');
  assert(result.coins > 0, 'expected coins reward');
});
