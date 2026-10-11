import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
const upload = vi.fn();
const remove = vi.fn();
const deleteEq = vi.fn();
const createSignedUrls = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'jwt', user: { id: 'user-1' } } },
      }),
    },
    storage: {
      from: (bucket: string) => {
        calls.push(`bucket:${bucket}`);
        return { upload, remove, createSignedUrls };
      },
    },
    from: () => ({ delete: () => ({ eq: deleteEq }) }),
  },
}));

import { api } from '@/lib/api';

const fetchMock = vi.fn();
const blob = new Blob(['x'], { type: 'image/jpeg' });

beforeEach(() => {
  calls.length = 0;
  upload.mockReset().mockImplementation(async () => {
    calls.push('upload');
    return { error: null };
  });
  remove.mockReset().mockImplementation(async () => {
    calls.push('remove');
    return { error: null };
  });
  deleteEq.mockReset().mockImplementation(async () => {
    calls.push('row-delete');
    return { error: null };
  });
  createSignedUrls.mockReset();
  fetchMock.mockReset().mockImplementation(async () => {
    calls.push('ingest');
    return { ok: true, status: 201 };
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('api.saveScreenshot', () => {
  it('uploads under the user folder first, then posts to ingest', async () => {
    await api.saveScreenshot(blob, ' https://example.com ', ' ghi chú ');
    expect(calls.filter((c) => c !== 'bucket:screenshots')).toEqual([
      'upload',
      'ingest',
    ]);
    const [path, , opts] = upload.mock.calls[0];
    expect(path).toMatch(/^user-1\/[0-9a-f-]{36}\.jpg$/);
    expect(opts).toMatchObject({ upsert: false, contentType: 'image/jpeg' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      url: 'https://example.com',
      note: 'ghi chú',
      channel: 'upload',
      image_path: path,
    });
  });

  it('allows an image-only save', async () => {
    await api.saveScreenshot(blob, '', '');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.url).toBeUndefined();
    expect(body.note).toBeUndefined();
  });

  it('removes the uploaded object when ingest fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    await expect(api.saveScreenshot(blob, '', 'n')).rejects.toThrow();
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });

  it('does not call ingest when the upload fails', async () => {
    upload.mockResolvedValue({ error: new Error('nope') });
    await expect(api.saveScreenshot(blob, '', 'n')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('api.deleteItem', () => {
  it('deletes the row before the storage object', async () => {
    await api.deleteItem({ id: 'i1', image_path: 'user-1/a.jpg' });
    expect(calls.filter((c) => c !== 'bucket:screenshots')).toEqual([
      'row-delete',
      'remove',
    ]);
  });

  it('keeps the delete successful if object removal fails', async () => {
    remove.mockRejectedValue(new Error('storage down'));
    await expect(
      api.deleteItem({ id: 'i1', image_path: 'user-1/a.jpg' }),
    ).resolves.toBeUndefined();
  });

  it('does not touch storage when the row delete fails', async () => {
    deleteEq.mockResolvedValue({ error: new Error('rls') });
    await expect(
      api.deleteItem({ id: 'i1', image_path: 'user-1/a.jpg' }),
    ).rejects.toThrow();
    expect(remove).not.toHaveBeenCalled();
  });

  it('skips storage for items without an image', async () => {
    await api.deleteItem({ id: 'i1', image_path: null });
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('api.getSignedImageUrls', () => {
  it('batches one request and maps path to url', async () => {
    createSignedUrls.mockResolvedValue({
      data: [
        { path: 'a', signedUrl: 'https://s/a', error: null },
        { path: 'b', signedUrl: null, error: 'x' },
      ],
      error: null,
    });
    const urls = await api.getSignedImageUrls(['a', 'b']);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(['a', 'b'], 3600);
    expect(urls).toEqual({ a: 'https://s/a' });
  });
});
