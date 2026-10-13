import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ItemCard } from '@/components/ItemCard';
import type { Item } from '@/types/item';

const base: Item = {
  id: '1',
  url: 'https://www.facebook.com/share/abc',
  url_normalized: 'https://www.facebook.com/share/abc',
  source: 'facebook',
  channel: 'shortcut',
  note: 'cách định giá SaaS',
  title: 'A Facebook post',
  summary: null,
  title_origin: null,
  enrich_attempts: 0,
  content_text: null,
  image_path: null,
  preview_image_url: null,
  status: 'pending',
  seen_at: null,
  created_at: new Date().toISOString(),
};

// The edit sheet uses React Query; tags are only fetched once it opens.
function withQuery(ui: ReactElement) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

describe('ItemCard', () => {
  it('shows the user note as the primary line (business rule 14)', () => {
    render(<ItemCard item={base} />);
    expect(screen.getByText('cách định giá SaaS')).toBeInTheDocument();
    expect(screen.getByText('A Facebook post')).toBeInTheDocument();
  });

  it('falls back to a placeholder when there is no note/title/summary', () => {
    render(<ItemCard item={{ ...base, note: null, title: null }} />);
    expect(screen.getByText('(không có ghi chú)')).toBeInTheDocument();
  });

  it('marks pending status', () => {
    render(<ItemCard item={base} />);
    expect(screen.getByText(/đang xử lý/)).toBeInTheDocument();
  });

  it('prefers the signed screenshot URL over the preview image', () => {
    const { container } = render(
      <ItemCard
        item={{ ...base, preview_image_url: 'https://cdn.example/p.jpg' }}
        imageUrl="https://signed.example/s.jpg"
      />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://signed.example/s.jpg',
    );
  });

  it('falls back to the preview image without a signed URL', () => {
    const { container } = render(
      <ItemCard item={{ ...base, preview_image_url: 'https://cdn.example/p.jpg' }} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/p.jpg',
    );
  });

  it('deletes from the edit sheet after a confirm, and cancel keeps the item', () => {
    const onDelete = vi.fn();
    render(withQuery(<ItemCard item={base} onDelete={onDelete} />));

    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }));
    const confirm = screen.getByRole('alertdialog');
    expect(confirm).toHaveTextContent('Xoá mục này?');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Huỷ' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xoá' }),
    );
    expect(onDelete).toHaveBeenCalledWith(base);
  });

  it('opens the edit sheet with the saved note and title', () => {
    render(withQuery(<ItemCard item={base} onDelete={vi.fn()} />));
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByLabelText('Ghi chú')).toHaveValue('cách định giá SaaS');
    expect(within(sheet).getByLabelText(/Tiêu đề/)).toHaveValue('A Facebook post');
  });

  it('offers a retry on a failed item in owner views only', () => {
    const failed = { ...base, status: 'enrich_failed' as const };
    const { unmount } = render(withQuery(<ItemCard item={failed} canOrganize onDelete={vi.fn()} />));
    expect(screen.getByText(/chưa xử lý được/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xử lý lại' })).toBeInTheDocument();
    unmount();

    render(<ItemCard item={failed} />);
    expect(screen.queryByRole('button', { name: 'Xử lý lại' })).not.toBeInTheDocument();
  });

  it('clamps long notes so cards keep the same height', () => {
    render(<ItemCard item={{ ...base, note: 'dài '.repeat(200) }} />);
    expect(screen.getByTitle(/^dài/)).toHaveClass('line-clamp-2');
  });

  it('marks an AI-made title when there is no note', () => {
    render(
      <ItemCard
        item={{ ...base, note: null, title: 'Tiêu đề AI', title_origin: 'ai' }}
      />,
    );
    expect(screen.getByLabelText('Tạo bởi AI')).toBeInTheDocument();
  });

  it('does not mark scraped titles or note-led cards', () => {
    render(<ItemCard item={{ ...base, title_origin: 'ai' }} />);
    expect(screen.queryByLabelText('Tạo bởi AI')).not.toBeInTheDocument();
  });

  it('shows the summary as the secondary line when there is no title', () => {
    render(
      <ItemCard item={{ ...base, title: null, summary: 'Tóm tắt ngắn.' }} />,
    );
    expect(screen.getByText('Tóm tắt ngắn.')).toHaveClass('line-clamp-1');
  });
  it('shows the summary under an AI title when there is no note', () => {
    render(
      <ItemCard
        item={{
          ...base,
          note: null,
          title: 'Tiêu đề AI',
          title_origin: 'ai',
          summary: 'Tóm tắt ngắn',
        }}
      />,
    );
    expect(screen.getByText('Tóm tắt ngắn')).toBeInTheDocument();
  });

  describe('link target', () => {
    it('opens the saved url in a new tab', () => {
      render(<ItemCard item={base} imageUrl="https://signed.example/s.jpg" />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', base.url);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('opens the signed screenshot for screenshot-only items', () => {
      render(
        <ItemCard
          item={{ ...base, url: null, source: 'screenshot', image_path: 'u/a.jpg' }}
          imageUrl="https://signed.example/s.jpg"
        />,
      );
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://signed.example/s.jpg');
    });

    it('is not a link without url or image', () => {
      render(<ItemCard item={{ ...base, url: null, source: 'other' }} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('keeps the action buttons outside the link', () => {
      render(withQuery(<ItemCard item={base} onDelete={vi.fn()} />));
      const link = screen.getByRole('link');
      expect(within(link).queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sửa' })).toBeInTheDocument();
    });
  });
});
