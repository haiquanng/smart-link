import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  content_text: null,
  image_path: null,
  preview_image_url: null,
  status: 'pending',
  seen_at: null,
  created_at: new Date().toISOString(),
};

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
});
