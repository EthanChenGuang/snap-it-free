'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isStandalonePwa, setIosPushDismissed } from '@/lib/pwa/ios-detect';
import { useMessages } from '@/lib/i18n/useMessages';

type IosInstallGuideProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss?: () => void;
  onInstalled?: () => void;
};

export function IosInstallGuide({ open, onOpenChange, onDismiss, onInstalled }: IosInstallGuideProps) {
  const { messages } = useMessages();
  const steps = [
    { icon: 'ios_share', text: messages.pwa.install.step1 },
    { icon: 'add_box', text: messages.pwa.install.step2 },
    { icon: 'home_app_logo', text: messages.pwa.install.step3 },
  ] as const;

  const handleDismiss = () => {
    setIosPushDismissed();
    onDismiss?.();
    onOpenChange(false);
  };

  const handleInstalled = () => {
    if (isStandalonePwa()) {
      onInstalled?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{messages.pwa.install.title}</DialogTitle>
          <DialogDescription>{messages.pwa.install.description}</DialogDescription>
        </DialogHeader>

        <ol className="mt-space-md space-y-space-md">
          {steps.map((step, index) => (
            <li
              key={step.icon}
              className="flex gap-space-md rounded border border-outline-variant bg-surface-container-lowest p-space-md"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-label-md font-semibold text-on-surface"
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 items-start gap-space-sm">
                <span className="material-symbols-outlined shrink-0 text-on-surface" aria-hidden>
                  {step.icon}
                </span>
                <p className="text-body-md text-on-surface">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-space-lg flex flex-col gap-space-sm">
          <Button type="button" onClick={handleInstalled}>
            {messages.pwa.install.confirmInstalled}
          </Button>
          <Button type="button" variant="secondary" onClick={handleDismiss}>
            {messages.pwa.install.continueWithoutPush}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
