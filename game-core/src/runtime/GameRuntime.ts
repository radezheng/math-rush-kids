import {
  DEFAULT_SETTINGS,
  evaluateAnswer,
  generateQuestionSet,
  normalizeSettings,
  summarizeResults,
  type AnswerFeedback,
  type AttemptRecord,
  type Difficulty,
  type GameSettings,
  type MathQuestion,
  type Operation,
  type ResultSummary,
} from '@game-core/gameplay/mathRush';
import type { PlatformAPI } from '@game-core/platform/types';

const STORAGE_BEST_STARS = 'math-rush.bestStars';
const STORAGE_BEST_ACCURACY = 'math-rush.bestAccuracy';

export type Screen = 'home' | 'question' | 'feedback' | 'result';

export interface ProgressState {
  current: number;
  total: number;
  correctCount: number;
  streak: number;
  bestStreak: number;
}

export interface SessionState {
  screen: Screen;
  settings: GameSettings;
  question: MathQuestion | null;
  questionNumber: number;
  answerInput: string;
  feedback: AnswerFeedback | null;
  progress: ProgressState;
  results: ResultSummary | null;
  attempts: AttemptRecord[];
  bestStars: number;
  bestAccuracy: number;
}

export class GameRuntime {
  private readonly platform: PlatformAPI;
  private settings: GameSettings;
  private questions: MathQuestion[] = [];
  private attempts: AttemptRecord[] = [];
  private currentIndex = 0;
  private answerInput = '';
  private feedback: AnswerFeedback | null = null;
  private streak = 0;
  private bestStreak = 0;
  private correctCount = 0;
  private results: ResultSummary | null = null;
  private screen: Screen = 'home';
  private bestStars: number;
  private bestAccuracy: number;
  private listeners = new Set<(state: SessionState) => void>();

  constructor(platform: PlatformAPI) {
    this.platform = platform;
    this.settings = normalizeSettings(DEFAULT_SETTINGS);
    this.bestStars = this.platform.storage.getNumber(STORAGE_BEST_STARS, 0);
    this.bestAccuracy = this.platform.storage.getNumber(STORAGE_BEST_ACCURACY, 0);
    this.platform.lifecycle.onResume(() => this.emit());
    this.platform.lifecycle.onPause(() => undefined);
  }

  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SessionState {
    return {
      screen: this.screen,
      settings: { ...this.settings, operations: [...this.settings.operations] },
      question: this.questions[this.currentIndex] ?? null,
      questionNumber: this.questions.length === 0 ? 0 : this.currentIndex + 1,
      answerInput: this.answerInput,
      feedback: this.feedback,
      progress: {
        current: this.questions.length === 0 ? 0 : this.currentIndex + 1,
        total: this.questions.length,
        correctCount: this.correctCount,
        streak: this.streak,
        bestStreak: this.bestStreak,
      },
      results: this.results,
      attempts: [...this.attempts],
      bestStars: this.bestStars,
      bestAccuracy: this.bestAccuracy,
    };
  }

  quickStart(): void {
    this.startGame({
      ...DEFAULT_SETTINGS,
      operations: this.settings.operations.length > 0 ? this.settings.operations : DEFAULT_SETTINGS.operations,
    });
  }

  startGame(settingsInput: Partial<GameSettings> = this.settings): void {
    const generated = generateQuestionSet(settingsInput);
    this.settings = generated.settings;
    this.questions = generated.questions;
    this.attempts = [];
    this.currentIndex = 0;
    this.answerInput = '';
    this.feedback = null;
    this.streak = 0;
    this.bestStreak = 0;
    this.correctCount = 0;
    this.results = null;
    this.screen = 'question';
    this.emit();
  }

  goHome(): void {
    this.questions = [];
    this.attempts = [];
    this.currentIndex = 0;
    this.answerInput = '';
    this.feedback = null;
    this.streak = 0;
    this.bestStreak = 0;
    this.correctCount = 0;
    this.results = null;
    this.screen = 'home';
    this.emit();
  }

  updateSettings(patch: Partial<GameSettings>): void {
    this.settings = normalizeSettings({ ...this.settings, ...patch }, this.settings.operations.length === 0 && patch.operations === undefined);
    this.emit();
  }

  toggleOperation(operation: Operation): void {
    const has = this.settings.operations.includes(operation);
    const operations = has
      ? this.settings.operations.filter((item) => item !== operation)
      : [...this.settings.operations, operation];
    this.settings = normalizeSettings({ ...this.settings, operations }, true);
    this.emit();
  }

  setDifficulty(difficulty: Difficulty): void {
    this.updateSettings({ difficulty });
  }

  appendDigit(digit: string): void {
    if (this.screen !== 'question') return;
    if (!/^\d$/.test(digit)) return;
    this.answerInput = this.answerInput === '0' ? digit : `${this.answerInput}${digit}`.slice(0, 4);
    this.platform.audio.playTap();
    this.emit();
  }

  backspace(): void {
    if (this.screen !== 'question') return;
    this.answerInput = this.answerInput.slice(0, -1);
    this.platform.audio.playTap();
    this.emit();
  }

  clearAnswer(): void {
    if (this.screen !== 'question') return;
    this.answerInput = '';
    this.platform.audio.playTap();
    this.emit();
  }

  submitCurrentAnswer(): void {
    if (this.screen !== 'question') return;
    const question = this.questions[this.currentIndex];
    if (!question) return;

    const feedback = evaluateAnswer(question, this.answerInput, this.streak);
    this.feedback = feedback;
    this.streak = feedback.streakAfter;
    this.bestStreak = Math.max(this.bestStreak, this.streak);

    if (feedback.isCorrect) {
      this.correctCount += 1;
    }

    this.attempts.push({
      questionId: question.id,
      userAnswer: feedback.userAnswer,
      isCorrect: feedback.isCorrect,
      streakAfter: feedback.streakAfter,
    });

    this.screen = 'feedback';
    this.emit();
  }

  nextStep(): void {
    if (this.screen !== 'feedback') return;

    if (this.currentIndex >= this.questions.length - 1) {
      this.finishRun();
      return;
    }

    this.currentIndex += 1;
    this.answerInput = '';
    this.feedback = null;
    this.screen = 'question';
    this.emit();
  }

  replayWithCurrentSettings(): void {
    this.startGame(this.settings);
  }

  private finishRun(): void {
    this.results = summarizeResults(this.questions.length, this.attempts);
    this.bestStars = Math.max(this.bestStars, this.results.stars);
    this.bestAccuracy = Math.max(this.bestAccuracy, this.results.accuracy);
    this.platform.storage.setNumber(STORAGE_BEST_STARS, this.bestStars);
    this.platform.storage.setNumber(STORAGE_BEST_ACCURACY, this.bestAccuracy);
    this.screen = 'result';
    this.feedback = null;
    this.answerInput = '';
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
