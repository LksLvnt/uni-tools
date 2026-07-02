import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PomodoroPhase, PomodoroService } from '../../core/services/pomodoro.service';

@Component({
  selector: 'app-pomodoro',
  imports: [FormsModule],
  template: `
    <div class="max-w-lg mx-auto">
      <div class="flex items-center justify-between mb-6" style="animation: fadeUp 0.4s ease both">
        <h2 class="font-['Playfair_Display'] text-2xl font-bold">Pomodoro</h2>
        <button (click)="showSettings.set(!showSettings())"
          class="px-3 py-1.5 rounded-lg text-sm transition-all border active:scale-[0.95] bg-surface-raised text-text-muted border-border hover:border-accent/40 hover:text-text">
          {{ showSettings() ? 'Close settings' : 'Settings' }}
        </button>
      </div>

      @if (showSettings()) {
        <div class="bg-surface-raised rounded-xl border border-border p-5 mb-6 flex flex-col gap-4" style="animation: fadeUp 0.3s ease both">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="text-xs text-text-muted mb-1 block">Focus (min)</label>
              <input type="number" min="1" max="180" [ngModel]="service.settings().focusMinutes"
                (ngModelChange)="updateSetting('focusMinutes', $event)"
                class="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition" />
            </div>
            <div>
              <label class="text-xs text-text-muted mb-1 block">Short break</label>
              <input type="number" min="1" max="60" [ngModel]="service.settings().shortBreakMinutes"
                (ngModelChange)="updateSetting('shortBreakMinutes', $event)"
                class="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition" />
            </div>
            <div>
              <label class="text-xs text-text-muted mb-1 block">Long break</label>
              <input type="number" min="1" max="120" [ngModel]="service.settings().longBreakMinutes"
                (ngModelChange)="updateSetting('longBreakMinutes', $event)"
                class="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition" />
            </div>
            <div>
              <label class="text-xs text-text-muted mb-1 block">Long break after</label>
              <input type="number" min="1" max="12" [ngModel]="service.settings().sessionsUntilLongBreak"
                (ngModelChange)="updateSetting('sessionsUntilLongBreak', $event)"
                class="w-full px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text transition">
              <input type="checkbox" [ngModel]="service.settings().autoStartBreaks"
                (ngModelChange)="updateSetting('autoStartBreaks', $event)" class="accent-[var(--accent)]" />
              Auto-start breaks
            </label>
            <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text transition">
              <input type="checkbox" [ngModel]="service.settings().autoStartFocus"
                (ngModelChange)="updateSetting('autoStartFocus', $event)" class="accent-[var(--accent)]" />
              Auto-start focus after breaks
            </label>
            <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text transition">
              <input type="checkbox" [ngModel]="service.settings().soundEnabled"
                (ngModelChange)="updateSetting('soundEnabled', $event)" class="accent-[var(--accent)]" />
              Sound alert
            </label>
            <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-text transition">
              <input type="checkbox" [ngModel]="service.settings().notificationsEnabled"
                (ngModelChange)="updateSetting('notificationsEnabled', $event)" class="accent-[var(--accent)]" />
              Notifications
            </label>
          </div>
          @if (notificationsBlocked()) {
            <p class="text-xs text-danger">Notifications are blocked in your browser — allow them in site settings to get alerts.</p>
          }
        </div>
      }

      @if (service.loading()) {
        <div class="flex items-center justify-center py-20 text-text-muted text-sm" style="animation: fadeIn 0.3s ease both">
          Loading pomodoro...
        </div>
      } @else {
        <div class="bg-surface-raised rounded-xl border border-border p-6 sm:p-8 flex flex-col items-center gap-6" style="animation: fadeUp 0.5s ease 0.05s both">
          <div class="flex gap-2">
            @for (tab of phaseTabs; track tab.phase) {
              <button
                (click)="service.setPhase(tab.phase)"
                [disabled]="service.state() === 'running'"
                [class]="'px-3 py-1.5 rounded-lg text-sm transition-all border active:scale-[0.95] ' + (service.phase() === tab.phase ? 'bg-accent text-surface border-accent' : 'bg-surface text-text-muted border-border hover:border-accent/40 disabled:opacity-50')"
              >{{ tab.label }}</button>
            }
          </div>

          <div class="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border)" stroke-width="6" />
              <circle cx="100" cy="100" r="90" fill="none"
                [attr.stroke]="service.phase() === 'focus' ? 'var(--accent)' : '#4ade80'"
                stroke-width="6"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset()"
                style="transition: stroke-dashoffset 0.5s ease"
              />
            </svg>
            <div class="text-center z-10">
              <div class="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-text">{{ service.displayTime() }}</div>
              <div class="text-sm text-text-muted mt-1">{{ statusLabel() }}</div>
            </div>
          </div>

          <div class="flex items-center gap-1.5" title="Focus sessions until long break">
            @for (dot of cycleDots(); track $index) {
              <span [class]="'w-2.5 h-2.5 rounded-full transition-all ' + (dot ? 'bg-accent' : 'bg-border')"></span>
            }
          </div>

          <input
            [ngModel]="service.label()"
            (ngModelChange)="service.label.set($event)"
            placeholder="What are you working on?"
            [disabled]="service.state() === 'running'"
            class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text text-center placeholder:text-text-muted focus:outline-none focus:border-accent transition"
          />

          <div class="flex gap-3">
            @if (service.state() === 'idle') {
              <button (click)="service.start()"
                class="px-6 py-2.5 bg-accent text-surface rounded-lg font-semibold hover:bg-accent-hover active:scale-[0.96] transition-all">
                Start
              </button>
            }
            @if (service.state() === 'running') {
              <button (click)="service.pause()"
                class="px-6 py-2.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 active:scale-[0.96] transition-all">
                Pause
              </button>
            }
            @if (service.state() === 'paused') {
              <button (click)="service.start()"
                class="px-6 py-2.5 bg-accent text-surface rounded-lg font-semibold hover:bg-accent-hover active:scale-[0.96] transition-all">
                Resume
              </button>
            }
            @if (service.state() !== 'idle') {
              <button (click)="service.reset()"
                class="px-6 py-2.5 bg-surface border border-border text-text-muted rounded-lg hover:text-text hover:border-accent/40 active:scale-[0.96] transition-all">
                Reset
              </button>
            }
            <button (click)="service.skip()"
              class="px-6 py-2.5 bg-surface border border-border text-text-muted rounded-lg hover:text-text hover:border-accent/40 active:scale-[0.96] transition-all">
              Skip
            </button>
          </div>
        </div>

        @if (todaySessions().length > 0) {
          <div class="mt-6" style="animation: fadeUp 0.5s ease 0.15s both">
            <h3 class="font-['Playfair_Display'] text-lg font-semibold mb-3">Today's sessions</h3>
            <div class="flex flex-col gap-2">
              @for (session of todaySessions(); track session.id) {
                <div class="bg-surface-raised rounded-lg border border-border px-4 py-3 flex items-center justify-between hover:border-accent/30 transition-all">
                  <div>
                    <span class="text-sm font-medium">{{ session.label || 'Focus session' }}</span>
                    <span class="text-xs text-text-muted ml-2">{{ formatTime(session.completed_at!) }}</span>
                  </div>
                  <span class="text-sm text-accent font-mono">{{ session.duration_minutes }}min</span>
                </div>
              }
            </div>
          </div>
        }

        <div class="mt-6 grid grid-cols-2 gap-3 sm:gap-4" style="animation: fadeUp 0.5s ease 0.2s both">
          <div class="bg-surface-raised rounded-xl border border-border p-4 hover:border-accent/30 transition-all">
            <div class="text-sm text-text-muted">Today</div>
            <div class="text-2xl font-bold mt-1">{{ todayMinutes() }} min</div>
          </div>
          <div class="bg-surface-raised rounded-xl border border-border p-4 hover:border-accent/30 transition-all">
            <div class="text-sm text-text-muted">Sessions today</div>
            <div class="text-2xl font-bold mt-1">{{ todaySessions().length }}</div>
          </div>
        </div>
      }
      </div>
  `,
})
export default class Pomodoro implements OnInit {
  service = inject(PomodoroService);
  showSettings = signal(false);

