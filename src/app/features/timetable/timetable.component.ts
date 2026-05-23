import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimetableEntry, TimetableService } from '../../core/services/timetable.service';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

@Component({
  selector: 'app-timetable',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3" style="animation: fadeUp 0.4s ease both">
      <h2 class="font-['Playfair_Display'] text-2xl font-bold">Timetable</h2>
      <div class="flex gap-2">
        <button (click)="openForm()"
          class="px-4 py-2 bg-accent text-surface rounded-lg text-sm font-semibold hover:bg-accent-hover active:scale-[0.97] transition-all">
          + Add class
        </button>
        <label class="px-4 py-2 bg-surface-raised border border-border text-text-muted rounded-lg text-sm cursor-pointer hover:text-text hover:border-accent/40 active:scale-[0.97] transition-all">
          Import .ics
          <input type="file" accept=".ics" (change)="onFileImport($event)" hidden />
        </label>
      </div>
    </div>

    @if (showForm()) {
      <div class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
        style="animation: fadeIn 0.2s ease both"
        (click)="closeForm()">
        <div class="bg-surface-raised border border-border rounded-t-2xl sm:rounded-xl p-6 w-full sm:w-[400px] flex flex-col gap-3 shadow-2xl max-h-[85vh] overflow-y-auto"
          style="animation: fadeUp 0.3s ease both"
          (click)="$event.stopPropagation()">
          <h3 class="font-['Playfair_Display'] text-lg font-semibold">{{ editing() ? 'Edit' : 'Add' }} class</h3>
          <input [(ngModel)]="form.subject_name" placeholder="Subject name"
            class="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          <input [(ngModel)]="form.neptun_code" placeholder="Neptun code (optional)"
            class="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          <select [(ngModel)]="form.day_of_week"
            class="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text focus:outline-none focus:border-accent transition">
            @for (day of days; track day; let i = $index) {
              <option [value]="i + 1">{{ day }}</option>
            }
          </select>
          <div class="flex items-center gap-2">
            <input type="time" [(ngModel)]="form.start_time"
              class="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text flex-1 focus:outline-none focus:border-accent transition" />
            <span class="text-sm text-text-muted">to</span>
            <input type="time" [(ngModel)]="form.end_time"
              class="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text flex-1 focus:outline-none focus:border-accent transition" />
          </div>
          <input [(ngModel)]="form.room" placeholder="Room (optional)"
            class="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          <input [(ngModel)]="form.instructor" placeholder="Instructor (optional)"
            class="px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          <div class="flex items-center gap-2">
            <label class="text-sm text-text-muted">Color</label>
            <input type="color" [(ngModel)]="form.color" class="w-10 h-8 cursor-pointer bg-transparent border-0" />
          </div>
          <div class="flex justify-end gap-2 mt-2">
            @if (editing()) {
              <button (click)="deleteEntry()"
                class="px-4 py-2 bg-danger text-white rounded-lg text-sm hover:opacity-80 active:scale-[0.97] transition-all">
                Delete
              </button>
            }
            <button (click)="closeForm()"
              class="px-4 py-2 bg-surface border border-border text-text-muted rounded-lg text-sm hover:text-text transition">
              Cancel
            </button>
            <button (click)="saveEntry()"
              class="px-4 py-2 bg-accent text-surface rounded-lg text-sm font-semibold hover:bg-accent-hover active:scale-[0.97] transition-all">
              {{ editing() ? 'Save' : 'Add' }}
            </button>
          </div>
        </div>
      </div>
    }

    <div class="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0" style="animation: fadeUp 0.5s ease 0.1s both">
      <div class="flex border border-border rounded-xl overflow-hidden bg-surface-raised min-w-[600px]">
        <div class="w-12 md:w-16 shrink-0">
          <div class="h-10 border-b border-border"></div>
          @for (hour of hours; track hour) {
            <div class="h-[60px] flex items-start justify-center text-[10px] md:text-xs text-text-muted pt-0.5 border-b border-border/50">
              {{ hour }}:00
            </div>
          }
        </div>
        @for (day of days; track day; let d = $index) {
          <div class="flex-1 min-w-0 border-l border-border">
            <div class="h-10 flex items-center justify-center font-semibold text-xs md:text-sm border-b border-border text-text-muted bg-surface">
              <span class="hidden md:inline">{{ day }}</span>
              <span class="md:hidden">{{ shortDays[d] }}</span>
            </div>
            <div class="relative" [style.height.px]="14 * 60">
              @for (hour of hours; track hour) {
                <div class="h-[60px] border-b border-border/30"></div>
              }
              @for (entry of entriesForDay(d + 1); track entry.id) {
                <div
                  class="absolute left-0.5 right-0.5 rounded-md px-1 md:px-1.5 py-0.5 md:py-1 text-white text-[10px] md:text-xs cursor-pointer flex flex-col gap-px overflow-hidden hover:opacity-85 active:scale-[0.98] transition-all shadow-lg"
                  [style.top.px]="entryTop(entry)"
                  [style.height.px]="entryHeight(entry)"
                  [style.background]="entry.color"
                  (click)="editEntry(entry)">
                  <strong class="truncate">{{ entry.subject_name }}</strong>
                  <span class="hidden md:inline">{{ entry.start_time }} - {{ entry.end_time }}</span>
                  @if (entry.room) {
                    <span class="truncate opacity-80 hidden md:inline">{{ entry.room }}</span>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export default class Timetable implements OnInit {
  private service = inject(TimetableService);

  days = DAYS;
  shortDays = SHORT_DAYS;
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