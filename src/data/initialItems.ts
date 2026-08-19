import { Item, Zone } from '../types';

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'item-1',
    title: 'Vintage Lounge Chair & Ottoman',
    description: "Moving out sale, but actually it's free for whoever can pick it up first. This is a high-quality replica of the classic mid-century lounge chair. The leather has some minor patina which adds to its character. Structure is perfectly solid.",
    category: 'Furniture',
    condition: 'Used - Like New',
    location: "Jing'an District, Shanghai",
    district: "Jing'an District",
    city: 'Shanghai',
    distanceKm: 1.2,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxPseG0Q-GjbVC2jwnIiy_cgXzecC_CY046Zn4cVd-Dh3ArWSCPnDxqkfzUqlG0zAE7Ek5DExUb6FSGVAP4Vr0V2aj0gKLta21WTfSOwWHXDfqCT4aGqOwfMnzBZ8Rbdtc4LRY9MTZNEtIV3NwOu3tKSgGD-eiGmq6Za3fnTzBz00z63F-OHPXNO4ernZ9PCsXRMwPt8cNfVVQ3CrvcADdLK8NpD3PMlJCwTb9i0Pu-BNEJHvz8LJ8cA',
    mapSnippetUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCU8BB8aMW4s8iftRQOGGiFAQtGfvj_PlbjBF85RSXx6S2jD8nmwi81Y9ZaO-QFZo-V90DULoigmvYq_w0XDM18MTdmJOK8RIdEoKDF4MsFodCHPXnlFVZfx1OGeSsnxC7OcYSIfrksK88VZwE7Ch9wwFOCw9XfC7srIjkLcMIlqUHOnlf2YXJphhseeQJXaukKMOa-Le77q4UL8seip7EdU6ZcSbylG1jrt92Tyl9Q8lS2Aj-Lzf-Wvg',
    badge: 'Verified Free',
    timeAgo: '2h ago',
    isAvailable: true,
    cost: '¥0.00',
    conditionDetails: [
      'Used - Like New: No significant scratches or tears.',
      'Smoke-free and pet-free home environment.',
      'Dimensions: 84cm x 84cm x 84cm. Heavy lifting required.'
    ],
    pickupLogistics: 'Available for pickup this weekend only (Saturday or Sunday between 10 AM and 4 PM). Please bring a friend as I cannot assist with moving the item down the stairs. Elevator is functional.',
    owner: {
      id: 'owner-alex',
      name: 'Alex Chen',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIlJnj6OhkmhV3ytRzkS1O5K8rUXYaZZOqYq-D5ujtFO0p_0JGVb41dZMlMidYiIrCQjHvIXRt_E7lSzqXBiA9nyCErPLX4Xwr5-10RKM0OmjTBajCeJWbvBi0pG0iH6qWGb387Ufq3DsO8mhpxy3Q2N8b1TIBrv4h3dT0yN_b0wMOD5q_4u9UlRrdx05nbF070h6JwtW0GPwjL3oD5Zw2bW72LNSd_jqQTqYjWZvsL3ets2DLxUt7_A',
      joinedYear: 2021,
      itemsGiven: 12,
      isVerified: true
    },
    lat: 31.228,
    lng: 121.445,
    createdAt: Date.now() - 7200000
  },
  {
    id: 'item-2',
    title: 'Modern Oak Lounge Chair',
    description: 'Minimalist mid-century modern wooden chair in bright oak finish. In excellent structural condition, clean architectural lines.',
    category: 'Furniture',
    condition: 'Good',
    location: 'Prenzlauer Berg, Berlin',
    district: 'Prenzlauer Berg',
    city: 'Berlin',
    distanceKm: 0.8,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcupVbbWscYznxkWbvTxRrnQ9NtmECu5vFo8-VmuTY6T43bYDrty9PZiIbSbbqPhFhKGU9-mqDUhxscDbqOtcJDYkBVKDut9wax39nhxVhoiNqjbMCV24nBBPf4dIDuF-vI4-aPxZNAOfVIIUbB8hSn9wAfc-t7nZG4N8TKoILXIn_zAc1CmiaYpHAz14njB6j4LAD7na8BIViNYRgZ3ING95gqu_3UwRWt13vFbX84Jko3rkQtU4XdA',
    badge: 'NEW ARRIVAL',
    timeAgo: 'Just Posted',
    isAvailable: true,
    cost: 'Free',
    conditionDetails: [
      'Good condition: Solid wood frame.',
      'Slight surface wear on legs.',
      'Dimensions: 75cm x 70cm x 80cm.'
    ],
    pickupLogistics: 'Pick up near Danziger Str. Flexible timings weekday evenings.',
    owner: {
      id: 'owner-hannah',
      name: 'Hannah Weber',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2022,
      itemsGiven: 8,
      isVerified: true
    },
    lat: 52.538,
    lng: 13.418,
    createdAt: Date.now() - 1800000
  },
  {
    id: 'item-3',
    title: 'Mechanical Keyboard (Brown Switches)',
    description: 'Sleek black high-performance mechanical keyboard with subtle RGB lighting. Great for typing and coding.',
    category: 'Tech',
    condition: 'Good',
    location: 'Shibuya, Tokyo',
    district: 'Shibuya',
    city: 'Tokyo',
    distanceKm: 1.5,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3qv75a2oglcYz9DKVuvS1X4WH7uRbgylomH6iK1-SSfhcs_GGHIYiBDBzZMQrBcr-24j7Ynp1JJdxLeKFudhzGUv0-5GPqc4yKkiJVNsyRZRNWqiXvPdonCUgSpCqt3C8GLqXOh5AJnckoVLmJ2j5ctf97vErJ8_kItTQVs4exTnvWfUMJgYjniLfCo1ecmmub29lgMtjc-dG_knaFXKwEf0f6croVaCHDurPIwSpEFoy-8qAo5lXGw',
    timeAgo: '1h ago',
    isAvailable: true,
    cost: 'Free',
    conditionDetails: [
      'Fully functional brown mechanical switches.',
      'Includes USB-C braided cable.',
      'Cleaned and sanitized.'
    ],
    pickupLogistics: 'Pick up at Shibuya station east exit or nearby cafe.',
    owner: {
      id: 'owner-kenji',
      name: 'Kenji Sato',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2020,
      itemsGiven: 19,
      isVerified: true
    },
    lat: 35.658,
    lng: 139.701,
    createdAt: Date.now() - 3600000
  },
  {
    id: 'item-4',
    title: 'Collection of Architectural Journals',
    description: 'Stack of designer art books and architectural monographs including Bauhaus Architecture, Brutalism Today, and Zaha Hadid works.',
    category: 'Books',
    condition: 'Used - Like New',
    location: 'Shoreditch, London',
    district: 'Shoreditch',
    city: 'London',
    distanceKm: 2.0,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBA1rSA3n34hku4MiAUz6srDAKkqepfhktvU-xumGeHAVqLjkJgf8sdpD405XA-yu7tj8YfIn_-WfyWXr89mqbQCNXbvgkQaM5z9UKlAKMBAPjtiOLR8vmO4me4RR8BpYmzmZlLYuT13iyP__FUVjg-lvEPrWttSVf9k_ymnO1OS2V8dFwzLNyLOzc2NHDQFc8YXRrRm-KDN_D706u1vJq12hfkx4_HHlledlNVXOlizmqUr1AymQvjGg',
    timeAgo: '3h ago',
    isAvailable: true,
    cost: 'Free',
    conditionDetails: [
      'Includes 6 hardcover architectural books.',
      'Pristine condition pages, no markings.',
      'Great coffee table display items.'
    ],
    pickupLogistics: 'Pickup near Redchurch Street. Can leave at concierge desk for easy grab.',
    owner: {
      id: 'owner-oliver',
      name: 'Oliver Smith',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2023,
      itemsGiven: 5,
      isVerified: true
    },
    lat: 51.524,
    lng: -0.078,
    createdAt: Date.now() - 10800000
  },
  {
    id: 'item-5',
    title: 'Matte Black Ceramic Vase',
    description: 'Minimalist matte black ceramic vase with an organic asymmetric shape. Fits single branches or dried flower arrangements.',
    category: 'Home Decor',
    condition: 'New',
    location: 'Brooklyn, NY',
    district: 'Brooklyn',
    city: 'New York',
    distanceKm: 1.1,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1x7z-ZCrhMX2EV4Qi3vmQyqOY3Crm5l2ntbUtyf9KslTFtUpRvGbcJYS01nuGFd8NQ4PwPr-x372jIT6uLB3C0hmlVLem3EDMX79Jg-76JVxGkX8QGQkblO-xS-TzLtAEd8Yd-AQ47vvavLvEgPRWcZGcx2EJuTdaJDxq5hIke7dljRkcckpsBKATJiQ_mRqYbrN-54X58nQkhupxqqVK5yykPS0LEaQUzNPnNKqVPAcfL9SU0CPLnA',
    timeAgo: '4h ago',
    isAvailable: true,
    cost: 'Free',
    conditionDetails: [
      'Brand new, never used.',
      'Height 28cm.',
      'Waterproof interior coating.'
    ],
    pickupLogistics: 'Williamsburg Brooklyn pickup. Porch pickup available anytime today.',
    owner: {
      id: 'owner-chloe',
      name: 'Chloe Miller',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2021,
      itemsGiven: 14,
      isVerified: true
    },
    lat: 40.712,
    lng: -73.957,
    createdAt: Date.now() - 14400000
  },
  {
    id: 'item-6',
    title: 'Vintage 35mm Film Camera',
    description: 'Classic silver and black analog 35mm SLR camera. Fully functional shutter and manual focus ring.',
    category: 'Tech',
    condition: 'Fair',
    location: 'Le Marais, Paris',
    district: 'Le Marais',
    city: 'Paris',
    distanceKm: 2.1,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWLfaZ8Wt-xwu-fMb4dF7XUo-KZeXwL-klLhQ2abbkJ0L58JFImXT9fYtlYRHTJYEGlxH5aU11d_5yFqDDOF9xlzyw_tdtwaeJorMui85j80Zio_tA9bI7ttX-a58j83xuL0o6Sur4JC5iJZFfpz-V74dcQ9XKT476VhaUoxC-RfkuqNJ38hQ5QNG6i9M-1NZZdwUIw8ZKTEummAo3WtQ70CkX8n_DKdhsRQTqb3RMnefQOcfaFp85ZQ',
    timeAgo: '4h ago',
    isAvailable: true,
    cost: 'Free',
    conditionDetails: [
      'Tested with film - mechanical shutter works well.',
      'Minor cosmetic scratches on bottom metal plate.',
      'Includes 50mm f/1.8 lens.'
    ],
    pickupLogistics: 'Pickup near Place des Vosges. Afternoon meetup preferred.',
    owner: {
      id: 'owner-lucas',
      name: 'Lucas Bernard',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2019,
      itemsGiven: 27,
      isVerified: true
    },
    lat: 48.856,
    lng: 2.361,
    createdAt: Date.now() - 15000000
  },
  {
    id: 'item-7',
    title: '27-inch Minimal Monitor Stand',
    description: 'Sleek white aluminum monitor stand with integrated cable routing. Suitable for monitors up to 27 inches.',
    category: 'Tech',
    condition: 'Good',
    location: 'Gangnam, Seoul',
    district: 'Gangnam',
    city: 'Seoul',
    distanceKm: 0.9,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdpWgRSOevjmiyfn5ePi1cOVAdNWpDz3_VZ2YcNi3s-G-fcbQiIef_mZIvlEm1SV3ZfkTDl2fP0VHHujh5-EZaXCobgrDDfAmWw1LJFI8HwNZVLxUzThcRvuUDmJ0Mz1msvlwXvx8XMU8-oqUObXa4ijYsmJhYMNqUZRhfgsOs2RqtMmfO-_fIGRWQmRjePzwz4RUxZo0ErW2PzjBAoJQ6IKi7XXbpzedwXQvd1tcpnQJpOU35HbhOvw',
    timeAgo: '5h ago',
    isAvailable: true,
    cost: 'Free',
    conditionDetails: [
      'Solid aluminum construction.',
      'Holds up to 10kg weight.',
      'Clean finish with no noticeable marks.'
    ],
    pickupLogistics: 'Pickup near Gangnam Station Exit 5.',
    owner: {
      id: 'owner-min',
      name: 'Min-Jun Park',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2022,
      itemsGiven: 11,
      isVerified: true
    },
    lat: 37.497,
    lng: 127.027,
    createdAt: Date.now() - 18000000
  },
  {
    id: 'item-8',
    title: 'Minimalist Side Table',
    description: 'Oak wood accent side table with slim legs. Lightweight, sturdy, and beautiful in any modern interior.',
    category: 'Furniture',
    condition: 'Good',
    location: "Jing'an District, Shanghai",
    district: "Jing'an District",
    city: 'Shanghai',
    distanceKm: 0.4,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDr5o91ESkhqlDRW6Uh-6RQISrgZ5jea-L6q2Bboh0F470pM3hDDqCrUOZoCQSODi3lNP-BYhc3dIx2dPyLYlGUwMoQXFaN7qhpzQLX7aaZaErUQ52B9tU7VaswXzLd8fmYb41bTOZCiCpxr8yXN4xVSydqYQY_Fs89ipDTtzwVYKYSnfjYe70N7HNTSNOK3UK_kOxhodOgsVozhNmut8bbL8cpi1ZGyV51jeOSBa9nyJ0zLZwLZYSEbA',
    timeAgo: 'Just Posted',
    isAvailable: true,
    cost: 'Free',
    owner: {
      id: 'owner-alex',
      name: 'Alex Chen',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIlJnj6OhkmhV3ytRzkS1O5K8rUXYaZZOqYq-D5ujtFO0p_0JGVb41dZMlMidYiIrCQjHvIXRt_E7lSzqXBiA9nyCErPLX4Xwr5-10RKM0OmjTBajCeJWbvBi0pG0iH6qWGb387Ufq3DsO8mhpxy3Q2N8b1TIBrv4h3dT0yN_b0wMOD5q_4u9UlRrdx05nbF070h6JwtW0GPwjL3oD5Zw2bW72LNSd_jqQTqYjWZvsL3ets2DLxUt7_A',
      joinedYear: 2021,
      itemsGiven: 12,
      isVerified: true
    },
    lat: 31.23,
    lng: 121.448,
    createdAt: Date.now() - 600000
  },
  {
    id: 'item-9',
    title: 'Designer Desk Lamp',
    description: 'Sleek matte black architect desk lamp with flexible arm and warm LED bulb included.',
    category: 'Home Decor',
    condition: 'Used - Like New',
    location: "Jing'an District, Shanghai",
    district: "Jing'an District",
    city: 'Shanghai',
    distanceKm: 2.1,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEgKQE92H-r4EMkrbBlsGHBAd3JNNCUkAYp0UNJS6BnQ4xuVADewiAUX45iWT3tpsbRNuT59AihRSWkI5VSficaBjZQvshAXNUZhdZXHFTBXc51gkqBvoTtCJH7u88Us8pb8f25TG2wWgAXIblON3m3CYznABCq8jVv6bQ6md38_c2uDAdrd47IdhmUAS6jsGjPZjgsgN9AFjkWOW83jqwNycSH3GQ9vfGZ8RR42V8k2u_dKe-aYzO-Q',
    timeAgo: '4h ago',
    isAvailable: true,
    cost: 'Free',
    owner: {
      id: 'owner-alex',
      name: 'Alex Chen',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIlJnj6OhkmhV3ytRzkS1O5K8rUXYaZZOqYq-D5ujtFO0p_0JGVb41dZMlMidYiIrCQjHvIXRt_E7lSzqXBiA9nyCErPLX4Xwr5-10RKM0OmjTBajCeJWbvBi0pG0iH6qWGb387Ufq3DsO8mhpxy3Q2N8b1TIBrv4h3dT0yN_b0wMOD5q_4u9UlRrdx05nbF070h6JwtW0GPwjL3oD5Zw2bW72LNSd_jqQTqYjWZvsL3ets2DLxUt7_A',
      joinedYear: 2021,
      itemsGiven: 12,
      isVerified: true
    },
    lat: 31.222,
    lng: 121.439,
    createdAt: Date.now() - 14400000
  },
  {
    id: 'item-10',
    title: 'Taccia Table Lamp',
    description: 'High-end designer lamp on marble base. Minimalist architectural lighting piece.',
    category: 'Home Decor',
    condition: 'Used - Like New',
    location: 'Centro Storico, Venice',
    district: 'Centro Storico',
    city: 'Venice',
    distanceKm: 1.4,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDk6kjQxiYYBcY259kNmRVyZuGiAJ2Zxh4nqstCrh97DeHijgZ3P2LsDzslXs7iE1kD1RLgSa3NLwUnR0oz9b7eizT_wlrROeOIdJVbYvSeyLgOxy4ASLE20RXwK1xd7OofD8XP2htU1vpkaIJwP5G1LKBFscMgpB-vTnUzgYdmS5tyBdMugk2UBKuFX26pFyuJ06epxxSlmYZvZaW4iqNvSHgCuWmeXt3_k8CGrtKn4iccW5uneU6tmg',
    badge: 'NEW DROP',
    timeAgo: '1h ago',
    isAvailable: true,
    cost: '¥12,800',
    owner: {
      id: 'owner-marco',
      name: 'Marco Rossi',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2020,
      itemsGiven: 16,
      isVerified: true
    },
    lat: 45.437,
    lng: 12.332,
    createdAt: Date.now() - 3600000
  },
  {
    id: 'item-11',
    title: 'Organic Clay Vase',
    description: 'Handcrafted ceramic series by local artisans. Organic texture and minimalist finish.',
    category: 'Home Decor',
    condition: 'New',
    location: 'Mestre, Venice',
    district: 'Mestre',
    city: 'Venice',
    distanceKm: 3.2,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBBb1Pzdy1wjKOzmViMVXwTNkwZBITrtJ9VMoc13JDQ__0R6Gd04jtIK4t36B5FjjGchw4vdc67Rf97BzrZ-DZ2Y1UgAeF7wBzeMaGk5q1yT64CTlstgRV5_pxpSvFma7nBZV4yVeCbmRWmifMYiLJyGdqoIdjEmsc9PZXHTF8ADgWHQS1gOhf8dMAGojV9Hj3_D0NL64-w4E-RNNUz8mhOy3zpctaozeVApOKxhE7FidOJcdECC5zKGQ',
    timeAgo: '2h ago',
    isAvailable: true,
    cost: '¥4,200',
    owner: {
      id: 'owner-giulia',
      name: 'Giulia Bianchi',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
      joinedYear: 2022,
      itemsGiven: 7,
      isVerified: true
    },
    lat: 45.485,
    lng: 12.241,
    createdAt: Date.now() - 7200000
  }
];

export const INITIAL_ZONES: Zone[] = [
  {
    id: 'zone-1',
    name: 'Shanghai Central',
    description: "Jing'an & Huangpu Districts",
    status: 'ACTIVE',
    lastUpdated: 'Last updated 2m ago',
    icon: 'location_on'
  },
  {
    id: 'zone-2',
    name: 'Luxury Retail',
    description: 'Global Monitoring (Sneakers/Bags)',
    status: 'PAUSED',
    lastUpdated: 'No recent activity',
    icon: 'shopping_bag'
  }
];
