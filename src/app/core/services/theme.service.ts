import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      this.isDark.set(false);
      document.documentElement.classList.add('light');
    }
  }

  toggle() {
    const dark = !this.isDark();
    this.isDark.set(dark);
    if (dark) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }
}