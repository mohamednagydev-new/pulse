export type Theme = 'light' | 'dark';

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function currentTheme(): Theme {
  return (localStorage.getItem('pulse_theme') as Theme) || 'light';
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
