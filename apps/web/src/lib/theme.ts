export type Theme = 'light' | 'dark';

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function currentTheme(): Theme {
  const stored = localStorage.getItem('pulse_theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // Light by default (owner call, Aug 2026) — the toggle wins once used.
  return 'light';
}

export function initTheme() {
  applyTheme(currentTheme());
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('pulse_theme', next);
  applyTheme(next);
  return next;
}
