import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component'),
    canActivate: [noAuthGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component'),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'timetable', pathMatch: 'full' },
      {
        path: 'timetable',
        loadComponent: () => import('./features/timetable/timetable.component'),
      },
      {
        path: 'grades',
        loadComponent: () => import('./features/grades/grades.component'),
      },
      {
        path: 'pomodoro',
        loadComponent: () => import('./features/pomodoro/pomodoro.component'),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];