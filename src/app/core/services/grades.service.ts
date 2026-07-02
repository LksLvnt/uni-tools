import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface GradeEntry {
  id?: string;
  user_id?: string;
  subject_name: string;
  credit: number;
  grade: number | null;
  semester?: string | null;
  completed?: boolean | null;
}

export interface ImportedSubject {
  subject_name: string;
  credit: number;
  semester?: string;
  grade: number | null;
  completed: boolean | null;
  duplicate: boolean;
  include: boolean;
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

  async addMany(entries: GradeEntry[]) {
    const { error } = await this.supabase.client
      .from('grade_entries')
      .insert(entries);
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

  /**
   * Parses a Neptun subject/course export (.xlsx). Column headers are matched
   * by keyword (Hungarian and English), so minor format differences are fine.
   */
  async parseXlsx(file: File): Promise<ImportedSubject[]> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('The file has no worksheets.');

    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        values[col - 1] = this.cellText(cell.value);
      });
      rows.push(values);
    });

    const columnOf = (row: string[], pattern: RegExp) =>
      row.findIndex(v => pattern.test(v));

    const namePattern = /t(á|a)rgy\s*n(é|e)v|tant(á|a)rgy|subject\s*name|course\s*(name|title)|^n(é|e)v$|^name$/i;
    const creditPattern = /kredit|credit/i;
    const semesterPattern = /f(é|e)l(é|e)v|semester/i;
    const completedPattern = /teljes(í|i)t|completed|fulfilled/i;
    const gradePattern = /(érdem)?jegy|eredm(é|e)ny|grade|result/i;

    let headerIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      if (columnOf(rows[i], namePattern) !== -1 && columnOf(rows[i], creditPattern) !== -1) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex === -1) {
      throw new Error('Could not find a header row with subject name and credit columns.');
    }

    const header = rows[headerIndex];
    const nameCol = columnOf(header, namePattern);
    const creditCol = columnOf(header, creditPattern);
    const semesterCol = columnOf(header, semesterPattern);
    const completedCol = columnOf(header, completedPattern);
    const gradeCol = columnOf(header, gradePattern);

    const existing = new Set(
      this.entries().map(e => this.dedupeKey(e.subject_name, e.semester ?? undefined))
    );

    const result: ImportedSubject[] = [];
    for (const row of rows.slice(headerIndex + 1)) {
      const name = (row[nameCol] ?? '').trim();
      const credit = this.parseCredit(row[creditCol] ?? '');
      if (!name || credit === null) continue;
      const semester = semesterCol !== -1 ? (row[semesterCol] ?? '').trim() || undefined : undefined;
      const grade = gradeCol !== -1 ? this.parseGrade(row[gradeCol] ?? '') : null;
      const completed = completedCol !== -1 ? this.parseCompleted(row[completedCol] ?? '') : null;
      const duplicate = existing.has(this.dedupeKey(name, semester));
      result.push({
        subject_name: name,
        credit,
        semester,
        grade,
        completed,
        duplicate,
        include: !duplicate,
      });
    }
    return result;
  }

  private dedupeKey(name: string, semester?: string): string {
    return `${name.trim().toLowerCase()}::${(semester ?? '').trim().toLowerCase()}`;
  }

  private cellText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      const v = value as any;
      if (Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join('');
      if (v.text !== undefined) return String(v.text);
      if (v.result !== undefined) return String(v.result);
      if (value instanceof Date) return value.toISOString();
      return '';
    }
    return String(value);
  }

  private parseCredit(text: string): number | null {
    const match = text.replace(',', '.').match(/\d+(\.\d+)?/);
    if (!match) return null;
    const n = Math.round(parseFloat(match[0]));
    return n >= 1 && n <= 60 ? n : null;
  }

  private parseGrade(text: string): number | null {
    // Neptun results look like "Jeles (5)", "4 - Jó" or just "4".
    const match = text.match(/[1-5]/);
    return match ? Number(match[0]) : null;
  }

  private parseCompleted(text: string): boolean | null {
    const t = text.trim().toLowerCase();
    if (!t) return null;
    if (/^(igen|yes|true|x|✓|teljes(í|i)tve|1)$/i.test(t)) return true;
    if (/^(nem|no|false|0)$/i.test(t)) return false;
    return null;
  }
}
