import { Toggle } from '@/components/Toggle';
import { usePushReminders } from '@/hooks/usePushReminders';
import { vi } from '@/i18n/vi';

const NOTICE = {
  'install-first': vi.resurface.pushInstallFirst,
  unsupported: vi.resurface.pushUnsupported,
  blocked: vi.resurface.pushBlocked,
} as const;

/** Optional daily push (rule 17); explains why when it cannot be offered. */
export function PushSettings() {
  const { availability, subscribed, toggle } = usePushReminders();

  if (availability !== 'available') {
    return <p className="text-xs leading-relaxed text-stone-500">{NOTICE[availability]}</p>;
  }
  return (
    <div className="-mx-4">
      <Toggle
        label={vi.resurface.pushToggle}
        checked={subscribed}
        disabled={toggle.isPending}
        onChange={(on) => toggle.mutate(on)}
      />
      <p className="px-4 text-xs text-stone-500">
        {toggle.isError ? <span className="text-red-600">{vi.resurface.pushError}</span> : vi.resurface.pushHint}
      </p>
    </div>
  );
}
