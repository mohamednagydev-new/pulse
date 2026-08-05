import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './index.css';
import { initTheme } from './lib/theme';
import { toast } from './lib/toast';

initTheme();

const queryClient = new QueryClient({
  // Any failed mutation surfaces a toast automatically.
  mutationCache: new MutationCache({
    onError: (e) => toast(e instanceof Error ? e.message : 'Something went wrong', 'error'),
  }),
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
