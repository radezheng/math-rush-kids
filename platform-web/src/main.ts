import { GameRuntime, type SessionState } from '@game-core/runtime/GameRuntime';
import type {
  AudioAdapter,
  InputAdapter,
  InputSnapshot,
  LifecycleAdapter,
  PlatformAPI,
  StorageAdapter,
} from '@game-core/platform/types';
import type { Difficulty, Operation } from '@game-core/gameplay/mathRush';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('#app not found');
const app: HTMLDivElement = appRoot;

class NoopInputAdapter implements InputAdapter {
  getSnapshot(): InputSnapshot {
    return {
      pressed: false,
      justPressed: false,
      justReleased: false,
    };
  }

  endFrame(): void {
    // UI uses DOM events directly in this MVP.
  }
}

class WebStorageAdapter implements StorageAdapter {
  getNumber(key: string, fallback: number): number {
    const raw = window.localStorage.getItem(key);
    const parsed = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  setNumber(key: string, value: number): void {
    window.localStorage.setItem(key, String(value));
  }
}

class WebAudioAdapter implements AudioAdapter {
  private audioContext: AudioContext | null = null;

  playTap(): void {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;

    if (!this.audioContext) {
      this.audioContext = new Context();
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
}

class WebLifecycleAdapter implements LifecycleAdapter {
  onPause(callback: () => void): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') callback();
    });
  }

  onResume(callback: () => void): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') callback();
    });
  }
}

const platform: PlatformAPI = {
  input: new NoopInputAdapter(),
  storage: new WebStorageAdapter(),
  audio: new WebAudioAdapter(),
  lifecycle: new WebLifecycleAdapter(),
};

const runtime = new GameRuntime(platform);

window.addEventListener('keydown', (event) => {
  if (/^\d$/.test(event.key)) {
    runtime.appendDigit(event.key);
    return;
  }

  if (event.key === 'Backspace') {
    runtime.backspace();
  } else if (event.key === 'Enter') {
    runtime.submitCurrentAnswer();
  } else if (event.key === 'Escape') {
    runtime.clearAnswer();
  }
});

const OPERATION_META: Array<{ id: Operation; label: string; icon: string; hint: string }> = [
  { id: 'add', label: '加法', icon: '+', hint: '从加法热热身' },
  { id: 'subtract', label: '减法', icon: '−', hint: '把减法练熟' },
  { id: 'multiply', label: '乘法', icon: '×', hint: '来背背乘法口诀' },
  { id: 'divide', label: '除法', icon: '÷', hint: '学会平均分一分' },
];

const DIFFICULTY_META: Array<{ id: Difficulty; label: string; hint: string }> = [
  { id: 'easy', label: '轻松', hint: '先热热身' },
  { id: 'normal', label: '普通', hint: '节奏刚刚好' },
  { id: 'challenge', label: '挑战', hint: '来点更强考验' },
];

let isSettingsExpanded = false;

function getDifficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_META.find((item) => item.id === difficulty)?.label ?? '普通';
}

function formatOperationsSummary(operations: Operation[]): string {
  if (operations.length === 0) return '加减';
  const labels = operations.map((operation) => OPERATION_META.find((item) => item.id === operation)?.label ?? operation);
  return labels.length <= 2 ? labels.join(' + ') : `${labels.slice(0, 2).join(' + ')}等${labels.length}种`;
}

function formatQuickStartSummary(state: SessionState): string {
  return `${state.settings.questionCount} 道 · ${state.settings.maxNumber} 以内 · ${getDifficultyLabel(state.settings.difficulty)} · ${formatOperationsSummary(state.settings.operations)}`;
}

function formatSettingsSummary(state: SessionState): string {
  return `${state.settings.questionCount} 题 / ${state.settings.maxNumber} 以内 / ${getDifficultyLabel(state.settings.difficulty)} / ${formatOperationsSummary(state.settings.operations)}`;
}

runtime.subscribe(render);

function render(state: SessionState): void {
  app.innerHTML = '';

  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.innerHTML = `
    <div class="top-glow top-glow-left"></div>
    <div class="top-glow top-glow-right"></div>
  `;

  if (state.screen === 'home') {
    shell.appendChild(renderHome(state));
  } else if (state.screen === 'question') {
    shell.appendChild(renderQuestion(state));
  } else if (state.screen === 'feedback') {
    shell.appendChild(renderFeedback(state));
  } else if (state.screen === 'result') {
    shell.appendChild(renderResult(state));
  }

  const footer = document.createElement('footer');
  footer.className = 'footer-note';
  footer.textContent = '准备好了就开始，看看这次能得几颗星。';
  shell.appendChild(footer);

  app.appendChild(shell);
}

