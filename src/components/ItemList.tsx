import { ItemCard } from '@/components/ItemCard';
import { useDeleteItem } from '@/hooks/useDeleteItem';
import { useSignedImageUrls } from '@/hooks/useSignedImageUrls';
import type { Item } from '@/types/item';

/**
 * One column on phones, two on wide screens. auto-rows-fr gives every row the
 * height of the tallest card, so mixed note lengths leave no ragged gaps.
 */
export function ItemList({ items }: { items: Item[] }) {
  const imageUrls = useSignedImageUrls(items);
  const del = useDeleteItem();

  return (
    <ul className="grid auto-rows-fr gap-2 xl:grid-cols-2">
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard
            item={item}
            imageUrl={item.image_path ? imageUrls[item.image_path] : undefined}
            onDelete={(i) => del.mutate(i)}
            canOrganize
          />
        </li>
      ))}
    </ul>
  );
}
