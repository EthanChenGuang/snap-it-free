'use client';

import { useEffect, useState } from 'react';
import { Toast, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';

type ToastItem = {
  id: string;
  title: string;
  testId?: string;
};

let dispatchToast: ((title: string, testId?: string) => void) | null = null;
const queued: Array<{ title: string; testId?: string }> = [];

export function toast(title: string, testId?: string) {
  if (dispatchToast) dispatchToast(title, testId);
  else queued.push({ title, testId });
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    dispatchToast = (title: string, testId?: string) => {
      const id = crypto.randomUUID();
      setItems((prev) => [...prev, { id, title, testId }]);
    };
    queued.splice(0).forEach((item) => dispatchToast?.(item.title, item.testId));
    return () => {
      dispatchToast = null;
    };
  }, []);

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <ToastProvider swipeDirection="up" duration={2500}>
      {items.map((item) => (
        <Toast key={item.id} open onOpenChange={(open) => !open && dismiss(item.id)}>
          <ToastTitle data-testid={item.testId}>{item.title}</ToastTitle>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
