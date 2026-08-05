export type Theme = 'light' | 'dark';

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function currentTheme(): Theme {
  const stored = localStorage.getItem('pulse_theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // No explicit choice yet — follow the device. The toggle still wins once used.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme() {
  applyTheme(currentTheme());
  // Track OS theme changes live, but only while the user hasn't chosen manually.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    if (!localStorage.getItem('pulse_theme')) applyTheme(e.matches ? 'dark' : 'light');
  });
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('pulse_theme', next);
  applyTheme(next);
  return next;
}
