import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimetableEntry, TimetableService } from '../../core/services/timetable.service';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

@Component({
  selector: 'app-timetable',
  imports: [FormsModule],
  template: `
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold">Timetable</h2>
      <div class="flex gap-2">
        <button
          (click)="openForm()"
          class="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600 transition">
          + Add class
        </button>
        <label class="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm cursor-pointer hover:bg-slate-600 transition">
          Import .ics
          <input type="file" accept=".ics" (change)="onFileImport($event)" hidden />
        </label>
      </div>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50" (click)="closeForm()">
        <div class="bg-white rounded-xl p-6 w-[400px] flex flex-col gap-3 shadow-xl" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold">{{ editing() ? 'Edit' : 'Add' }} class</h3>
          <input [(ngModel)]="form.subject_name" placeholder="Subject name"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input [(ngModel)]="form.neptun_code" placeholder="Neptun code (optional)"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <select [(ngModel)]="form.day_of_week"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            @for (day of days; track day; let i = $index) {
              <option [value]="i + 1">{{ day }}</option>
            }
          </select>
          <div class="flex items-center gap-2">
            <input type="time" [(ngModel)]="form.start_time"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1" />
            <span class="text-sm text-gray-500">to</span>
            <input type="time" [(ngModel)]="form.end_time"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1" />
          </div>
          <input [(ngModel)]="form.room" placeholder="Room (optional)"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input [(ngModel)]="form.instructor" placeholder="Instructor (optional)"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <div class="flex items-center gap-2">
            <label class="text-sm">Color</label>
            <input type="color" [(ngModel)]="form.color" class="w-10 h-8 cursor-pointer" />
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

    <div class="flex border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div class="w-16 shrink-0">
        <div class="h-10 border-b border-slate-200"></div>
        @for (hour of hours; track hour) {
          <div class="h-[60px] flex items-start justify-center text-xs text-slate-400 pt-0.5 border-b border-slate-50">
            {{ hour }}:00
          </div>
        }
      </div>
      @for (day of days; track day; let d = $index) {
        <div class="flex-1 min-w-0 border-l border-slate-200">
          <div class="h-10 flex items-center justify-center font-semibold text-sm border-b border-slate-200 bg-slate-50">
            {{ day }}
          </div>
          <div class="relative" [style.height.px]="14 * 60">
            @for (hour of hours; track hour) {
              <div class="h-[60px] border-b border-slate-50"></div>
            }
            @for (entry of entriesForDay(d + 1); track entry.id) {
              <div
                class="absolute left-0.5 right-0.5 rounded px-1.5 py-1 text-white text-xs cursor-pointer flex flex-col gap-px overflow-hidden hover:opacity-85 transition-opacity"
                [style.top.px]="entryTop(entry)"
                [style.height.px]="entryHeight(entry)"
                [style.background]="entry.color"
                (click)="editEntry(entry)">
                <strong class="truncate">{{ entry.subject_name }}</strong>
                <span>{{ entry.start_time }} - {{ entry.end_time }}</span>
                @if (entry.room) {
                  <span class="truncate opacity-80">{{ entry.room }}</span>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export default class Timetable implements OnInit {
  private service = inject(TimetableService);

  days = DAYS;
  hours = HOURS;
  showForm = signal(false);
  editing = signal<string | null>(null);

  form: TimetableEntry = this.emptyForm();

  ngOnInit() {
    this.service.load();
  }

  entriesForDay(day: number) {
    return this.service.entries().filter(e => e.day_of_week === day);
  }

  entryTop(entry: TimetableEntry): number {
    const [h, m] = entry.start_time.split(':').map(Number);
    return (h - 7) * 60 + m;
  }

  entryHeight(entry: TimetableEntry): number {
    const [sh, sm] = entry.start_time.split(':').map(Number);
    const [eh, em] = entry.end_time.split(':').map(Number);
    return Math.max((eh - sh) * 60 + (em - sm), 30);
  }

  openForm() {
    this.form = this.emptyForm();
    this.editing.set(null);
    this.showForm.set(true);
  }

  editEntry(entry: TimetableEntry) {
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

  async onFileImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const entries = this.service.parseIcs(text);
    for (const entry of entries) {
      await this.service.add(entry);
    }
  }

  private emptyForm(): TimetableEntry {
    return {
      subject_name: '',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '09:30',
      color: '#6366f1',
    };
  }
}