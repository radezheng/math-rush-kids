var MathRushKidsWechat = (function(exports) {
  "use strict";var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  const DEFAULT_OPERATIONS = ["add", "subtract"];
  const DEFAULT_SETTINGS = {
    operations: DEFAULT_OPERATIONS,
    questionCount: 10,
    maxNumber: 20,
    difficulty: "normal"
  };
  const QUESTION_COUNT_MIN$1 = 5;
  const QUESTION_COUNT_MAX$1 = 30;
  const MAX_NUMBER_MIN$1 = 10;
  const MAX_NUMBER_MAX$1 = 100;
  const OPERATION_SYMBOL = {
    add: "+",
    subtract: "−",
    multiply: "×",
    divide: "÷"
  };
  const SUCCESS_MESSAGES = [
    "答对啦，太棒了！",
    "小脑袋转得真快！",
    "厉害，继续冲！",
    "你找到正确答案啦！",
    "耶，这题拿下！"
  ];
  const RETRY_MESSAGES = [
    "没关系，我们下一题再闪亮出击！",
    "差一点点，再练一题就更稳啦！",
    "这题记住了，继续向前冲！",
    "已经很认真啦，下一题会更顺手！"
  ];
  const STREAK_REWARDS = [
    {
      threshold: 8,
      messages: ["8 连对！你是口算闪电侠！", "8 连击达成，金色奖杯在发光！"]
    },
    {
      threshold: 5,
      messages: ["5 连对！奖励一枚小冠军徽章！", "5 连击！你已经进入超稳状态！"]
    },
    {
      threshold: 3,
      messages: ["3 连对！掌声送给你！", "3 连击启动，节奏很棒！"]
    }
  ];
  function normalizeSettings(input = {}, allowEmptyOperations = false) {
    const operations = sanitizeOperations(input.operations, allowEmptyOperations);
    const questionCount = clampInt(input.questionCount, DEFAULT_SETTINGS.questionCount, QUESTION_COUNT_MIN$1, QUESTION_COUNT_MAX$1);
    const maxNumber = clampInt(input.maxNumber, DEFAULT_SETTINGS.maxNumber, MAX_NUMBER_MIN$1, MAX_NUMBER_MAX$1);
    const difficulty = sanitizeDifficulty(input.difficulty);
    return {
      operations,
      questionCount,
      maxNumber,
      difficulty
    };
  }
  function generateQuestionSet(input = {}, random = Math.random) {
    const settings = normalizeSettings(input);
    const questions = Array.from({ length: settings.questionCount }, (_, index) => generateQuestion(index, settings, random));
    return { settings, questions };
  }
  function generateQuestion(index, settingsInput, random = Math.random) {
    const settings = normalizeSettings(settingsInput);
    const operation = sample(settings.operations, random);
    const max = settings.maxNumber;
    const symbol = OPERATION_SYMBOL[operation];
    if (operation === "add") {
      const left = pickOperand(max, settings.difficulty, random);
      const right = pickOperand(max, settings.difficulty, random);
      return createQuestion(index, operation, symbol, left, right, left + right);
    }
    if (operation === "subtract") {
      const left = pickOperand(max, settings.difficulty, random);
      const right = randomInt(0, left, random);
      return createQuestion(index, operation, symbol, left, right, left - right);
    }
    if (operation === "multiply") {
      const factorCap = settings.difficulty === "easy" ? Math.min(max, 5) : settings.difficulty === "normal" ? Math.min(max, 10) : Math.min(max, 12);
      const left = randomInt(1, Math.max(1, Math.min(max, factorCap + (settings.difficulty === "challenge" ? 4 : 0))), random);
      const right = randomInt(1, Math.max(1, factorCap), random);
      return createQuestion(index, operation, symbol, left, right, left * right);
    }
    const divisorCap = settings.difficulty === "easy" ? Math.min(max, 5) : settings.difficulty === "normal" ? Math.min(max, 10) : Math.min(max, 12);
    const divisor = randomInt(1, Math.max(1, divisorCap), random);
    const quotient = randomInt(1, Math.max(1, Math.floor(max / divisor)), random);
    const dividend = divisor * quotient;
    return createQuestion(index, operation, symbol, dividend, divisor, quotient);
  }
  function evaluateAnswer(question, input, currentStreak, random = Math.random) {
    const trimmed = input.trim();
    const userAnswer = trimmed === "" ? null : Number(trimmed);
    const isCorrect = userAnswer !== null && !Number.isNaN(userAnswer) && userAnswer === question.answer;
    const streakAfter = isCorrect ? currentStreak + 1 : 0;
    const streakReward = isCorrect ? getStreakReward(streakAfter, random) : null;
    const message = isCorrect ? sample(SUCCESS_MESSAGES, random) : sample(RETRY_MESSAGES, random);
    const detail = isCorrect ? `正确答案就是 ${question.answer}，继续保持！` : `这题答案是 ${question.answer}，记住它，下一题继续加油！`;
    return {
      userAnswer,
      isCorrect,
      message,
      detail,
      streakAfter,
      streakReward,
      correctAnswer: question.answer
    };
  }
  function summarizeResults(total, attempts) {
    const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
    const wrongCount = Math.max(0, total - correctCount);
    const accuracy = total === 0 ? 0 : correctCount / total;
    const bestStreak = attempts.reduce((best, attempt) => Math.max(best, attempt.streakAfter), 0);
    let stars = 1;
    let rankLabel = "继续闪亮";
    let rewardTitle = "勇气奖";
    let rewardMessage = "每一题都在帮你变强，马上再来一局吧！";
    let badge = "🌈";
    if (accuracy >= 1) {
      stars = 3;
      rankLabel = "口算王者";
      rewardTitle = "满分金杯";
      rewardMessage = "全部答对啦！今天的口算小宇宙超级耀眼！";
      badge = "🏆";
    } else if (accuracy >= 0.8 || accuracy >= 0.7 && bestStreak >= 5) {
      stars = 3;
      rankLabel = "数学闪电";
      rewardTitle = "闪电奖牌";
      rewardMessage = "又快又稳，离满分冠军只差一点点！";
      badge = "⚡";
    } else if (accuracy >= 0.6 || bestStreak >= 3) {
      stars = 2;
      rankLabel = "稳稳闯关";
      rewardTitle = "进步勋章";
      rewardMessage = "节奏很好，继续练习就会更厉害！";
      badge = "🎖️";
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
      coins
    };
  }
  function sanitizeOperations(operations, allowEmptyOperations = false) {
    const validOrder = ["add", "subtract", "multiply", "divide"];
    const unique = validOrder.filter((operation) => operations?.includes(operation));
    if (allowEmptyOperations && operations && unique.length === 0) {
      return [];
    }
    return unique.length > 0 ? unique : [...DEFAULT_OPERATIONS];
  }
  function sanitizeDifficulty(difficulty) {
    if (difficulty === "easy" || difficulty === "normal" || difficulty === "challenge") {
      return difficulty;
    }
    return DEFAULT_SETTINGS.difficulty;
  }
  function clampInt(value, fallback, min, max) {
    if (value === void 0 || Number.isNaN(value)) return fallback;
    const safeValue = value;
    return Math.min(max, Math.max(min, Math.round(safeValue)));
  }
  function pickOperand(max, difficulty, random, allowZero) {
    const floor = 0;
    if (difficulty === "easy") {
      return randomInt(floor, Math.max(floor, Math.ceil(max * 0.55)), random);
    }
    if (difficulty === "challenge") {
      return randomInt(Math.max(floor, Math.floor(max * 0.35)), max, random);
    }
    return randomInt(floor, max, random);
  }
  function randomInt(min, max, random) {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return Math.floor(random() * (high - low + 1)) + low;
  }
  function sample(items, random) {
    return items[Math.floor(random() * items.length)] ?? items[0];
  }
  function getStreakReward(streak, random) {
    const reward = STREAK_REWARDS.find((entry) => streak === entry.threshold || streak > entry.threshold && streak % entry.threshold === 0);
    return reward ? sample(reward.messages, random) : null;
  }
  function createQuestion(index, operation, symbol, left, right, answer) {
    return {
      id: `${index + 1}-${operation}-${left}-${right}-${answer}`,
      index,
      operation,
      symbol,
      left,
      right,
      answer,
      prompt: `${left} ${symbol} ${right} = ?`
    };
  }
  const STORAGE_BEST_STARS = "math-rush.bestStars";
  const STORAGE_BEST_ACCURACY = "math-rush.bestAccuracy";
  class GameRuntime {
    constructor(platform) {
      __publicField(this, "platform");
      __publicField(this, "settings");
      __publicField(this, "questions", []);
      __publicField(this, "attempts", []);
      __publicField(this, "currentIndex", 0);
      __publicField(this, "answerInput", "");
      __publicField(this, "feedback", null);
      __publicField(this, "streak", 0);
      __publicField(this, "bestStreak", 0);
      __publicField(this, "correctCount", 0);
      __publicField(this, "results", null);
      __publicField(this, "screen", "home");
      __publicField(this, "bestStars");
      __publicField(this, "bestAccuracy");
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      this.platform = platform;
      this.settings = normalizeSettings(DEFAULT_SETTINGS);
      this.bestStars = this.platform.storage.getNumber(STORAGE_BEST_STARS, 0);
      this.bestAccuracy = this.platform.storage.getNumber(STORAGE_BEST_ACCURACY, 0);
      this.platform.lifecycle.onResume(() => this.emit());
      this.platform.lifecycle.onPause(() => void 0);
    }
    subscribe(listener) {
      this.listeners.add(listener);
      listener(this.getState());
      return () => {
        this.listeners.delete(listener);
      };
    }
    getState() {
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
          bestStreak: this.bestStreak
        },
        results: this.results,
        attempts: [...this.attempts],
        bestStars: this.bestStars,
        bestAccuracy: this.bestAccuracy
      };
    }
    quickStart() {
      this.startGame({
        ...DEFAULT_SETTINGS,
        operations: this.settings.operations.length > 0 ? this.settings.operations : DEFAULT_SETTINGS.operations
      });
    }
    startGame(settingsInput = this.settings) {
      const generated = generateQuestionSet(settingsInput);
      this.settings = generated.settings;
      this.questions = generated.questions;
      this.attempts = [];
      this.currentIndex = 0;
      this.answerInput = "";
      this.feedback = null;
      this.streak = 0;
      this.bestStreak = 0;
      this.correctCount = 0;
      this.results = null;
      this.screen = "question";
      this.emit();
    }
    goHome() {
      this.questions = [];
      this.attempts = [];
      this.currentIndex = 0;
      this.answerInput = "";
      this.feedback = null;
      this.streak = 0;
      this.bestStreak = 0;
      this.correctCount = 0;
      this.results = null;
      this.screen = "home";
      this.emit();
    }
    updateSettings(patch) {
      this.settings = normalizeSettings({ ...this.settings, ...patch }, this.settings.operations.length === 0 && patch.operations === void 0);
      this.emit();
    }
    toggleOperation(operation) {
      const has = this.settings.operations.includes(operation);
      const operations = has ? this.settings.operations.filter((item) => item !== operation) : [...this.settings.operations, operation];
      this.settings = normalizeSettings({ ...this.settings, operations }, true);
      this.emit();
    }
    setDifficulty(difficulty) {
      this.updateSettings({ difficulty });
    }
    appendDigit(digit) {
      if (this.screen !== "question") return;
      if (!/^\d$/.test(digit)) return;
      this.answerInput = this.answerInput === "0" ? digit : `${this.answerInput}${digit}`.slice(0, 4);
      this.platform.audio.playTap();
      this.emit();
    }
    backspace() {
      if (this.screen !== "question") return;
      this.answerInput = this.answerInput.slice(0, -1);
      this.platform.audio.playTap();
      this.emit();
    }
    clearAnswer() {
      if (this.screen !== "question") return;
      this.answerInput = "";
      this.platform.audio.playTap();
      this.emit();
    }
    submitCurrentAnswer() {
      if (this.screen !== "question") return;
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
        streakAfter: feedback.streakAfter
      });
      this.screen = "feedback";
      this.emit();
    }
    nextStep() {
      if (this.screen !== "feedback") return;
      if (this.currentIndex >= this.questions.length - 1) {
        this.finishRun();
        return;
      }
      this.currentIndex += 1;
      this.answerInput = "";
      this.feedback = null;
      this.screen = "question";
      this.emit();
    }
    replayWithCurrentSettings() {
      this.startGame(this.settings);
    }
    finishRun() {
      this.results = summarizeResults(this.questions.length, this.attempts);
      this.bestStars = Math.max(this.bestStars, this.results.stars);
      this.bestAccuracy = Math.max(this.bestAccuracy, this.results.accuracy);
      this.platform.storage.setNumber(STORAGE_BEST_STARS, this.bestStars);
      this.platform.storage.setNumber(STORAGE_BEST_ACCURACY, this.bestAccuracy);
      this.screen = "result";
      this.feedback = null;
      this.answerInput = "";
      this.emit();
    }
    emit() {
      const snapshot = this.getState();
      for (const listener of this.listeners) {
        listener(snapshot);
      }
    }
  }
  const OPERATION_META = [
    { id: "add", label: "加法", icon: "+" },
    { id: "subtract", label: "减法", icon: "−" },
    { id: "multiply", label: "乘法", icon: "×" },
    { id: "divide", label: "除法", icon: "÷" }
  ];
  const DIFFICULTY_META = [
    { id: "easy", label: "轻松" },
    { id: "normal", label: "普通" },
    { id: "challenge", label: "挑战" }
  ];
  const KEYPAD_ITEMS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "清空", "0", "退格"];
  const QUESTION_COUNT_MIN = 5;
  const QUESTION_COUNT_MAX = 30;
  const MAX_NUMBER_MIN = 10;
  const MAX_NUMBER_MAX = 100;
  const SETTING_STEP = 5;
  function createWeChatLayout(state, width, height, options = {}) {
    const targets = [];
    const safeWidth = Math.max(300, width);
    const safeHeight = Math.max(480, height);
    const topInset = Math.max(0, Math.min(options.topInset ?? 0, Math.floor(safeHeight * 0.22)));
    const settingsExpanded = options.settingsExpanded ?? false;
    if (state.screen === "home") {
      addHomeTargets(targets, state, safeWidth, safeHeight, topInset, settingsExpanded);
    } else if (state.screen === "question") {
      addQuestionTargets(targets, state, safeWidth, safeHeight, topInset);
    } else if (state.screen === "feedback") {
      targets.push({ x: 28, y: safeHeight - 104, width: safeWidth - 56, height: 64, label: "下一步", action: { type: "next" } });
    } else if (state.screen === "result") {
      targets.push({ x: 28, y: safeHeight - 152, width: safeWidth - 56, height: 56, label: "再来一局", action: { type: "replay" } });
      targets.push({ x: 28, y: safeHeight - 84, width: safeWidth - 56, height: 52, label: "返回首页", action: { type: "home" } });
    }
    return { width: safeWidth, height: safeHeight, topInset, settingsExpanded, targets };
  }
  function hitTest(layout, x, y) {
    for (let index = layout.targets.length - 1; index >= 0; index -= 1) {
      const target = layout.targets[index];
      if (!target.disabled && x >= target.x && x <= target.x + target.width && y >= target.y && y <= target.y + target.height) {
        return target;
      }
    }
    return null;
  }
  function drawWeChatScreen(ctx, state, layout) {
    clear(ctx, layout.width, layout.height);
    drawBackground(ctx, layout.width, layout.height);
    drawHeader(ctx, state, layout);
    if (state.screen === "home") {
      drawHome(ctx, state, layout);
    } else if (state.screen === "question") {
      drawQuestion(ctx, state, layout);
    } else if (state.screen === "feedback") {
      drawFeedback(ctx, state, layout);
    } else if (state.screen === "result") {
      drawResult(ctx, state, layout);
    }
  }
  function addHomeTargets(targets, state, width, height, topInset, settingsExpanded) {
    const horizontalMargin = 28;
    const gap = 10;
    const contentWidth = width - horizontalMargin * 2;
    const heroY = topInset + 62;
    const settingsY = heroY + 70;
    const settingsHeight = settingsExpanded ? 196 : 60;
    targets.push({ x: horizontalMargin, y: settingsY, width: contentWidth, height: 60, label: "练习设置", action: { type: "toggle-settings" } });
    if (settingsExpanded) {
      const rowTop = settingsY + 68;
      addStepperTargets(targets, "题数", "adjust-question-count", state.settings.questionCount, QUESTION_COUNT_MIN, QUESTION_COUNT_MAX, horizontalMargin + 124, rowTop, contentWidth - 124);
      addStepperTargets(targets, "数字范围", "adjust-max-number", state.settings.maxNumber, MAX_NUMBER_MIN, MAX_NUMBER_MAX, horizontalMargin + 124, rowTop + 52, contentWidth - 124);
      const pillWidth = (contentWidth - gap * 2) / 3;
      DIFFICULTY_META.forEach((difficulty, index) => {
        targets.push({
          x: horizontalMargin + index * (pillWidth + gap),
          y: settingsY + 152,
          width: pillWidth,
          height: 38,
          label: difficulty.label,
          action: { type: "set-difficulty", difficulty: difficulty.id }
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
        action: { type: "toggle-operation", operation: operation.id }
      });
    });
    const startY = Math.min(height - 76, operationTop + 2 * 58 + 16);
    targets.push({ x: horizontalMargin, y: startY, width: contentWidth, height: 56, label: "快速开始", action: { type: "start" }, disabled: state.settings.operations.length === 0 });
  }
  function addStepperTargets(targets, label, actionType, value, min, max, x, y, width) {
    const buttonSize = 40;
    const plusAction = actionType === "adjust-question-count" ? { type: "adjust-question-count", delta: SETTING_STEP } : { type: "adjust-max-number", delta: SETTING_STEP };
    const minusAction = actionType === "adjust-question-count" ? { type: "adjust-question-count", delta: -SETTING_STEP } : { type: "adjust-max-number", delta: -SETTING_STEP };
    targets.push({ x, y, width: buttonSize, height: buttonSize, label: `${label} -`, action: minusAction, disabled: value <= min });
    targets.push({ x: x + width - buttonSize, y, width: buttonSize, height: buttonSize, label: `${label} +`, action: plusAction, disabled: value >= max });
  }
  function addQuestionTargets(targets, state, width, height, topInset) {
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
        action: item === "清空" ? { type: "clear" } : item === "退格" ? { type: "backspace" } : { type: "digit", digit: item }
      });
    });
    targets.push({ x: 28, y: keypadTop + 4 * (keyHeight + gap) + 6, width: width - 56, height: 56, label: "提交答案", action: { type: "submit" }, disabled: state.answerInput.length === 0 });
    targets.push({ x: 28, y: topInset + 12, width: 88, height: 36, label: "首页", action: { type: "home" } });
  }
  function clear(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
  }
  function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#fff7ad");
    gradient.addColorStop(0.45, "#ffe0f0");
    gradient.addColorStop(1, "#bde7ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    circle(ctx, width - 54, 80, 70);
    circle(ctx, 40, 150, 46);
  }
  function drawHeader(ctx, state, layout) {
    text(ctx, "口算冲冲冲", 28, layout.topInset + 34, 24, "#26304f", "bold");
    text(ctx, `最高 ${state.bestStars || 0} 星 · ${Math.round(state.bestAccuracy * 100)}%`, 28, layout.topInset + 62, 13, "#65708f");
  }
  function drawHome(ctx, state, layout) {
    const heroY = layout.topInset + 62;
    panel(ctx, 22, heroY, layout.width - 44, 60, "#ffffffcc");
    text(ctx, "选择运算，马上开始练习", 42, heroY + 24, 19, "#26304f", "bold");
    text(ctx, `${state.settings.questionCount} 题 · ${state.settings.maxNumber} 以内 · ${difficultyLabel(state.settings.difficulty)} · ${formatOperationsSummary(state.settings.operations)}`, 42, heroY + 47, 13, "#65708f");
    const settingsToggle = layout.targets.find((item) => item.action.type === "toggle-settings");
    if (settingsToggle) {
      const settingsHeight = layout.settingsExpanded ? 196 : 60;
      panel(ctx, settingsToggle.x - 4, settingsToggle.y - 4, settingsToggle.width + 8, settingsHeight + 8, "#ffffffd9");
      text(ctx, "练习设置", settingsToggle.x + 16, settingsToggle.y + 20, 15, "#26304f", "bold");
      text(ctx, formatSettingsSummary(state), settingsToggle.x + 16, settingsToggle.y + 43, 13, "#65708f");
      text(ctx, layout.settingsExpanded ? "收起" : "展开", settingsToggle.x + settingsToggle.width - 18, settingsToggle.y + 30, 14, "#5b7cfa", "bold", "right");
    }
    if (layout.settingsExpanded && settingsToggle) {
      text(ctx, "题数", settingsToggle.x + 16, settingsToggle.y + 88, 14, "#26304f", "bold");
      text(ctx, `${state.settings.questionCount} 题`, layout.width / 2, settingsToggle.y + 88, 16, "#26304f", "bold", "center");
      text(ctx, "数字范围", settingsToggle.x + 16, settingsToggle.y + 140, 14, "#26304f", "bold");
      text(ctx, `${state.settings.maxNumber} 以内`, layout.width / 2, settingsToggle.y + 140, 16, "#26304f", "bold", "center");
      text(ctx, "难度", settingsToggle.x + 16, settingsToggle.y + 174, 14, "#26304f", "bold");
      for (const target of layout.targets.filter((item) => item.action.type === "adjust-question-count" || item.action.type === "adjust-max-number")) {
        button(ctx, target, target.disabled ? "#e0e5f2" : "#ffffffee", target.disabled ? "#a8b0c8" : "#26304f");
        text(ctx, target.label.endsWith("+") ? "+" : "−", target.x + target.width / 2, target.y + 23, 22, target.disabled ? "#a8b0c8" : "#26304f", "bold", "center");
      }
      for (const target of layout.targets.filter((item) => item.action.type === "set-difficulty")) {
        const action = target.action;
        const active = action.type === "set-difficulty" && state.settings.difficulty === action.difficulty;
        button(ctx, target, active ? "#ff8a4c" : "#ffffffee", active ? "#ffffff" : "#26304f");
        text(ctx, target.label, target.x + target.width / 2, target.y + 24, 14, active ? "#ffffff" : "#26304f", "bold", "center");
      }
    }
    const firstOperation = layout.targets.find((item) => item.action.type === "toggle-operation");
    if (firstOperation) {
      text(ctx, "选择运算", 28, firstOperation.y - 14, 16, "#26304f", "bold");
    }
    for (const target of layout.targets.filter((item) => item.action.type === "toggle-operation")) {
      const action = target.action;
      const meta = action.type === "toggle-operation" ? OPERATION_META.find((item) => item.id === action.operation) : void 0;
      const active = action.type === "toggle-operation" && state.settings.operations.includes(action.operation);
      button(ctx, target, active ? "#5b7cfa" : "#ffffffd9", active ? "#ffffff" : "#26304f");
      text(ctx, `${meta?.icon ?? ""} ${target.label}`, target.x + target.width / 2, target.y + 30, 16, active ? "#ffffff" : "#26304f", "bold", "center");
    }
    const start = layout.targets.find((item) => item.action.type === "start");
    if (start) {
      button(ctx, start, start.disabled ? "#b8c0d8" : "#13b981", "#ffffff");
      text(ctx, start.disabled ? "至少选择一种运算" : "🚀 快速开始", start.x + start.width / 2, start.y + 34, 19, "#ffffff", "bold", "center");
    }
  }
  function drawQuestion(ctx, state, layout) {
    const question = state.question;
    if (!question) return;
    const home = layout.targets.find((item) => item.action.type === "home");
    if (home) {
      button(ctx, home, "#ffffffaa", "#65708f");
      text(ctx, "首页", home.x + home.width / 2, home.y + 24, 14, "#65708f", "bold", "center");
    }
    const contentY = Math.max(116, layout.topInset + 104);
    text(ctx, `第 ${state.questionNumber}/${state.progress.total} 题`, 28, contentY, 18, "#26304f", "bold");
    text(ctx, `答对 ${state.progress.correctCount} · 连对 ${state.progress.streak}`, layout.width - 28, contentY, 14, "#65708f", "normal", "right");
    panel(ctx, 28, contentY + 18, layout.width - 56, 132, "#ffffffd9");
    text(ctx, `${operationLabel(question.operation)}闯关`, layout.width / 2, contentY + 48, 15, "#65708f", "bold", "center");
    text(ctx, `${question.left} ${question.symbol} ${question.right}`, layout.width / 2, contentY + 98, 42, "#26304f", "bold", "center");
    text(ctx, state.answerInput || "？", layout.width / 2, contentY + 138, 28, state.answerInput ? "#13b981" : "#9aa3bd", "bold", "center");
    for (const target of layout.targets.filter((item) => item.action.type === "digit" || item.action.type === "clear" || item.action.type === "backspace" || item.action.type === "submit")) {
      const isSubmit = target.action.type === "submit";
      button(ctx, target, target.disabled ? "#b8c0d8" : isSubmit ? "#5b7cfa" : "#ffffffee", isSubmit ? "#ffffff" : "#26304f");
      text(ctx, target.label, target.x + target.width / 2, target.y + (isSubmit ? 35 : 30), isSubmit ? 18 : 20, isSubmit ? "#ffffff" : "#26304f", "bold", "center");
    }
  }
  function drawFeedback(ctx, state, layout) {
    const feedback = state.feedback;
    const question = state.question;
    if (!feedback || !question) return;
    const panelY = Math.max(124, layout.topInset + 90);
    panel(ctx, 26, panelY, layout.width - 52, 322, "#ffffffdd");
    text(ctx, feedback.isCorrect ? "🎉" : "💛", layout.width / 2, panelY + 58, 48, "#26304f", "bold", "center");
    text(ctx, feedback.message, layout.width / 2, panelY + 108, 22, "#26304f", "bold", "center");
    text(ctx, feedback.detail, layout.width / 2, panelY + 150, 16, "#65708f", "normal", "center");
    text(ctx, `${question.prompt} ${feedback.correctAnswer}`, layout.width / 2, panelY + 198, 24, feedback.isCorrect ? "#13b981" : "#ff8a4c", "bold", "center");
    text(ctx, `当前连对 ${feedback.streakAfter} · 已答对 ${state.progress.correctCount}/${state.progress.total}`, layout.width / 2, panelY + 250, 15, "#65708f", "normal", "center");
    if (feedback.streakReward) {
      text(ctx, feedback.streakReward, layout.width / 2, panelY + 290, 15, "#5b7cfa", "bold", "center");
    }
    const next = layout.targets.find((item) => item.action.type === "next");
    if (next) {
      button(ctx, next, "#13b981", "#ffffff");
      text(ctx, state.questionNumber >= state.progress.total ? "🏁 查看成绩" : "➡️ 下一题", next.x + next.width / 2, next.y + 39, 20, "#ffffff", "bold", "center");
    }
  }
  function drawResult(ctx, state, layout) {
    const result = state.results;
    if (!result) return;
    const panelY = Math.max(116, layout.topInset + 80);
    panel(ctx, 24, panelY, layout.width - 48, 326, "#ffffffdd");
    text(ctx, result.badge, layout.width / 2, panelY + 62, 52, "#26304f", "bold", "center");
    text(ctx, result.rewardTitle, layout.width / 2, panelY + 104, 18, "#ff8a4c", "bold", "center");
    text(ctx, result.rankLabel, layout.width / 2, panelY + 142, 28, "#26304f", "bold", "center");
    text(ctx, Array.from({ length: 3 }, (_, index) => index < result.stars ? "⭐" : "☆").join(" "), layout.width / 2, panelY + 184, 24, "#f4b400", "bold", "center");
    text(ctx, `答对 ${result.correctCount}/${result.total} · 正确率 ${result.accuracyText}`, layout.width / 2, panelY + 236, 17, "#65708f", "bold", "center");
    text(ctx, `最佳连对 ${result.bestStreak} · 金币 ${result.coins}`, layout.width / 2, panelY + 270, 17, "#65708f", "bold", "center");
    for (const target of layout.targets.filter((item) => item.action.type === "replay" || item.action.type === "home")) {
      const replay = target.action.type === "replay";
      button(ctx, target, replay ? "#5b7cfa" : "#ffffffd9", replay ? "#ffffff" : "#26304f");
      text(ctx, target.label, target.x + target.width / 2, target.y + 35, 18, replay ? "#ffffff" : "#26304f", "bold", "center");
    }
  }
  function button(ctx, rect, fill, stroke) {
    roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 16);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke === "#ffffff" ? "rgba(255,255,255,0.35)" : "rgba(38,48,79,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function panel(ctx, x, y, width, height, fill) {
    roundedRect(ctx, x, y, width, height, 24);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.78)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function roundedRect(ctx, x, y, width, height, radius) {
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
  function circle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  function text(ctx, value, x, y, size, color, weight = "normal", align = "left") {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(value, x, y);
  }
  function operationLabel(operation) {
    return OPERATION_META.find((item) => item.id === operation)?.label ?? "口算";
  }
  function difficultyLabel(difficulty) {
    return DIFFICULTY_META.find((item) => item.id === difficulty)?.label ?? "普通";
  }
  function formatOperationsSummary(operations) {
    if (operations.length === 0) return "未选运算";
    return operations.map((operation) => operationLabel(operation)).join(" / ");
  }
  function formatSettingsSummary(state) {
    return `${state.settings.questionCount} 题 / ${state.settings.maxNumber} 以内 / ${difficultyLabel(state.settings.difficulty)} / ${formatOperationsSummary(state.settings.operations)}`;
  }
  function getWx() {
    return typeof wx === "undefined" ? void 0 : wx;
  }
  class WeChatInputAdapter {
    constructor() {
      __publicField(this, "pressed", false);
      __publicField(this, "justPressed", false);
      __publicField(this, "justReleased", false);
    }
    setPressed(nextPressed) {
      if (nextPressed && !this.pressed) {
        this.justPressed = true;
      }
      if (!nextPressed && this.pressed) {
        this.justReleased = true;
      }
      this.pressed = nextPressed;
    }
    getSnapshot() {
      return {
        pressed: this.pressed,
        justPressed: this.justPressed,
        justReleased: this.justReleased
      };
    }
    endFrame() {
      this.justPressed = false;
      this.justReleased = false;
    }
  }
  class WeChatStorageAdapter {
    constructor(wxApi) {
      __publicField(this, "wxApi");
      this.wxApi = wxApi;
    }
    getNumber(key, fallback) {
      try {
        const raw = this.wxApi?.getStorageSync?.(key);
        const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    }
    setNumber(key, value) {
      try {
        this.wxApi?.setStorageSync?.(key, value);
      } catch {
      }
    }
  }
  class WeChatAudioAdapter {
    constructor(wxApi) {
      __publicField(this, "wxApi");
      this.wxApi = wxApi;
    }
    playTap() {
      try {
        this.wxApi?.vibrateShort?.({ type: "light" });
      } catch {
      }
    }
  }
  class WeChatLifecycleAdapter {
    constructor(wxApi) {
      __publicField(this, "wxApi");
      this.wxApi = wxApi;
    }
    onPause(callback) {
      this.wxApi?.onHide?.(callback);
    }
    onResume(callback) {
      this.wxApi?.onShow?.(callback);
    }
  }
  function createWeChatPlatform(wxApi = getWx()) {
    return {
      input: new WeChatInputAdapter(),
      storage: new WeChatStorageAdapter(wxApi),
      audio: new WeChatAudioAdapter(wxApi),
      lifecycle: new WeChatLifecycleAdapter(wxApi)
    };
  }
  class WeChatMiniGameShell {
    constructor(options = {}) {
      __publicField(this, "wxApi");
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      __publicField(this, "platform");
      __publicField(this, "runtime");
      __publicField(this, "layout", null);
      __publicField(this, "unsubscribe", null);
      __publicField(this, "settingsExpanded", false);
      this.wxApi = options.wxApi ?? getWx();
      this.canvas = this.createCanvas();
      const context = this.canvas.getContext("2d");
      if (!context) throw new Error("2D canvas context is unavailable in WeChat shell.");
      this.ctx = context;
      this.platform = createWeChatPlatform(this.wxApi);
      this.runtime = new GameRuntime(this.platform);
    }
    start() {
      this.unsubscribe?.();
      this.unsubscribe = this.runtime.subscribe((state) => {
        this.layout = createWeChatLayout(state, this.canvas.width, this.canvas.height, {
          topInset: this.canvas.topInset,
          settingsExpanded: this.settingsExpanded
        });
        drawWeChatScreen(this.ctx, state, this.layout);
      });
      this.bindTouchEvents();
    }
    dispose() {
      this.unsubscribe?.();
      this.unsubscribe = null;
    }
    createCanvas() {
      const canvas = this.wxApi?.createCanvas?.();
      if (!canvas) {
        throw new Error("wx.createCanvas is required for the WeChat Mini Game shell.");
      }
      const info = this.wxApi?.getSystemInfoSync?.() ?? {};
      const menuRect = this.readMenuButtonRect();
      const pixelRatio = info.pixelRatio && info.pixelRatio > 0 ? info.pixelRatio : 1;
      const logicalWidth = info.windowWidth ?? 375;
      const logicalHeight = info.windowHeight ?? 667;
      const topInset = computeTopInset(info, menuRect);
      canvas.width = Math.round(logicalWidth * pixelRatio);
      canvas.height = Math.round(logicalHeight * pixelRatio);
      const context = canvas.getContext("2d");
      context?.scale(pixelRatio, pixelRatio);
      return {
        width: logicalWidth,
        height: logicalHeight,
        topInset,
        getContext: () => context
      };
    }
    readMenuButtonRect() {
      try {
        return this.wxApi?.getMenuButtonBoundingClientRect?.() ?? null;
      } catch {
        return null;
      }
    }
    bindTouchEvents() {
      this.wxApi?.onTouchStart?.((event) => {
        this.platform.input.setPressed(true);
        this.handleTouch(event);
        this.platform.input.endFrame();
      });
      const release = () => {
        this.platform.input.setPressed(false);
        this.platform.input.endFrame();
      };
      this.wxApi?.onTouchEnd?.(release);
      this.wxApi?.onTouchCancel?.(release);
    }
    handleTouch(event) {
      const touch = event.changedTouches?.[0] ?? event.touches?.[0];
      if (!touch || !this.layout) return;
      const target = hitTest(this.layout, touch.clientX, touch.clientY);
      if (!target) return;
      this.applyAction(target.action);
    }
    applyAction(action) {
      if (action.type === "toggle-operation") {
        this.runtime.toggleOperation(action.operation);
      } else if (action.type === "toggle-settings") {
        this.settingsExpanded = !this.settingsExpanded;
        this.redraw();
      } else if (action.type === "adjust-question-count") {
        const current = this.runtime.getState().settings.questionCount;
        this.runtime.updateSettings({ questionCount: current + action.delta });
      } else if (action.type === "adjust-max-number") {
        const current = this.runtime.getState().settings.maxNumber;
        this.runtime.updateSettings({ maxNumber: current + action.delta });
      } else if (action.type === "set-difficulty") {
        this.runtime.setDifficulty(action.difficulty);
      } else if (action.type === "start") {
        this.runtime.startGame(this.runtime.getState().settings);
      } else if (action.type === "digit") {
        this.runtime.appendDigit(action.digit);
      } else if (action.type === "clear") {
        this.runtime.clearAnswer();
      } else if (action.type === "backspace") {
        this.runtime.backspace();
      } else if (action.type === "submit") {
        this.runtime.submitCurrentAnswer();
      } else if (action.type === "next") {
        this.runtime.nextStep();
      } else if (action.type === "replay") {
        this.runtime.replayWithCurrentSettings();
      } else if (action.type === "home") {
        this.runtime.goHome();
      }
    }
    redraw() {
      const state = this.runtime.getState();
      this.layout = createWeChatLayout(state, this.canvas.width, this.canvas.height, {
        topInset: this.canvas.topInset,
        settingsExpanded: this.settingsExpanded
      });
      drawWeChatScreen(this.ctx, state, this.layout);
    }
  }
  function computeTopInset(info = {}, menuRect = null) {
    if (menuRect && menuRect.bottom > 0) {
      const menuGap = Math.max(4, menuRect.top - (info.statusBarHeight ?? info.safeArea?.top ?? 0));
      return Math.ceil(menuRect.bottom + menuGap + 8);
    }
    if (info.safeArea?.top !== void 0 && info.safeArea.top > 0) {
      return Math.ceil(info.safeArea.top + 24);
    }
    if (info.statusBarHeight !== void 0 && info.statusBarHeight > 0) {
      return Math.ceil(info.statusBarHeight + 24);
    }
    return 24;
  }
  function startWeChatMiniGame(options = {}) {
    const shell = new WeChatMiniGameShell(options);
    shell.start();
    return shell;
  }
  startWeChatMiniGame();
  exports.WeChatMiniGameShell = WeChatMiniGameShell;
  exports.computeTopInset = computeTopInset;
  exports.startWeChatMiniGame = startWeChatMiniGame;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
})({});
