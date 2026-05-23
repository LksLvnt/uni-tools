import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <nav class="sidebar">
        <span class="logo">UniTools</span>
        <a routerLink="timetable" routerLinkActive="active">Timetable</a>
        <a routerLink="grades" routerLinkActive="active">Grades</a>
        <a routerLink="pomodoro" routerLinkActive="active">Pomodoro</a>
        <button (click)="signOut()">Sign out</button>
      </nav>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  signOut() {
    this.supabase.signOut().then(() => this.router.navigate(['/login']));
  }
}