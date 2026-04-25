export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';
export type Difficulty = 'easy' | 'normal' | 'challenge';

export interface GameSettings {
  operations: Operation[];
  questionCount: number;
  maxNumber: number;
  difficulty: Difficulty;
}

export interface MathQuestion {
  id: string;
  index: number;
  operation: Operation;
  symbol: string;
  left: number;
  right: number;
  answer: number;
  prompt: string;
}

export interface AnswerFeedback {
  userAnswer: number | null;
  isCorrect: boolean;
  message: string;
  detail: string;
  streakAfter: number;
  streakReward: string | null;
  correctAnswer: number;
}

export interface AttemptRecord {
  questionId: string;
  userAnswer: number | null;
  isCorrect: boolean;
  streakAfter: number;
}

export interface ResultSummary {
  total: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  accuracyText: string;
  bestStreak: number;
  stars: number;
  rankLabel: string;
  rewardTitle: string;
  rewardMessage: string;
  badge: string;
  coins: number;
}

export const DEFAULT_OPERATIONS: Operation[] = ['add', 'subtract'];
export const DEFAULT_SETTINGS: GameSettings = {
  operations: DEFAULT_OPERATIONS,
  questionCount: 10,
  maxNumber: 20,
  difficulty: 'normal',
};

const QUESTION_COUNT_MIN = 5;
const QUESTION_COUNT_MAX = 30;
const MAX_NUMBER_MIN = 10;
const MAX_NUMBER_MAX = 100;

const OPERATION_SYMBOL: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
};

const SUCCESS_MESSAGES = [
  '答对啦，太棒了！',
  '小脑袋转得真快！',
  '厉害，继续冲！',
  '你找到正确答案啦！',
  '耶，这题拿下！',
];

const RETRY_MESSAGES = [
  '没关系，我们下一题再闪亮出击！',
  '差一点点，再练一题就更稳啦！',
  '这题记住了，继续向前冲！',
  '已经很认真啦，下一题会更顺手！',
];

const STREAK_REWARDS: Array<{ threshold: number; messages: string[] }> = [
  {
    threshold: 8,
    messages: ['8 连对！你是口算闪电侠！', '8 连击达成，金色奖杯在发光！'],
  },
  {
    threshold: 5,
    messages: ['5 连对！奖励一枚小冠军徽章！', '5 连击！你已经进入超稳状态！'],
  },
  {
    threshold: 3,
    messages: ['3 连对！掌声送给你！', '3 连击启动，节奏很棒！'],
  },
];

export function normalizeSettings(input: Partial<GameSettings> = {}, allowEmptyOperations = false): GameSettings {
  const operations = sanitizeOperations(input.operations, allowEmptyOperations);
  const questionCount = clampInt(input.questionCount, DEFAULT_SETTINGS.questionCount, QUESTION_COUNT_MIN, QUESTION_COUNT_MAX);
  const maxNumber = clampInt(input.maxNumber, DEFAULT_SETTINGS.maxNumber, MAX_NUMBER_MIN, MAX_NUMBER_MAX);
  const difficulty = sanitizeDifficulty(input.difficulty);

  return {
    operations,
    questionCount,
    maxNumber,
    difficulty,
  };
}

export function generateQuestionSet(input: Partial<GameSettings> = {}, random: () => number = Math.random): {
  settings: GameSettings;
  questions: MathQuestion[];
} {
  const settings = normalizeSettings(input);
  const questions = Array.from({ length: settings.questionCount }, (_, index) => generateQuestion(index, settings, random));
  return { settings, questions };
}

export function generateQuestion(index: number, settingsInput: Partial<GameSettings> | GameSettings, random: () => number = Math.random): MathQuestion {
  const settings = normalizeSettings(settingsInput);
  const operation = sample(settings.operations, random);
  const max = settings.maxNumber;
  const symbol = OPERATION_SYMBOL[operation];

  if (operation === 'add') {
    const left = pickOperand(max, settings.difficulty, random, true);
    const right = pickOperand(max, settings.difficulty, random, true);
    return createQuestion(index, operation, symbol, left, right, left + right);
  }

  if (operation === 'subtract') {
    const left = pickOperand(max, settings.difficulty, random, true);
    const right = randomInt(0, left, random);
    return createQuestion(index, operation, symbol, left, right, left - right);
  }

  if (operation === 'multiply') {
    const factorCap = settings.difficulty === 'easy' ? Math.min(max, 5) : settings.difficulty === 'normal' ? Math.min(max, 10) : Math.min(max, 12);
    const left = randomInt(1, Math.max(1, Math.min(max, factorCap + (settings.difficulty === 'challenge' ? 4 : 0))), random);
    const right = randomInt(1, Math.max(1, factorCap), random);
    return createQuestion(index, operation, symbol, left, right, left * right);
  }

  const divisorCap = settings.difficulty === 'easy' ? Math.min(max, 5) : settings.difficulty === 'normal' ? Math.min(max, 10) : Math.min(max, 12);
  const divisor = randomInt(1, Math.max(1, divisorCap), random);
  const quotient = randomInt(1, Math.max(1, Math.floor(max / divisor)), random);
  const dividend = divisor * quotient;
  return createQuestion(index, operation, symbol, dividend, divisor, quotient);
}

