import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex flex-col md:flex-row h-[100dvh] bg-surface">
      <!-- Desktop sidebar -->
      <nav class="hidden md:flex w-56 bg-surface-raised border-r border-border flex-col p-5 gap-1">
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

      <!-- Mobile header -->
      <div class="flex md:hidden items-center justify-between px-4 py-3 bg-surface-raised border-b border-border">
        <span class="font-['Playfair_Display'] text-lg font-bold text-accent">UniTools</span>
        <div class="flex items-center gap-3">
          <button (click)="theme.toggle()" class="text-text-muted text-sm">
            {{ theme.isDark() ? '☀' : '●' }}
          </button>
          <button (click)="signOut()" class="text-text-muted text-xs">Sign out</button>
        </div>
      </div>

      <!-- Main content -->
      <main class="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
        <router-outlet />
      </main>

      <!-- Mobile bottom nav -->
      <nav class="flex md:hidden fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-border z-40">
        <a routerLink="timetable" routerLinkActive="!text-accent"
          class="flex-1 flex flex-col items-center py-3 text-text-muted text-xs gap-1 active:scale-95 transition-transform">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/>
          </svg>
          <span>Timetable</span>
        </a>
        <a routerLink="grades" routerLinkActive="!text-accent"
          class="flex-1 flex flex-col items-center py-3 text-text-muted text-xs gap-1 active:scale-95 transition-transform">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"/>
          </svg>
          <span>Grades</span>
        </a>
        <a routerLink="pomodoro" routerLinkActive="!text-accent"
          class="flex-1 flex flex-col items-center py-3 text-text-muted text-xs gap-1 active:scale-95 transition-transform">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
          <span>Pomodoro</span>
        </a>
      </nav>
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