import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TodoItem, TodoList, TodoListKind, TodosService } from '../../core/services/todos.service';

@Component({
  selector: 'app-todos',
  imports: [FormsModule],
  template: `
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3" style="animation: fadeUp 0.4s ease both">
      <h2 class="font-['Playfair_Display'] text-2xl font-bold">Todos</h2>
      <form (submit)="addList($event)" class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <input [(ngModel)]="newListTitle" name="newListTitle" placeholder="New list name..."
          class="flex-1 sm:w-52 px-3 py-2 bg-surface-raised border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
        <div class="flex gap-2">
          <div class="flex rounded-lg border border-border overflow-hidden">
            <button type="button" (click)="newListKind.set('checklist')"
              [class]="'px-3 py-2 text-sm transition-all ' + (newListKind() === 'checklist' ? 'bg-accent text-surface' : 'bg-surface-raised text-text-muted hover:text-text')">
              Checklist
            </button>
            <button type="button" (click)="newListKind.set('notes')"
              [class]="'px-3 py-2 text-sm transition-all ' + (newListKind() === 'notes' ? 'bg-accent text-surface' : 'bg-surface-raised text-text-muted hover:text-text')">
              Notes
            </button>
          </div>
          <button type="submit"
            class="px-4 py-2 bg-accent text-surface rounded-lg text-sm font-semibold hover:bg-accent-hover active:scale-[0.97] transition-all">
            + Add
          </button>
        </div>
      </form>
    </div>

    @if (errorMsg()) {
      <div class="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-3" style="animation: fadeUp 0.3s ease both">
        <span>{{ errorMsg() }}</span>
        <button (click)="errorMsg.set('')" class="text-danger hover:opacity-70 text-lg leading-none">&times;</button>
      </div>
    }

    @if (service.loading()) {
      <div class="flex items-center justify-center py-20 text-text-muted text-sm" style="animation: fadeIn 0.3s ease both">
        Loading todos...
      </div>
    } @else if (service.lists().length === 0) {
      <div class="text-center text-text-muted py-16" style="animation: fadeIn 0.3s ease both">
        <p class="mb-1">No lists yet.</p>
        <p class="text-sm">Create a checklist for things to tick off, or a notes list for general stuff.</p>
      </div>
    } @else {
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start" style="animation: fadeUp 0.5s ease 0.05s both">
        @for (list of service.lists(); track list.id) {
          <div class="bg-surface-raised rounded-xl border border-border p-4 flex flex-col gap-2 hover:border-accent/30 transition-all">
            <div class="flex items-center justify-between gap-2 mb-1">
              @if (renamingId() === list.id) {
                <input [(ngModel)]="renameTitle" (keydown.enter)="saveRename(list)" (keydown.escape)="renamingId.set(null)" (blur)="saveRename(list)" autofocus
                  class="flex-1 px-2 py-1 bg-surface border border-border rounded-lg text-sm font-semibold text-text focus:outline-none focus:border-accent transition" />
              } @else {
                <button (click)="startRename(list)" class="flex items-center gap-2 min-w-0 text-left hover:text-accent transition" title="Rename list">
                  <span class="font-semibold truncate">{{ list.title }}</span>
                  @if (isNotes(list)) {
                    <span class="text-[10px] uppercase tracking-wider text-text-muted border border-border rounded px-1.5 py-0.5 shrink-0">notes</span>
                  }
                </button>
              }
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-xs text-text-muted font-mono">
                  @if (isNotes(list)) {
                    {{ itemsFor(list.id!).length }}
                  } @else {
                    {{ doneCount(list.id!) }}/{{ itemsFor(list.id!).length }}
                  }
                </span>
                <button (click)="deleteList(list.id!)"
                  [class]="'text-xs transition ' + (confirmDeleteId() === list.id ? 'text-danger font-semibold' : 'text-text-muted hover:text-danger')">
                  {{ confirmDeleteId() === list.id ? 'Sure?' : 'Delete' }}
                </button>
              </div>
            </div>

            @for (item of itemsFor(list.id!); track item.id) {
              @if (editingItemId() === item.id) {
                @if (isNotes(list)) {
                  <textarea [(ngModel)]="editingContent" rows="3" autofocus
                    (keydown.control.enter)="saveEditItem()" (keydown.escape)="cancelEditItem()" (blur)="saveEditItem()"
                    class="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-sm text-text focus:outline-none transition resize-y"></textarea>
                } @else {
                  <input [(ngModel)]="editingContent" autofocus
                    (keydown.enter)="saveEditItem()" (keydown.escape)="cancelEditItem()" (blur)="saveEditItem()"
                    class="w-full px-3 py-1.5 bg-surface border border-accent rounded-lg text-sm text-text focus:outline-none transition" />
                }
              } @else if (isNotes(list)) {
                <div class="group flex items-start gap-2 px-3 py-2 rounded-lg bg-surface border border-border/60 hover:border-accent/30 transition">
                  <button (click)="startEditItem(item)" class="flex-1 min-w-0 text-left cursor-text" title="Edit note">
                    <span class="text-sm text-text whitespace-pre-wrap break-words block">{{ item.content }}</span>
                  </button>
                  <button (click)="service.removeItem(item.id!)"
                    class="text-text-muted hover:text-danger transition text-lg leading-none px-1 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Delete note">&times;</button>
                </div>
              } @else {
                <div class="group flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition">
                  <input type="checkbox" [checked]="item.done" (change)="service.toggleItem(item)"
                    class="w-4 h-4 shrink-0 accent-[var(--accent)] cursor-pointer" />
                  <button (click)="startEditItem(item)" class="flex-1 min-w-0 text-left cursor-text" title="Edit task">
                    <span [class]="'text-sm break-words block ' + (item.done ? 'line-through text-text-muted' : 'text-text')">
                      {{ item.content }}
                    </span>
                  </button>
                  <button (click)="service.removeItem(item.id!)"
                    class="text-text-muted hover:text-danger transition text-lg leading-none px-1 sm:opacity-0 sm:group-hover:opacity-100"
                    title="Delete task">&times;</button>
                </div>
              }
            } @empty {
              <p class="text-sm text-text-muted px-2 py-1.5">Nothing here yet.</p>
            }

            @if (isNotes(list)) {
              <form (submit)="addItem($event, list.id!)" class="flex flex-col gap-2 mt-1">
                <textarea [(ngModel)]="newItemContent[list.id!]" [name]="'newItem-' + list.id" rows="2"
                  placeholder="Write a note... (Ctrl+Enter to save)"
                  (keydown.control.enter)="addItem($event, list.id!)"
                  class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition resize-y"></textarea>
                <button type="submit"
                  class="self-end px-3 py-1.5 bg-surface border border-border text-text-muted rounded-lg text-sm hover:text-text hover:border-accent/40 active:scale-[0.97] transition-all">
                  Add note
                </button>
              </form>
            } @else {
              <form (submit)="addItem($event, list.id!)" class="flex gap-2 mt-1">
                <input [(ngModel)]="newItemContent[list.id!]" [name]="'newItem-' + list.id" placeholder="Add a task..."
                  class="flex-1 px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
                <button type="submit"
                  class="px-3 py-1.5 bg-surface border border-border text-text-muted rounded-lg text-sm hover:text-text hover:border-accent/40 active:scale-[0.97] transition-all">
                  Add
                </button>
              </form>
              @if (doneCount(list.id!) > 0) {
                <button (click)="service.clearCompleted(list.id!)"
                  class="text-xs text-text-muted hover:text-text transition text-left px-2">
                  Clear completed
                </button>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export default class Todos implements OnInit {
  service = inject(TodosService);

  newListTitle = '';
  newListKind = signal<TodoListKind>('checklist');
  newItemContent: Record<string, string> = {};
  renamingId = signal<string | null>(null);
  renameTitle = '';
  confirmDeleteId = signal<string | null>(null);
  editingItemId = signal<string | null>(null);
  editingContent = '';
  errorMsg = signal('');

  private editingOriginal = '';

  private itemsByList = computed(() => {
    const map = new Map<string, TodoItem[]>();
    for (const item of this.service.items()) {
      const bucket = map.get(item.list_id);
      if (bucket) bucket.push(item);
      else map.set(item.list_id, [item]);
    }
    return map;
  });

  ngOnInit() {
    this.service.load();
  }

  isNotes(list: TodoList): boolean {
    return list.kind === 'notes';
  }

  itemsFor(listId: string): TodoItem[] {
    return this.itemsByList().get(listId) ?? [];
  }

  doneCount(listId: string): number {
    return this.itemsFor(listId).filter(i => i.done).length;
  }

  async addList(event: Event) {
    event.preventDefault();
    const title = this.newListTitle.trim();
    if (!title) return;
    const error = await this.service.addList(title, this.newListKind());
    if (error) {
      this.showError(error.message);
      return;
    }
    this.newListTitle = '';
  }

  async addItem(event: Event, listId: string) {
    event.preventDefault();
    const content = (this.newItemContent[listId] || '').trim();
    if (!content) return;
    const error = await this.service.addItem(listId, content);
    if (error) {
      this.showError(error.message);
      return;
    }
    this.newItemContent[listId] = '';
  }

  startEditItem(item: TodoItem) {
    this.editingContent = item.content;
    this.editingOriginal = item.content;
    this.editingItemId.set(item.id!);
  }

  cancelEditItem() {
    this.editingItemId.set(null);
  }

  async saveEditItem() {
    const id = this.editingItemId();
    if (!id) return;
    this.editingItemId.set(null);
    const content = this.editingContent.trim();
    if (!content || content === this.editingOriginal) return;
    const error = await this.service.updateItem(id, content);
    if (error) this.showError(error.message);
  }

  startRename(list: TodoList) {
    this.renameTitle = list.title;
    this.renamingId.set(list.id!);
  }

  async saveRename(list: TodoList) {
    const id = this.renamingId();
    if (!id) return;
    this.renamingId.set(null);
    const title = this.renameTitle.trim();
    if (title && title !== list.title) {
      const error = await this.service.renameList(id, title);
      if (error) this.showError(error.message);
    }
  }

  async deleteList(id: string) {
    if (this.confirmDeleteId() !== id) {
      this.confirmDeleteId.set(id);
      setTimeout(() => {
        if (this.confirmDeleteId() === id) this.confirmDeleteId.set(null);
      }, 3000);
      return;
    }
    this.confirmDeleteId.set(null);
    const error = await this.service.removeList(id);
    if (error) this.showError(error.message);
  }

  private showError(detail: string) {
    const hint = /column .* does not exist|kind/i.test(detail)
      ? ' — the database is missing the "kind" column, run the migration from the README.'
      : '';
    this.errorMsg.set(`Something went wrong: ${detail}${hint}`);
  }
}