export function evaluateAnswer(question: MathQuestion, input: string, currentStreak: number, random: () => number = Math.random): AnswerFeedback {
  const trimmed = input.trim();
  const userAnswer = trimmed === '' ? null : Number(trimmed);
  const isCorrect = userAnswer !== null && !Number.isNaN(userAnswer) && userAnswer === question.answer;
  const streakAfter = isCorrect ? currentStreak + 1 : 0;
  const streakReward = isCorrect ? getStreakReward(streakAfter, random) : null;
  const message = isCorrect ? sample(SUCCESS_MESSAGES, random) : sample(RETRY_MESSAGES, random);
  const detail = isCorrect
    ? `正确答案就是 ${question.answer}，继续保持！`
    : `这题答案是 ${question.answer}，记住它，下一题继续加油！`;

  return {
    userAnswer,
    isCorrect,
    message,
    detail,
    streakAfter,
    streakReward,
    correctAnswer: question.answer,
  };
}

export function summarizeResults(total: number, attempts: AttemptRecord[]): ResultSummary {
  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const wrongCount = Math.max(0, total - correctCount);
  const accuracy = total === 0 ? 0 : correctCount / total;
  const bestStreak = attempts.reduce((best, attempt) => Math.max(best, attempt.streakAfter), 0);

  let stars = 1;
  let rankLabel = '继续闪亮';
  let rewardTitle = '勇气奖';
  let rewardMessage = '每一题都在帮你变强，马上再来一局吧！';
  let badge = '🌈';

  if (accuracy >= 1) {
    stars = 3;
    rankLabel = '口算王者';
    rewardTitle = '满分金杯';
    rewardMessage = '全部答对啦！今天的口算小宇宙超级耀眼！';
    badge = '🏆';
  } else if (accuracy >= 0.8 || (accuracy >= 0.7 && bestStreak >= 5)) {
    stars = 3;
    rankLabel = '数学闪电';
    rewardTitle = '闪电奖牌';
    rewardMessage = '又快又稳，离满分冠军只差一点点！';
    badge = '⚡';
  } else if (accuracy >= 0.6 || bestStreak >= 3) {
    stars = 2;
    rankLabel = '稳稳闯关';
    rewardTitle = '进步勋章';
    rewardMessage = '节奏很好，继续练习就会更厉害！';
    badge = '🎖️';
  }

  const accuracyText = `${Math.round(accuracy * 100)}%`;
  const coins = correctCount * 12 + bestStreak * 5;

  return {
    total,
    correctCount,
    wrongCount,
    accuracy,
    accuracyText,
    bestStreak,
    stars,
    rankLabel,
    rewardTitle,
    rewardMessage,
    badge,
    coins,
  };
}

function sanitizeOperations(operations?: Operation[], allowEmptyOperations = false): Operation[] {
  const validOrder: Operation[] = ['add', 'subtract', 'multiply', 'divide'];
  const unique = validOrder.filter((operation) => operations?.includes(operation));
  if (allowEmptyOperations && operations && unique.length === 0) {
    return [];
  }
  return unique.length > 0 ? unique : [...DEFAULT_OPERATIONS];
}

function sanitizeDifficulty(difficulty?: Difficulty): Difficulty {
  if (difficulty === 'easy' || difficulty === 'normal' || difficulty === 'challenge') {
    return difficulty;
  }
  return DEFAULT_SETTINGS.difficulty;
}

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || Number.isNaN(value)) return fallback;
  const safeValue = value;
  return Math.min(max, Math.max(min, Math.round(safeValue)));
}

function pickOperand(max: number, difficulty: Difficulty, random: () => number, allowZero: boolean): number {
  const floor = allowZero ? 0 : 1;
  if (difficulty === 'easy') {
    return randomInt(floor, Math.max(floor, Math.ceil(max * 0.55)), random);
  }
  if (difficulty === 'challenge') {
    return randomInt(Math.max(floor, Math.floor(max * 0.35)), max, random);
  }
  return randomInt(floor, max, random);
}

function randomInt(min: number, max: number, random: () => number): number {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return Math.floor(random() * (high - low + 1)) + low;
}

function sample<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function getStreakReward(streak: number, random: () => number): string | null {
  const reward = STREAK_REWARDS.find((entry) => streak === entry.threshold || (streak > entry.threshold && streak % entry.threshold === 0));
  return reward ? sample(reward.messages, random) : null;
}

function createQuestion(index: number, operation: Operation, symbol: string, left: number, right: number, answer: number): MathQuestion {
  return {
    id: `${index + 1}-${operation}-${left}-${right}-${answer}`,
    index,
    operation,
    symbol,
    left,
    right,
    answer,
    prompt: `${left} ${symbol} ${right} = ?`,
  };
}
