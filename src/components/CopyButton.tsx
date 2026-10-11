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
      className="min-h-[44px] shrink-0 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink hover:bg-stone-50"
    >
      {copied ? vi.common.copied : (label ?? vi.common.copy)}
    </button>
  );
}
