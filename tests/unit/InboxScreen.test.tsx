import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxScreen } from '@/screens/InboxScreen';
import type { Item } from '@/types/item';

const listItems = vi.fn();
vi.mock('@/lib/api', () => ({ api: { listItems: () => listItems() } }));

function renderInbox() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <InboxScreen />
    </QueryClientProvider>,
  );
}

const item: Item = {
  id: 'a',
  url: null,
  url_normalized: null,
  source: 'other',
  channel: 'manual',
  note: 'ghi chú thử',
  title: null,
  summary: null,
  title_origin: null,
  enrich_attempts: 0,
  content_text: null,
  image_path: null,
  preview_image_url: null,
  status: 'ready',
  seen_at: null,
  created_at: new Date().toISOString(),
};

describe('InboxScreen', () => {
  beforeEach(() => listItems.mockReset());

  it('renders the empty state when there are no items', async () => {
    listItems.mockResolvedValue([]);
    renderInbox();
    await waitFor(() =>
      expect(screen.getByText(/Chưa có mục nào/)).toBeInTheDocument(),
    );
  });

  it('renders items when present', async () => {
    listItems.mockResolvedValue([item]);
    renderInbox();
    await waitFor(() =>
      expect(screen.getByText('ghi chú thử')).toBeInTheDocument(),
    );
  });
});
