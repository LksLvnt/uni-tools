import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PomodoroSession {
  id?: string;
  duration_minutes: number;
  label?: string;
  completed_at?: string;
}

export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';
export type PomodoroState = 'idle' | 'running' | 'paused';

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  soundEnabled: true,
  notificationsEnabled: true,
};

const SETTINGS_KEY = 'pomodoro:settings';
const STATE_KEY = 'pomodoro:state';

interface PersistedState {
  phase: PomodoroPhase;
  state: PomodoroState;
  endAt: number | null;
  remainingSec: number;
  cycleCount: number;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private supabase = inject(SupabaseService);
  sessions = signal<PomodoroSession[]>([]);
  loading = signal(false);

  settings = signal<PomodoroSettings>(this.loadSettings());

  phase = signal<PomodoroPhase>('focus');
  state = signal<PomodoroState>('idle');
  remaining = signal(DEFAULT_SETTINGS.focusMinutes * 60);
  /** Completed focus sessions in the current cycle (long break resets it). */
  cycleCount = signal(0);
  label = signal('');

  private endAt: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  phaseDuration = computed(() => this.durationFor(this.phase()) * 60);

  displayTime = computed(() => {
    const total = Math.max(this.remaining(), 0);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  constructor() {
    this.restoreState();
  }

  async load() {
    const { data, error } = await this.supabase.client
      .from('pomodoro_sessions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(50);
    if (!error && data) this.sessions.set(data);
    else if (error) {
      console.error('Failed to load sessions:', error.message);
    }
  }

  async log(session: PomodoroSession) {
    const { error } = await this.supabase.client
      .from('pomodoro_sessions')
      .insert(session);
    if (error) {
      console.error('Failed to log session:', error.message);
    } else {
      await this.load();
    }
    return error;
  }

  updateSettings(patch: Partial<PomodoroSettings>) {
    this.settings.update(s => ({ ...s, ...patch }));
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings()));
    } catch { /* storage unavailable */ }
    if (this.state() === 'idle') {
      this.remaining.set(this.phaseDuration());
    }
    this.persistState();
  }

  /** Switch phase manually (only when the timer is not running). */
  setPhase(phase: PomodoroPhase) {
    if (this.state() === 'running') return;
    this.phase.set(phase);
    this.state.set('idle');
    this.endAt = null;
    this.remaining.set(this.durationFor(phase) * 60);
    this.persistState();
  }

  start() {
    if (this.state() === 'running') return;
    if (this.state() === 'idle') {
      this.remaining.set(this.phaseDuration());
    }
    if (this.settings().notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    this.endAt = Date.now() + this.remaining() * 1000;
    this.state.set('running');
    this.startTicker();
    this.persistState();
  }

  pause() {
    if (this.state() !== 'running') return;
    this.syncRemaining();
    this.endAt = null;
    this.state.set('paused');
    this.stopTicker();
    this.updateTitle();
    this.persistState();
  }

  reset() {
    this.stopTicker();
    this.endAt = null;
    this.state.set('idle');
    this.remaining.set(this.phaseDuration());
    this.updateTitle();
    this.persistState();
  }

  /** Skip the current phase without logging it. */
  skip() {
    this.stopTicker();
    this.endAt = null;
    this.advancePhase(false);
  }

  private durationFor(phase: PomodoroPhase): number {
    const s = this.settings();
    return phase === 'focus' ? s.focusMinutes
      : phase === 'short_break' ? s.shortBreakMinutes
      : s.longBreakMinutes;
  }

  private startTicker() {
    this.stopTicker();
    this.tick();
    this.intervalId = setInterval(() => this.tick(), 500);
  }

  private stopTicker() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    if (this.state() !== 'running' || this.endAt === null) return;
    this.syncRemaining();
    this.updateTitle();
    if (this.remaining() <= 0) {
      this.stopTicker();
      this.onComplete();
    }
  }

