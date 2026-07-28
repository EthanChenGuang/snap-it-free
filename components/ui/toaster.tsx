'use client';

import { useEffect, useState } from 'react';
import { Toast, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';

type ToastItem = {
  id: string;
  title: string;
};

let dispatchToast: ((title: string) => void) | null = null;

export function toast(title: string) {
  dispatchToast?.(title);
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    dispatchToast = (title: string) => {
      const id = crypto.randomUUID();
      setItems((prev) => [...prev, { id, title }]);
    };
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
          <ToastTitle>{item.title}</ToastTitle>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
