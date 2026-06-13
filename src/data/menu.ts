import type { MenuCategory } from '../types';

export const menuCategories: MenuCategory[] = [
  {
    id: 'basic-coffee',
    name: 'Basic Coffee',
    items: [
      { id: 'americano', name: 'Americano', category: 'Basic Coffee', price: 18000 },
      { id: 'ice-latte', name: 'Ice Latte', category: 'Basic Coffee', price: 22000 },
      { id: 'vietnam-drip', name: 'Vietnam Drip', category: 'Basic Coffee', price: 20000 },
    ],
  },
  {
    id: 'signature',
    name: 'Signature',
    items: [
      { id: 'santara-coffee', name: 'Santara Coffee', category: 'Signature', price: 25000 },
      { id: 'scotchtie', name: 'Scotchtie', category: 'Signature', price: 26000 },
      { id: 'kopsu-gula-aren', name: 'Kopsu Gula Aren', category: 'Signature', price: 24000 },
      { id: 'creamy-tiramisu', name: 'Creamy Tiramisu', category: 'Signature', price: 27000 },
      { id: 'caramel-sea-salt', name: 'Caramel Sea Salt', category: 'Signature', price: 27000 },
      { id: 'matcha-boost', name: 'Matcha Boost', category: 'Signature', price: 27000 },
      { id: 'choco-strawberry', name: 'Choco Strawberry', category: 'Signature', price: 26000 },
      { id: 'lemon-americano', name: 'Lemon Americano', category: 'Signature', price: 22000 },
      { id: 'tropical-americano', name: 'Tropical Americano', category: 'Signature', price: 24000 },
    ],
  },
  {
    id: 'milk-base',
    name: 'Milk Base',
    items: [
      { id: 'matcha', name: 'Matcha', category: 'Milk Base', price: 23000 },
      { id: 'pingky-matcha', name: 'Pingky Matcha', category: 'Milk Base', price: 25000 },
      { id: 'chocolate', name: 'Chocolate', category: 'Milk Base', price: 22000 },
      { id: 'red-velvet', name: 'Red Velvet', category: 'Milk Base', price: 23000 },
      {
        id: 'korean-strawberry-milk',
        name: 'Korean Strawberry Milk',
        category: 'Milk Base',
        price: 25000,
      },
    ],
  },
  {
    id: 'tea-others',
    name: 'Tea & Others',
    items: [
      { id: 'black-tea', name: 'Black Tea', category: 'Tea & Others', price: 12000 },
      { id: 'lychee-tea', name: 'Lychee Tea', category: 'Tea & Others', price: 18000 },
      { id: 'lemon-tea', name: 'Lemon Tea', category: 'Tea & Others', price: 16000 },
      { id: 'mineral-water', name: 'Mineral Water', category: 'Tea & Others', price: 8000 },
    ],
  },
  {
    id: 'main-dish',
    name: 'Main Dish',
    items: [
      { id: 'mie-rebus', name: 'Mie Rebus', category: 'Main Dish', price: 15000 },
      { id: 'mie-goreng', name: 'Mie Goreng', category: 'Main Dish', price: 15000 },
      { id: 'telur', name: 'Telur', category: 'Main Dish', price: 5000 },
    ],
  },
  {
    id: 'snack',
    name: 'Snack',
    items: [
      { id: 'french-fries', name: 'French Fries', category: 'Snack', price: 18000 },
      { id: 'mix-platter', name: 'Mix Platter', category: 'Snack', price: 28000 },
      { id: 'churros', name: 'Churros', category: 'Snack', price: 18000 },
    ],
  },
];