function renderHome(state: SessionState): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'panel home-panel';

  const selectedOps = state.settings.operations;
  const quickStartSummary = formatQuickStartSummary(state);
  const bestStars = '⭐'.repeat(Math.max(1, state.bestStars || 1));
  const bestAccuracy = `${Math.round(state.bestAccuracy * 100)}%`;
  panel.innerHTML = `
    <div class="panel-banner compact-home-banner">
      <div class="home-hero-copy">
        <div class="home-hero-topline">
          <div class="eyebrow">数学闯关小游戏</div>
          <div class="banner-badge">随时开练</div>
        </div>
        <div class="home-title-row">
          <div>
            <h1>口算冲冲冲</h1>
            <p>选好要练的内容，马上开始。</p>
          </div>
          <div class="mascot-card compact-mascot-card">
            <div class="mascot">🦊</div>
            <div>马上出发</div>
          </div>
        </div>
        <div class="hero-stats compact-stats">
          <div class="hero-stat compact-stat">
            <span class="stat-label">最高星级</span>
            <strong>${bestStars}</strong>
          </div>
          <div class="hero-stat compact-stat">
            <span class="stat-label">最高正确率</span>
            <strong>${bestAccuracy}</strong>
          </div>
        </div>
      </div>
    </div>
    <div class="section-title">选择运算</div>
    <div class="section-subtitle">可以多选玩法；如果还没选，就先从加法和减法开始。</div>
  `;

  const opGrid = document.createElement('div');
  opGrid.className = 'op-grid';
  for (const operation of OPERATION_META) {
    const button = document.createElement('button');
    button.className = `op-card ${selectedOps.includes(operation.id) ? 'is-active' : ''}`;
    button.type = 'button';
    button.innerHTML = `
      <span class="op-icon">${operation.icon}</span>
      <strong>${operation.label}</strong>
      <span>${operation.hint}</span>
    `;
    button.addEventListener('click', () => runtime.toggleOperation(operation.id));
    opGrid.appendChild(button);
  }
  panel.appendChild(opGrid);

  const actionRow = document.createElement('div');
  actionRow.className = 'primary-actions';
  actionRow.innerHTML = `
    <button class="start-btn" type="button">
      🚀 快速开始
      <small>${quickStartSummary}</small>
    </button>
  `;
  actionRow.querySelector<HTMLButtonElement>('.start-btn')?.addEventListener('click', () => runtime.startGame(state.settings));
  panel.appendChild(actionRow);

  const settingsCard = document.createElement('div');
  settingsCard.className = `settings-card ${isSettingsExpanded ? 'is-expanded' : 'is-collapsed'}`;
  settingsCard.innerHTML = `
    <button class="settings-toggle" type="button" aria-expanded="${isSettingsExpanded ? 'true' : 'false'}">
      <span>
        <span class="section-title settings-title">练习设置</span>
        <strong>${formatSettingsSummary(state)}</strong>
      </span>
      <span class="settings-toggle-icon">${isSettingsExpanded ? '收起' : '展开'}</span>
    </button>
    <div class="settings-body">
      <div class="setting-grid">
        <label class="setting-item">
          <span>题数</span>
          <input class="slider" type="range" min="5" max="30" step="5" value="${state.settings.questionCount}" />
          <strong>${state.settings.questionCount} 题</strong>
        </label>
        <label class="setting-item">
          <span>数字范围</span>
          <input class="slider max-slider" type="range" min="10" max="100" step="5" value="${state.settings.maxNumber}" />
          <strong>${state.settings.maxNumber} 以内</strong>
        </label>
      </div>
      <div class="section-title">难度</div>
    </div>
  `;

  settingsCard.querySelector<HTMLButtonElement>('.settings-toggle')?.addEventListener('click', () => {
    isSettingsExpanded = !isSettingsExpanded;
    render(runtime.getState());
  });

  const sliders = settingsCard.querySelectorAll<HTMLInputElement>('.settings-body input.slider');
  sliders[0]?.addEventListener('input', (event) => {
    runtime.updateSettings({ questionCount: Number((event.target as HTMLInputElement).value) });
  });
  sliders[1]?.addEventListener('input', (event) => {
    runtime.updateSettings({ maxNumber: Number((event.target as HTMLInputElement).value) });
  });

  const difficultyRow = document.createElement('div');
  difficultyRow.className = 'difficulty-row';
  for (const difficulty of DIFFICULTY_META) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `difficulty-pill ${state.settings.difficulty === difficulty.id ? 'is-active' : ''}`;
    button.innerHTML = `<strong>${difficulty.label}</strong><span>${difficulty.hint}</span>`;
    button.addEventListener('click', () => runtime.setDifficulty(difficulty.id));
    difficultyRow.appendChild(button);
  }
  settingsCard.querySelector('.settings-body')?.appendChild(difficultyRow);

  panel.appendChild(settingsCard);

  return panel;
}

