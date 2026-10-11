import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('confirms before deleting', () => {
    const onDelete = vi.fn();
    const confirm = vi.spyOn(window, 'confirm');
    render(<ItemCard item={base} onDelete={onDelete} />);
    const button = screen.getByRole('button', { name: 'Xoá' });

    confirm.mockReturnValueOnce(false);
    fireEvent.click(button);
    expect(onDelete).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(button);
    expect(onDelete).toHaveBeenCalledWith(base);
    confirm.mockRestore();
  });
});
