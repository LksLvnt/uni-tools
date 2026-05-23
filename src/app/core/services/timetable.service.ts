import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

export interface TimetableEntry {
  id?: string;
  user_id?: string;
  subject_name: string;
  neptun_code?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  instructor?: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class TimetableService {
  private supabase = inject(SupabaseService);
  entries = signal<TimetableEntry[]>([]);
    loading = signal(false);

async load() {
  this.loading.set(true);
  const { data, error } = await this.supabase.client
    .from('timetable_entries')
    .select('*')
    .order('start_time');
  if (!error && data) {
    this.entries.set(data);
  } else if (error) {
    console.error('Failed to load timetable:', error.message);
  }
  this.loading.set(false);
}

  async add(entry: TimetableEntry) {
    const { error } = await this.supabase.client
      .from('timetable_entries')
      .insert(entry);
    if (!error) await this.load();
    return error;
  }

  async update(id: string, entry: Partial<TimetableEntry>) {
    const { error } = await this.supabase.client
      .from('timetable_entries')
      .update(entry)
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }

  async remove(id: string) {
    const { error } = await this.supabase.client
      .from('timetable_entries')
      .delete()
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }

  parseIcs(icsText: string): TimetableEntry[] {
    const events: TimetableEntry[] = [];
    const blocks = icsText.split('BEGIN:VEVENT');

    for (const block of blocks.slice(1)) {
      const get = (key: string) => {
        const match = block.match(new RegExp(`${key}[^:]*:(.+)`));
        return match ? match[1].trim() : '';
      };

      const dtstart = get('DTSTART');
      const dtend = get('DTEND');
      const summary = get('SUMMARY');
      const location = get('LOCATION');

      if (!dtstart || !summary) continue;

      const start = this.parseIcsDate(dtstart);
      const end = this.parseIcsDate(dtend);
      if (!start) continue;

      const dayOfWeek = start.getDay();
      if (dayOfWeek < 1 || dayOfWeek > 5) continue;

      events.push({
        subject_name: summary,
        day_of_week: dayOfWeek,
        start_time: this.toTimeString(start),
        end_time: end ? this.toTimeString(end) : this.toTimeString(new Date(start.getTime() + 90 * 60000)),
        room: location || undefined,
        color: '#6366f1',
      });
    }

    return this.deduplicateEntries(events);
  }

  private parseIcsDate(str: string): Date | null {
    const match = str.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (!match) return null;
    return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]);
  }

  private toTimeString(d: Date): string {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  private deduplicateEntries(entries: TimetableEntry[]): TimetableEntry[] {
    const seen = new Set<string>();
    return entries.filter(e => {
      const key = `${e.subject_name}-${e.day_of_week}-${e.start_time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}