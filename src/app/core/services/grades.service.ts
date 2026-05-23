import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface GradeEntry {
  id?: string;
  user_id?: string;
  subject_name: string;
  credit: number;
  grade: number;
  semester?: string;
}

@Injectable({ providedIn: 'root' })
export class GradesService {
  private supabase = inject(SupabaseService);
  entries = signal<GradeEntry[]>([]);
  loading = signal(false);

  async load() {
    this.loading.set(true);
    const { data, error } = await this.supabase.client
      .from('grade_entries')
      .select('*')
      .order('created_at');
    if (!error && data) {
      this.entries.set(data);
    } else if (error) {
      console.error('Failed to load grades:', error.message);
    }
    this.loading.set(false);
  }

  async add(entry: GradeEntry) {
    const { error } = await this.supabase.client
      .from('grade_entries')
      .insert(entry);
    if (!error) await this.load();
    return error;
  }

  async update(id: string, entry: Partial<GradeEntry>) {
    const { error } = await this.supabase.client
      .from('grade_entries')
      .update(entry)
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }

  async remove(id: string) {
    const { error } = await this.supabase.client
      .from('grade_entries')
      .delete()
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }
}