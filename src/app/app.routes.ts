import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login').then(m => m.Login),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'timetable', pathMatch: 'full' },
      {
        path: 'timetable',
        loadComponent: () =>
          import('./features/timetable/timetable.component').then(m => m.TimetableComponent),
      },
      {
        path: 'grades',
        loadComponent: () =>
          import('./features/grades/grades.component').then(m => m.GradesComponent),
      },
      {
        path: 'pomodoro',
        loadComponent: () =>
          import('./features/pomodoro/pomodoro.component').then(m => m.PomodoroComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];