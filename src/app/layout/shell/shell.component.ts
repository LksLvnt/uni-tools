import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen">
      <nav class="w-56 bg-slate-900 text-white flex flex-col p-4 gap-2">
        <span class="text-xl font-bold mb-6">UniTools</span>
        <a routerLink="timetable" routerLinkActive="bg-slate-700"
          class="px-3 py-2 rounded-lg text-sm hover:bg-slate-800 transition">Timetable</a>
        <a routerLink="grades" routerLinkActive="bg-slate-700"
          class="px-3 py-2 rounded-lg text-sm hover:bg-slate-800 transition">Grades</a>
        <a routerLink="pomodoro" routerLinkActive="bg-slate-700"
          class="px-3 py-2 rounded-lg text-sm hover:bg-slate-800 transition">Pomodoro</a>
        <button (click)="signOut()"
          class="mt-auto px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition">
          Sign out
        </button>
      </nav>
      <main class="flex-1 p-8 overflow-auto bg-slate-50">
        <router-outlet />
      </main>
    </div>
  `,
})
export default class Shell {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  signOut() {
    this.supabase.signOut().then(() => this.router.navigate(['/login']));
  }
}