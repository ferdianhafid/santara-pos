import type {
  CartItem,
  MenuItem,
  MenuSize,
  MenuSizeVariant,
} from '../types';

const sizeOrder: MenuSize[] = ['M', 'L'];

export function getMenuSizeVariants(item: MenuItem): MenuSizeVariant[] {
  return sizeOrder.flatMap((size) => {
    const variant = item.sizeVariants?.find((entry) => entry.size === size);
    return variant ? [variant] : [];
  });
}

export function getMenuStartingPrice(item: MenuItem) {
  const variants = getMenuSizeVariants(item);
  return variants.length > 0
    ? Math.min(...variants.map((variant) => variant.price))
    : item.price;
}

export function getMenuVariant(
  item: MenuItem,
  size: MenuSize | null,
): { price: number; hpp: number; size: MenuSize | null } {
  if (size) {
    const variant = getMenuSizeVariants(item).find(
      (entry) => entry.size === size,
    );
    if (!variant) {
      throw new Error(`Ukuran ${size} tidak tersedia untuk ${item.name}.`);
    }
    return { price: variant.price, hpp: variant.hpp, size };
  }

  return { price: item.price, hpp: item.hpp, size: null };
}

export function getSizedMenuName(
  name: string,
  size?: MenuSize | null,
) {
  return size ? `${name} ${size}` : name;
}

export function getCartItemDisplayName(item: CartItem) {
  return getSizedMenuName(item.nameSnapshot, item.sizeSnapshot);
}
