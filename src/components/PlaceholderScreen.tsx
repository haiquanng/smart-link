import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { vi } from '@/i18n/vi';

interface PlaceholderScreenProps {
  title: string;
  message: string;
}

export function PlaceholderScreen({ title, message }: PlaceholderScreenProps) {
  return (
    <section>
      <ScreenHeader title={title} />
      <EmptyState
        title={vi.common.comingSoon}
        message={message}
        illustration="comingSoon"
      />
    </section>
  );
}
