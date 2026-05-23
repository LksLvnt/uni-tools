import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-surface">
      <nav class="w-56 bg-surface-raised border-r border-border flex flex-col p-5 gap-1">
        <span class="font-['Playfair_Display'] text-xl font-bold text-accent tracking-wide mb-8">UniTools</span>
        <a routerLink="timetable" routerLinkActive="!bg-surface-hover !text-accent"
          class="px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition">
          Timetable
        </a>
        <a routerLink="grades" routerLinkActive="!bg-surface-hover !text-accent"
          class="px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition">
          Grades
        </a>
        <a routerLink="pomodoro" routerLinkActive="!bg-surface-hover !text-accent"
          class="px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition">
          Pomodoro
        </a>
        <div class="mt-auto flex flex-col gap-1">
          <button (click)="theme.toggle()"
            class="px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition text-left">
            {{ theme.isDark() ? '☀ Light mode' : '● Dark mode' }}
          </button>
          <button (click)="signOut()"
            class="px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-hover transition text-left">
            Sign out
          </button>
        </div>
      </nav>
      <main class="flex-1 p-8 overflow-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export default class Shell {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  theme = inject(ThemeService);

  signOut() {
    this.supabase.signOut().then(() => this.router.navigate(['/login']));
  }
}