  private syncRemaining() {
    if (this.endAt === null) return;
    this.remaining.set(Math.max(Math.round((this.endAt - Date.now()) / 1000), 0));
  }

  private async onComplete() {
    const finishedPhase = this.phase();
    this.endAt = null;
    if (finishedPhase === 'focus') {
      this.cycleCount.update(c => c + 1);
      await this.log({
        duration_minutes: this.durationFor('focus'),
        label: this.label() || undefined,
      });
    }
    this.notifyComplete(finishedPhase);
    this.advancePhase(true);
  }

  private advancePhase(autoStart: boolean) {
    const s = this.settings();
    const finished = this.phase();
    let next: PomodoroPhase;
    if (finished === 'focus') {
      next = this.cycleCount() >= s.sessionsUntilLongBreak ? 'long_break' : 'short_break';
    } else {
      if (finished === 'long_break') this.cycleCount.set(0);
      next = 'focus';
    }
    this.phase.set(next);
    this.remaining.set(this.durationFor(next) * 60);

    const shouldAutoStart = autoStart && (next === 'focus' ? s.autoStartFocus : s.autoStartBreaks);
    if (shouldAutoStart) {
      this.endAt = Date.now() + this.remaining() * 1000;
      this.state.set('running');
      this.startTicker();
    } else {
      this.state.set('idle');
      this.updateTitle();
    }
    this.persistState();
  }

  private updateTitle() {
    if (this.state() === 'running' || this.state() === 'paused') {
      const prefix = this.phase() === 'focus' ? 'Focus' : 'Break';
      document.title = `${this.displayTime()} ${prefix} — UniTools`;
    } else {
      document.title = 'UniTools';
    }
  }

  private notifyComplete(finished: PomodoroPhase) {
    const s = this.settings();
    if (s.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      const body = finished === 'focus'
        ? (this.cycleCount() >= s.sessionsUntilLongBreak
          ? `Focus session done! Time for a long break (${s.longBreakMinutes} min).`
          : `Focus session done! Take a short break (${s.shortBreakMinutes} min).`)
        : 'Break is over — ready for the next focus session?';
      try {
        new Notification('Pomodoro — UniTools', { body, tag: 'pomodoro' });
      } catch { /* some platforms only allow notifications via service worker */ }
    }
    if (s.soundEnabled) this.playChime();
  }

  private playChime() {
    try {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const notes = [880, 1174.66];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.55);
      });
      setTimeout(() => ctx.close().catch(() => {}), 1500);
    } catch { /* audio unavailable */ }
  }

  private persistState() {
    const data: PersistedState = {
      phase: this.phase(),
      state: this.state(),
      endAt: this.endAt,
      remainingSec: this.remaining(),
      cycleCount: this.cycleCount(),
      label: this.label(),
    };
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(data));
    } catch { /* storage unavailable */ }
  }

  private restoreState() {
    let saved: PersistedState | null = null;
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch { /* corrupted state, start fresh */ }
    if (!saved) {
      this.remaining.set(this.phaseDuration());
      return;
    }
    this.phase.set(saved.phase ?? 'focus');
    this.cycleCount.set(saved.cycleCount ?? 0);
    this.label.set(saved.label ?? '');
    if (saved.state === 'running' && saved.endAt) {
      if (saved.endAt <= Date.now()) {
        // Timer finished while the app was closed — count it and move on.
        this.state.set('running');
        this.endAt = saved.endAt;
        this.remaining.set(0);
        this.stopTicker();
        this.onComplete();
      } else {
        this.endAt = saved.endAt;
        this.state.set('running');
        this.syncRemaining();
        this.startTicker();
      }
    } else if (saved.state === 'paused') {
      this.state.set('paused');
      this.remaining.set(saved.remainingSec ?? this.phaseDuration());
    } else {
      this.state.set('idle');
      this.remaining.set(this.phaseDuration());
    }
  }

  private loadSettings(): PomodoroSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* corrupted settings, use defaults */ }
    return { ...DEFAULT_SETTINGS };
  }
}
