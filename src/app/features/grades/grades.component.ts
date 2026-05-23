import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GradeEntry, GradesService } from '../../core/services/grades.service';

@Component({
  selector: 'app-grades',
  imports: [FormsModule],
  template: `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Grades</h2>
      <button
        (click)="openForm()"
        class="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition">
        + Add subject
      </button>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <div class="text-sm text-slate-500">Weighted Average</div>
        <div class="text-3xl font-bold mt-1">{{ weightedAvg() }}</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <div class="text-sm text-slate-500">Total Credits</div>
        <div class="text-3xl font-bold mt-1">{{ totalCredits() }}</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-slate-200">
        <div class="text-sm text-slate-500">Subjects</div>
        <div class="text-3xl font-bold mt-1">{{ service.entries().length }}</div>
      </div>
    </div>

    @if (semesters().length > 1) {
      <div class="flex gap-2 mb-4">
        <button
          (click)="selectedSemester.set(null)"
          [class]="'px-3 py-1 rounded-lg text-sm transition ' + (selectedSemester() === null ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')">
          All
        </button>
        @for (sem of semesters(); track sem) {
          <button
            (click)="selectedSemester.set(sem)"
            [class]="'px-3 py-1 rounded-lg text-sm transition ' + (selectedSemester() === sem ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')">
            {{ sem }}
          </button>
        }
      </div>
    }

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="text-left px-4 py-3 font-semibold">Subject</th>
            <th class="text-left px-4 py-3 font-semibold">Semester</th>
            <th class="text-center px-4 py-3 font-semibold">Credit</th>
            <th class="text-center px-4 py-3 font-semibold">Grade</th>
            <th class="text-right px-4 py-3 font-semibold">Weighted</th>
          </tr>
        </thead>
        <tbody>
          @for (entry of filteredEntries(); track entry.id) {
            <tr
              class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
              (click)="editEntry(entry)">
              <td class="px-4 py-3">{{ entry.subject_name }}</td>
              <td class="px-4 py-3 text-slate-500">{{ entry.semester || '—' }}</td>
              <td class="px-4 py-3 text-center">{{ entry.credit }}</td>
              <td class="px-4 py-3 text-center">
                <span [class]="'inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ' + gradeColor(entry.grade)">
                  {{ entry.grade }}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-mono">{{ entry.credit * entry.grade }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-slate-400">No subjects added yet.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" (click)="closeForm()">
        <div class="bg-white rounded-xl p-6 w-[400px] flex flex-col gap-3 shadow-xl" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold">{{ editing() ? 'Edit' : 'Add' }} subject</h3>
          <input [(ngModel)]="form.subject_name" placeholder="Subject name"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input [(ngModel)]="form.semester" placeholder="Semester (e.g. 2024/25/2)"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="text-xs text-slate-500 mb-1 block">Credits</label>
              <input type="number" [(ngModel)]="form.credit" min="1" max="30"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div class="flex-1">
              <label class="text-xs text-slate-500 mb-1 block">Grade (1–5)</label>
              <select [(ngModel)]="form.grade"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option [value]="5">5 — Excellent</option>
                <option [value]="4">4 — Good</option>
                <option [value]="3">3 — Satisfactory</option>
                <option [value]="2">2 — Pass</option>
                <option [value]="1">1 — Fail</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-2">
            @if (editing()) {
              <button (click)="deleteEntry()"
                class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">
                Delete
              </button>
            }
            <button (click)="closeForm()"
              class="px-4 py-2 bg-gray-400 text-white rounded-lg text-sm hover:bg-gray-500 transition">
              Cancel
            </button>
            <button (click)="saveEntry()"
              class="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition">
              {{ editing() ? 'Save' : 'Add' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export default class Grades implements OnInit {
  service = inject(GradesService);

  showForm = signal(false);
  editing = signal<string | null>(null);
  selectedSemester = signal<string | null>(null);

  form: GradeEntry = this.emptyForm();

  semesters = computed(() => {
    const all = this.service.entries().map(e => e.semester).filter(Boolean) as string[];
    return [...new Set(all)].sort();
  });

  filteredEntries = computed(() => {
    const sem = this.selectedSemester();
    if (!sem) return this.service.entries();
    return this.service.entries().filter(e => e.semester === sem);
  });

  totalCredits = computed(() =>
    this.filteredEntries().reduce((sum, e) => sum + e.credit, 0)
  );

  weightedAvg = computed(() => {
    const entries = this.filteredEntries();
    if (entries.length === 0) return '—';
    const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);
    if (totalCredits === 0) return '—';
    const weighted = entries.reduce((sum, e) => sum + e.credit * e.grade, 0);
    return (weighted / totalCredits).toFixed(2);
  });

  ngOnInit() {
    this.service.load();
  }

  gradeColor(grade: number): string {
    const colors: Record<number, string> = {
      5: 'bg-green-500',
      4: 'bg-blue-500',
      3: 'bg-yellow-500',
      2: 'bg-orange-500',
      1: 'bg-red-500',
    };
    return colors[grade] || 'bg-slate-500';
  }

  openForm() {
    this.form = this.emptyForm();
    this.editing.set(null);
    this.showForm.set(true);
  }

  editEntry(entry: GradeEntry) {
    this.form = { ...entry };
    this.editing.set(entry.id!);
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
  }

  async saveEntry() {
    const id = this.editing();
    if (id) {
      const { id: _, user_id, ...rest } = this.form;
      await this.service.update(id, rest);
    } else {
      await this.service.add(this.form);
    }
    this.closeForm();
  }

  async deleteEntry() {
    const id = this.editing();
    if (id) {
      await this.service.remove(id);
      this.closeForm();
    }
  }

  private emptyForm(): GradeEntry {
    return {
      subject_name: '',
      credit: 3,
      grade: 5,
    };
  }
}