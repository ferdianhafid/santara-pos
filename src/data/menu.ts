import type { MenuCategory } from '../types';

const menuItem = (
  id: string,
  name: string,
  category: string,
  price: number,
) => ({
  id,
  name,
  category,
  price,
  hpp: 0,
  isActive: true,
});

export const menuCategories: MenuCategory[] = [
  {
    id: 'basic-coffee',
    name: 'Basic Coffee',
    items: [
      menuItem('americano', 'Americano', 'Basic Coffee', 18000),
      menuItem('ice-latte', 'Ice Latte', 'Basic Coffee', 22000),
      menuItem('vietnam-drip', 'Vietnam Drip', 'Basic Coffee', 20000),
    ],
  },
  {
    id: 'signature',
    name: 'Signature',
    items: [
      menuItem('santara-coffee', 'Santara Coffee', 'Signature', 25000),
      menuItem('scotchtie', 'Scotchtie', 'Signature', 26000),
      menuItem('kopsu-gula-aren', 'Kopsu Gula Aren', 'Signature', 24000),
      menuItem('creamy-tiramisu', 'Creamy Tiramisu', 'Signature', 27000),
      menuItem('caramel-sea-salt', 'Caramel Sea Salt', 'Signature', 27000),
      menuItem('matcha-boost', 'Matcha Boost', 'Signature', 27000),
      menuItem('choco-strawberry', 'Choco Strawberry', 'Signature', 26000),
      menuItem('lemon-americano', 'Lemon Americano', 'Signature', 22000),
      menuItem('tropical-americano', 'Tropical Americano', 'Signature', 24000),
    ],
  },
  {
    id: 'milk-base',
    name: 'Milk Base',
    items: [
      menuItem('matcha', 'Matcha', 'Milk Base', 23000),
      menuItem('pingky-matcha', 'Pingky Matcha', 'Milk Base', 25000),
      menuItem('chocolate', 'Chocolate', 'Milk Base', 22000),
      menuItem('red-velvet', 'Red Velvet', 'Milk Base', 23000),
      menuItem('korean-strawberry-milk', 'Korean Strawberry Milk', 'Milk Base', 25000),
    ],
  },
  {
    id: 'tea-others',
    name: 'Tea & Others',
    items: [
      menuItem('black-tea', 'Black Tea', 'Tea & Others', 12000),
      menuItem('lychee-tea', 'Lychee Tea', 'Tea & Others', 18000),
      menuItem('lemon-tea', 'Lemon Tea', 'Tea & Others', 16000),
      menuItem('mineral-water', 'Mineral Water', 'Tea & Others', 8000),
    ],
  },
  {
    id: 'main-dish',
    name: 'Main Dish',
    items: [
      menuItem('mie-rebus', 'Mie Rebus', 'Main Dish', 15000),
      menuItem('mie-goreng', 'Mie Goreng', 'Main Dish', 15000),
      menuItem('telur', 'Telur', 'Main Dish', 5000),
    ],
  },
  {
    id: 'snack',
    name: 'Snack',
    items: [
      menuItem('french-fries', 'French Fries', 'Snack', 18000),
      menuItem('mix-platter', 'Mix Platter', 'Snack', 28000),
      menuItem('churros', 'Churros', 'Snack', 18000),
    ],
  },
];
