import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ItemList } from '@/components/ItemList';
import { ItemSkeleton } from '@/components/ItemSkeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CollectionNameForm } from '@/components/CollectionNameForm';
import { ShareCollectionDialog } from '@/components/ShareCollectionDialog';
import { useCollections } from '@/hooks/useCollections';
import { useCollectionItems } from '@/hooks/useCollectionItems';
import { useCollectionActions } from '@/hooks/useCollectionActions';
import { vi } from '@/i18n/vi';

const ICON_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100';

export function CollectionScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [renaming, setRenaming] = useState(false);
  const collections = useCollections();
  const items = useCollectionItems(id);
  const { rename, remove } = useCollectionActions();
  const collection = collections.data?.find((c) => c.id === id);

  if (collections.isSuccess && !collection) {
    return <EmptyState message={vi.collections.notFound} />;
  }

  return (
    <section>
      <div className="px-4 pt-3 lg:px-0 lg:pt-6">
        <Link
          to="/collections"
          className="-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm text-stone-500 hover:text-ink"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {vi.collections.back}
        </Link>
      </div>

      <ScreenHeader
        title={collection?.name ?? vi.common.loading}
        subtitle={collection ? vi.collections.itemCount(collection.item_count) : undefined}
      >
        {collection && (
          <div className="mt-2 flex items-center gap-1">
            <ShareCollectionDialog collection={collection} />
            <button
              type="button"
              aria-label={vi.collections.rename}
              onClick={() => setRenaming((r) => !r)}
              className={ICON_BUTTON}
            >
              <Pencil size={18} aria-hidden="true" />
            </button>
            <ConfirmDialog
              title={vi.collections.deleteTitle}
              description={vi.collections.deleteDescription}
              confirmLabel={vi.collections.delete}
              tone="danger"
              onConfirm={() =>
                remove.mutate(collection.id, { onSuccess: () => navigate('/collections') })
              }
            >
              <button type="button" aria-label={vi.collections.delete} className={ICON_BUTTON}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </ConfirmDialog>
          </div>
        )}
        {collection && renaming && (
          <div className="mt-2 max-w-md">
            <CollectionNameForm
              initialName={collection.name}
              submitLabel={vi.collections.save}
              busy={rename.isPending}
              autoFocus
              onSubmit={(name) =>
                rename.mutate({ id: collection.id, name }, { onSuccess: () => setRenaming(false) })
              }
            />
          </div>
        )}
      </ScreenHeader>

      <div className="px-4 pt-1 lg:px-0">
        {items.isLoading || collections.isLoading ? (
          <ItemSkeleton />
        ) : items.isError || collections.isError ? (
          <ErrorState
            message={vi.collections.loadError}
            onRetry={() => {
              void collections.refetch();
              void items.refetch();
            }}
          />
        ) : !items.data || items.data.length === 0 ? (
          <EmptyState
            title={vi.collections.itemsEmptyTitle}
            message={vi.collections.itemsEmpty}
            illustration="inboxEmpty"
          />
        ) : (
          <ItemList items={items.data} />
        )}
      </div>
    </section>
  );
}
