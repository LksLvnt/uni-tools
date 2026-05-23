import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center">
      <div class="w-[380px] flex flex-col items-center gap-8">
        <div class="text-center">
          <h1 class="font-['Playfair_Display'] text-4xl font-bold text-accent tracking-wide">UniTools</h1>
          <p class="text-text-muted text-sm mt-2">Student productivity suite</p>
        </div>
        <div class="w-full flex flex-col gap-3">
          <input type="email" [(ngModel)]="email" placeholder="Email"
            class="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          <input type="password" [(ngModel)]="password" placeholder="Password"
            class="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          @if (error()) {
            <p class="text-danger text-sm">{{ error() }}</p>
          }
          <button (click)="signIn()" [disabled]="loading()"
            class="w-full py-3 bg-accent text-surface font-semibold rounded-lg text-sm hover:bg-accent-hover transition disabled:opacity-50">
            {{ loading() ? 'Loading...' : 'Sign in' }}
          </button>
          <button (click)="signUp()" [disabled]="loading()"
            class="w-full py-3 bg-surface-raised border border-border text-text-muted rounded-lg text-sm hover:text-text hover:border-accent/40 transition disabled:opacity-50">
            Create account
          </button>
        </div>
      </div>
    </div>
  `,
})
export default class Login {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  async signIn() {
    this.loading.set(true);
    this.error.set('');
    const { error } = await this.supabase.signInWithEmail(this.email, this.password);
    this.loading.set(false);
    if (error) {
      this.error.set(error.message);
    } else {
      this.router.navigate(['/']);
    }
  }

  async signUp() {
    this.loading.set(true);
    this.error.set('');
    const { error } = await this.supabase.signUp(this.email, this.password);
    this.loading.set(false);
    if (error) {
      this.error.set(error.message);
    } else {
      this.error.set('Check your email to confirm your account.');
    }
  }
}