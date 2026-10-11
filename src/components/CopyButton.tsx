import { useState } from 'react';
import { vi } from '@/i18n/vi';

interface CopyButtonProps {
  value: string;
  label?: string;
}

export function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context); ignore.
    }
  }

  return (
    <button
      onClick={onCopy}
      className="min-h-[44px] shrink-0 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-700 active:bg-slate-200"
    >
      {copied ? vi.common.copied : (label ?? vi.common.copy)}
    </button>
  );
}
