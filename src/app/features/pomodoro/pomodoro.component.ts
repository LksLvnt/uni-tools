import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PomodoroService } from '../../core/services/pomodoro.service';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

@Component({
  selector: 'app-pomodoro',
  imports: [FormsModule],
  template: `
    <div class="max-w-lg mx-auto">
      <h2 class="font-['Playfair_Display'] text-2xl font-bold mb-6" style="animation: fadeUp 0.4s ease both">Pomodoro</h2>
      @if (service.loading()) {
        <div class="flex items-center justify-center py-20 text-text-muted text-sm" style="animation: fadeIn 0.3s ease both">
          Loading pomodoro...
        </div>
      } @else {
        <div class="bg-surface-raised rounded-xl border border-border p-6 sm:p-8 flex flex-col items-center gap-6" style="animation: fadeUp 0.5s ease 0.05s both">
          <div class="flex gap-2">
            @for (preset of presets; track preset.label) {
              <button
                (click)="setDuration(preset.minutes)"
                [disabled]="state() === 'running'"
                [class]="'px-3 py-1.5 rounded-lg text-sm transition-all border active:scale-[0.95] ' + (duration() === preset.minutes && state() === 'idle' ? 'bg-accent text-surface border-accent' : 'bg-surface text-text-muted border-border hover:border-accent/40 disabled:opacity-50')"
              >{{ preset.label }}</button>
            }
          </div>

          <div class="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="var(--border)" stroke-width="6" />
              <circle cx="100" cy="100" r="90" fill="none"
                [attr.stroke]="state() === 'break' ? '#4ade80' : 'var(--accent)'"
                stroke-width="6"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset()"
                style="transition: stroke-dashoffset 0.5s ease"
              />
            </svg>
            <div class="text-center z-10">
              <div class="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-text">{{ displayTime() }}</div>
              <div class="text-sm text-text-muted mt-1">
                {{ state() === 'break' ? 'Break' : state() === 'idle' ? 'Ready' : state() === 'paused' ? 'Paused' : 'Focus' }}
              </div>
            </div>
          </div>

          <input
            [(ngModel)]="label"
            placeholder="What are you working on?"
            [disabled]="state() === 'running'"
            class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text text-center placeholder:text-text-muted focus:outline-none focus:border-accent transition"
          />

          <div class="flex gap-3">
            @if (state() === 'idle' || state() === 'break') {
              <button (click)="start()"
                class="px-6 py-2.5 bg-accent text-surface rounded-lg font-semibold hover:bg-accent-hover active:scale-[0.96] transition-all">
                Start
              </button>
            }
            @if (state() === 'running') {
              <button (click)="pause()"
                class="px-6 py-2.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 active:scale-[0.96] transition-all">
                Pause
              </button>
            }
            @if (state() === 'paused') {
              <button (click)="resume()"
                class="px-6 py-2.5 bg-accent text-surface rounded-lg font-semibold hover:bg-accent-hover active:scale-[0.96] transition-all">
                Resume
              </button>
            }
            @if (state() !== 'idle') {
              <button (click)="reset()"
                class="px-6 py-2.5 bg-surface border border-border text-text-muted rounded-lg hover:text-text hover:border-accent/40 active:scale-[0.96] transition-all">
                Reset
              </button>
            }
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
export default class Pomodoro implements OnInit, OnDestroy {
  service = inject(PomodoroService);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  state = signal<TimerState>('idle');
  duration = signal(25);
  remaining = signal(25 * 60);
  label = '';

  readonly circumference = 2 * Math.PI * 90;
  readonly presets = [
    { label: '25 min', minutes: 25 },
    { label: '45 min', minutes: 45 },
    { label: '60 min', minutes: 60 },
  ];

  dashOffset = computed(() => {
    const total = this.duration() * 60;
    const progress = this.remaining() / total;
    return this.circumference * progress;
  });

  displayTime = computed(() => {
    const total = this.remaining();
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

  ngOnDestroy() {
    this.clearInterval();
  }

  setDuration(minutes: number) {
    this.duration.set(minutes);
    this.remaining.set(minutes * 60);
  }

  start() {
    if (this.state() === 'break' || this.state() === 'idle') {
      this.remaining.set(this.duration() * 60);
    }
    this.state.set('running');
    this.tick();
  }

  pause() {
    this.clearInterval();
    this.state.set('paused');
  }

  resume() {
    this.state.set('running');
    this.tick();
  }

  reset() {
    this.clearInterval();
    this.state.set('idle');
    this.remaining.set(this.duration() * 60);
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  }

  private tick() {
    this.clearInterval();
    this.intervalId = setInterval(() => {
      const next = this.remaining() - 1;
      if (next <= 0) {
        this.clearInterval();
        this.onComplete();
      } else {
        this.remaining.set(next);
      }
    }, 1000);
  }

  private async onComplete() {
    if (this.state() === 'running') {
      await this.service.log({
        duration_minutes: this.duration(),
        label: this.label || undefined,
      });
      this.state.set('break');
      this.duration.set(5);
      this.remaining.set(5 * 60);
    } else {
      this.state.set('idle');
      this.duration.set(25);
      this.remaining.set(25 * 60);
    }
  }

  private clearInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}