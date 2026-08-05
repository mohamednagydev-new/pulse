import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info';
interface Toast { id: number; msg: string; type: ToastType }
interface ToastState {
  toasts: Toast[];
  push: (msg: string, type?: ToastType) => void;
  remove: (id: number) => void;
}

let counter = 0;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (msg, type = 'info') => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (msg: string, type?: ToastType) => useToasts.getState().push(msg, type);
