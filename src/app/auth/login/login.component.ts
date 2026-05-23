import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-wrapper">
      <h1>UniTools</h1>
      <div class="form">
        <input type="email" [(ngModel)]="email" placeholder="Email" />
        <input type="password" [(ngModel)]="password" placeholder="Password" />
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button (click)="signIn()" [disabled]="loading()">
          {{ loading() ? 'Loading...' : 'Sign in' }}
        </button>
        <button (click)="signUp()" [disabled]="loading()" class="secondary">
          Create account
        </button>
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