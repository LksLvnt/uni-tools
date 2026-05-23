import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PomodoroSession {
  id?: string;
  duration_minutes: number;
  label?: string;
  completed_at?: string;
}

@Injectable({ providedIn: 'root' })
export class PomodoroService {
  private supabase = inject(SupabaseService);
  sessions = signal<PomodoroSession[]>([]);

  async load() {
    const { data, error } = await this.supabase.client
      .from('pomodoro_sessions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(50);
    if (!error && data) this.sessions.set(data);
  }

  async log(session: PomodoroSession) {
    const { error } = await this.supabase.client
      .from('pomodoro_sessions')
      .insert(session);
    if (!error) await this.load();
    return error;
  }
}