import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center px-4">
      <div class="w-full max-w-[380px] flex flex-col items-center gap-8" style="animation: fadeUp 0.5s ease both">
        <div class="text-center">
          <h1 class="font-['Playfair_Display'] text-4xl md:text-5xl font-bold text-accent tracking-wide">UniTools</h1>
          <p class="text-text-muted text-sm mt-2">Student productivity suite</p>
        </div>
        <div class="w-full flex flex-col gap-3">
          <input type="email" [(ngModel)]="email" placeholder="Email"
            class="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          <input type="password" [(ngModel)]="password" placeholder="Password"
            class="w-full px-4 py-3 bg-surface-raised border border-border rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition" />
          @if (!resetMode()) {
            <button (click)="resetMode.set(true)" type="button"
              class="text-xs text-accent hover:text-accent-hover transition self-end -mt-1">
              Forgot password?
            </button>
          }
          @if (error()) {
            <p class="text-red-500 text-sm text-center" style="animation: fadeUp 0.3s ease both">
              {{ error() }}
            </p>
          }

          @if (resetSent()) {
            <p class="text-accent text-sm text-center" style="animation: fadeUp 0.3s ease both">
              Check your email for a reset link.
            </p>
          }

          @if (!resetMode()) {
            <button (click)="signIn()" [disabled]="loading()"
              class="w-full py-3 bg-accent text-surface font-semibold rounded-lg text-sm hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50">
              {{ loading() ? 'Loading...' : 'Sign in' }}
            </button>
            <button (click)="signUp()" [disabled]="loading()"
              class="w-full py-3 bg-surface-raised border border-border text-text-muted rounded-lg text-sm hover:text-text hover:border-accent/40 active:scale-[0.98] transition-all disabled:opacity-50">
              Create account
            </button>
          } @else {
            <button (click)="resetPassword()" [disabled]="loading()"
              class="w-full py-3 bg-accent text-surface font-semibold rounded-lg text-sm hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50">
              {{ loading() ? 'Sending...' : 'Send reset link' }}
            </button>
            <button (click)="resetMode.set(false); resetSent.set(false)"
              class="w-full py-3 bg-surface-raised border border-border text-text-muted rounded-lg text-sm hover:text-text hover:border-accent/40 active:scale-[0.98] transition-all">
              Back to login
            </button>
          }
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
  resetMode = signal(false);
  resetSent = signal(false);

  async resetPassword() {
    if (!this.email.trim()) {
      this.error.set('Enter your email first.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { error } = await this.supabase.resetPassword(this.email);
    this.loading.set(false);
    if (error) {
      this.error.set(error.message);
    } else {
      this.resetSent.set(true);
    }
  }

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