  readonly circumference = 2 * Math.PI * 90;
  readonly phaseTabs: { label: string; phase: PomodoroPhase }[] = [
    { label: 'Focus', phase: 'focus' },
    { label: 'Short break', phase: 'short_break' },
    { label: 'Long break', phase: 'long_break' },
  ];

  dashOffset = computed(() => {
    const total = this.service.phaseDuration();
    if (total <= 0) return 0;
    const progress = Math.min(Math.max(this.service.remaining() / total, 0), 1);
    return this.circumference * progress;
  });

  statusLabel = computed(() => {
    const state = this.service.state();
    if (state === 'paused') return 'Paused';
    const phase = this.service.phase();
    if (phase === 'short_break') return 'Short break';
    if (phase === 'long_break') return 'Long break';
    return state === 'running' ? 'Focus' : 'Ready';
  });

  cycleDots = computed(() => {
    const total = this.service.settings().sessionsUntilLongBreak;
    const done = Math.min(this.service.cycleCount(), total);
    return Array.from({ length: total }, (_, i) => i < done);
  });

  todaySessions = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.service.sessions().filter(s =>
      s.completed_at?.startsWith(today)
    );
  });

  todayMinutes = computed(() =>
    this.todaySessions().reduce((sum, s) => sum + s.duration_minutes, 0)
  );

  ngOnInit() {
    this.service.load();
  }

  notificationsBlocked(): boolean {
    return this.service.settings().notificationsEnabled
      && 'Notification' in window
      && Notification.permission === 'denied';
  }

  updateSetting(key: string, value: number | boolean) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 1)) return;
    this.service.updateSettings({ [key]: value });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  }
}
