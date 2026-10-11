import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from '@/components/ErrorState';

describe('ErrorState', () => {
  it('shows the message and a working retry button', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Không tải được danh sách." onRetry={onRetry} />);
    expect(screen.getByText('Không tải được danh sách.')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Thử lại' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('omits the retry button when no handler is given', () => {
    render(<ErrorState message="x" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
