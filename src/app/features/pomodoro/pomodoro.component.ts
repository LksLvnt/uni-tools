import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PomodoroService } from '../../core/services/pomodoro.service';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

@Component({
  selector: 'app-pomodoro',
  imports: [FormsModule],
  template: `
    <div class="max-w-lg mx-auto">
      <h2 class="text-2xl font-bold mb-6">Pomodoro Timer</h2>

      <div class="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center gap-6">
        <div class="flex gap-2">
          @for (preset of presets; track preset.label) {
            <button
              (click)="setDuration(preset.minutes)"
              [disabled]="state() === 'running'"
              [class]="'px-3 py-1 rounded-lg text-sm transition ' + (duration() === preset.minutes && state() === 'idle' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')"
            >{{ preset.label }}</button>
          }
        </div>

        <div class="relative w-56 h-56 flex items-center justify-center">
          <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#e2e8f0" stroke-width="8" />
            <circle cx="100" cy="100" r="90" fill="none"
              [attr.stroke]="state() === 'break' ? '#22c55e' : '#6366f1'"
              stroke-width="8"
              stroke-linecap="round"
              [attr.stroke-dasharray]="circumference"
              [attr.stroke-dashoffset]="dashOffset()"
            />
          </svg>
          <div class="text-center z-10">
            <div class="text-5xl font-mono font-bold tracking-tight">{{ displayTime() }}</div>
            <div class="text-sm text-slate-400 mt-1">
              {{ state() === 'break' ? 'Break' : state() === 'idle' ? 'Ready' : state() === 'paused' ? 'Paused' : 'Focus' }}
            </div>
          </div>
        </div>

        <input
          [(ngModel)]="label"
          placeholder="What are you working on?"
          [disabled]="state() === 'running'"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center"
        />

        <div class="flex gap-3">
          @if (state() === 'idle' || state() === 'break') {
            <button (click)="start()"
              class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
              Start
            </button>
          }
          @if (state() === 'running') {
            <button (click)="pause()"
              class="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition">
              Pause
            </button>
          }
          @if (state() === 'paused') {
            <button (click)="resume()"
              class="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
              Resume
            </button>
          }
          @if (state() !== 'idle') {
            <button (click)="reset()"
              class="px-6 py-2 bg-slate-400 text-white rounded-lg hover:bg-slate-500 transition">
              Reset
            </button>
          }
        </div>
      </div>

      @if (todaySessions().length > 0) {
        <div class="mt-6">
          <h3 class="text-lg font-semibold mb-3">Today's sessions</h3>
          <div class="flex flex-col gap-2">
            @for (session of todaySessions(); track session.id) {
              <div class="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <span class="text-sm font-medium">{{ session.label || 'Focus session' }}</span>
                  <span class="text-xs text-slate-400 ml-2">{{ formatTime(session.completed_at!) }}</span>
                </div>
                <span class="text-sm text-indigo-500 font-mono">{{ session.duration_minutes }}min</span>
              </div>
            }
          </div>
        </div>
      }

      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-sm text-slate-500">Today</div>
          <div class="text-2xl font-bold mt-1">{{ todayMinutes() }} min</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4">
          <div class="text-sm text-slate-500">Sessions today</div>
          <div class="text-2xl font-bold mt-1">{{ todaySessions().length }}</div>
        </div>
      </div>
    </div>
  `,
})
export default class Pomodoro implements OnInit, OnDestroy {
  private service = inject(PomodoroService);
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