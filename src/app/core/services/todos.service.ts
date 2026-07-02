import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type TodoListKind = 'checklist' | 'notes';

export interface TodoList {
  id?: string;
  user_id?: string;
  title: string;
  kind?: TodoListKind;
  created_at?: string;
}

export interface TodoItem {
  id?: string;
  user_id?: string;
  list_id: string;
  content: string;
  done: boolean;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class TodosService {
  private supabase = inject(SupabaseService);
  lists = signal<TodoList[]>([]);
  items = signal<TodoItem[]>([]);
  loading = signal(false);

  async load() {
    this.loading.set(true);
    const [listsRes, itemsRes] = await Promise.all([
      this.supabase.client.from('todo_lists').select('*').order('created_at'),
      this.supabase.client.from('todo_items').select('*').order('created_at'),
    ]);
    if (!listsRes.error && listsRes.data) this.lists.set(listsRes.data);
    else if (listsRes.error) console.error('Failed to load todo lists:', listsRes.error.message);
    if (!itemsRes.error && itemsRes.data) this.items.set(itemsRes.data);
    else if (itemsRes.error) console.error('Failed to load todo items:', itemsRes.error.message);
    this.loading.set(false);
  }

  async addList(title: string, kind: TodoListKind = 'checklist') {
    const { error } = await this.supabase.client
      .from('todo_lists')
      .insert({ title, kind });
    if (!error) await this.load();
    return error;
  }

  async renameList(id: string, title: string) {
    const { error } = await this.supabase.client
      .from('todo_lists')
      .update({ title })
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }

  async removeList(id: string) {
    const { error } = await this.supabase.client
      .from('todo_lists')
      .delete()
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }

  async addItem(listId: string, content: string) {
    const { error } = await this.supabase.client
      .from('todo_items')
      .insert({ list_id: listId, content, done: false });
    if (!error) await this.load();
    return error;
  }

  async toggleItem(item: TodoItem) {
    const done = !item.done;
    // Optimistic update so checking a box feels instant.
    this.items.update(items => items.map(i => i.id === item.id ? { ...i, done } : i));
    const { error } = await this.supabase.client
      .from('todo_items')
      .update({ done })
      .eq('id', item.id!);
    if (error) {
      this.items.update(items => items.map(i => i.id === item.id ? { ...i, done: item.done } : i));
      console.error('Failed to update item:', error.message);
    }
    return error;
  }

  async updateItem(id: string, content: string) {
    const { error } = await this.supabase.client
      .from('todo_items')
      .update({ content })
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }

  async removeItem(id: string) {
    const { error } = await this.supabase.client
      .from('todo_items')
      .delete()
      .eq('id', id);
    if (!error) await this.load();
    return error;
  }

  async clearCompleted(listId: string) {
    const { error } = await this.supabase.client
      .from('todo_items')
      .delete()
      .eq('list_id', listId)
      .eq('done', true);
    if (!error) await this.load();
    return error;
  }
}
