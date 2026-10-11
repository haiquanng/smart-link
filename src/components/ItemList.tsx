import { ItemCard } from '@/components/ItemCard';
import type { Item } from '@/types/item';

/** One column on phones, two on wide screens. */
export function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="grid items-start gap-2 xl:grid-cols-2">
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  );
}