function renderQuestion(state: SessionState): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'panel question-panel';
  const question = state.question;
  if (!question) {
    panel.textContent = '马上出题…';
    return panel;
  }

  panel.innerHTML = `
    <div class="progress-card question-progress-card">
      <div class="question-progress-index">第${state.questionNumber}/${state.progress.total}题</div>
      <div class="question-progress-meta">✓${state.progress.correctCount} 连${state.progress.streak}</div>
    </div>
    <div class="question-card">
      <div class="question-badge">${question.operation === 'add' ? '加法' : question.operation === 'subtract' ? '减法' : question.operation === 'multiply' ? '乘法' : '除法'}闯关</div>
      <div class="question-text">${question.left} <span>${question.symbol}</span> ${question.right}</div>
      <div class="answer-display">${state.answerInput || '？'}</div>
    </div>
  `;

  panel.appendChild(createKeypad(state.answerInput.length > 0));
  const goHomeButton = document.createElement('button');
  goHomeButton.type = 'button';
  goHomeButton.className = 'ghost-btn question-home-btn';
  goHomeButton.textContent = '返回首页';
  goHomeButton.addEventListener('click', () => runtime.goHome());
  panel.appendChild(goHomeButton);
  return panel;
}

function createKeypad(hasAnswer: boolean): HTMLElement {
  const keypad = document.createElement('div');
  keypad.className = 'keypad';

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清空', '0', '退格'];
  for (const item of digits) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `key-btn ${item === '清空' || item === '退格' ? 'soft' : ''}`;
    button.textContent = item;
    button.addEventListener('click', () => {
      if (item === '清空') {
        runtime.clearAnswer();
      } else if (item === '退格') {
        runtime.backspace();
      } else {
        runtime.appendDigit(item);
      }
    });
    keypad.appendChild(button);
  }

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'submit-btn';
  submit.textContent = hasAnswer ? '✅ 提交答案' : '先输入数字';
  submit.disabled = !hasAnswer;
  submit.addEventListener('click', () => runtime.submitCurrentAnswer());
  keypad.appendChild(submit);

  return keypad;
}

function renderFeedback(state: SessionState): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'panel feedback-panel';
  const question = state.question;
  const feedback = state.feedback;
  if (!question || !feedback) {
    panel.textContent = '马上公布结果…';
    return panel;
  }

  panel.innerHTML = `
    <div class="feedback-card ${feedback.isCorrect ? 'is-correct' : 'is-warm'}">
      <div class="feedback-emoji">${feedback.isCorrect ? '🎉' : '💛'}</div>
      <h2>${feedback.message}</h2>
      <p>${feedback.detail}</p>
      <div class="feedback-answer">
        ${question.prompt}
        <strong>${feedback.correctAnswer}</strong>
      </div>
      <div class="feedback-strip">
        <span>当前连对：${feedback.streakAfter}</span>
        <span>已答对：${state.progress.correctCount}/${state.progress.total}</span>
      </div>
      ${feedback.streakReward ? `<div class="streak-bonus">${feedback.streakReward}</div>` : ''}
      <button class="next-btn" type="button">${state.questionNumber >= state.progress.total ? '🏁 查看成绩' : '➡️ 下一题'}</button>
    </div>
  `;

  panel.querySelector<HTMLButtonElement>('.next-btn')?.addEventListener('click', () => runtime.nextStep());
  return panel;
}

function renderResult(state: SessionState): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'panel result-panel';
  const result = state.results;
  if (!result) {
    panel.textContent = '正在统计成绩…';
    return panel;
  }

  const stars = Array.from({ length: 3 }, (_, index) => (index < result.stars ? '⭐' : '☆')).join(' ');
  panel.innerHTML = `
    <div class="award-card">
      <div class="award-badge">${result.badge}</div>
      <div class="banner-badge">${result.rewardTitle}</div>
      <h2>${result.rankLabel}</h2>
      <div class="stars">${stars}</div>
      <p>${result.rewardMessage}</p>
      <div class="result-grid">
        <div class="result-item"><span>答对</span><strong>${result.correctCount}/${result.total}</strong></div>
        <div class="result-item"><span>正确率</span><strong>${result.accuracyText}</strong></div>
        <div class="result-item"><span>最佳连对</span><strong>${result.bestStreak}</strong></div>
        <div class="result-item"><span>奖励金币</span><strong>${result.coins}</strong></div>
      </div>
      <div class="result-message">今天表现很棒，马上再来一局，看看能不能拿到更亮的奖杯！</div>
      <div class="result-actions">
        <button class="start-btn play-again" type="button">🔁 再来一局</button>
        <button class="secondary-btn go-home" type="button">🏠 返回首页</button>
      </div>
    </div>
  `;

  panel.querySelector<HTMLButtonElement>('.play-again')?.addEventListener('click', () => runtime.replayWithCurrentSettings());
  panel.querySelector<HTMLButtonElement>('.go-home')?.addEventListener('click', () => runtime.goHome());
  return panel;
}
