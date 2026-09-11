export interface TestAccount {
  email: string;
  name: string;
  category: string;
}

export const AOL_TEST_ACCOUNTS: TestAccount[] = [
  { email: 'beachcook@aol.com', name: 'Beach Cook', category: 'Restaurant & Catering' },
  { email: 'fmpizza49@aol.com', name: 'FM Pizza 49', category: 'Pizzeria' },
  { email: 'lenrsnb@aol.com', name: 'Len RSNB', category: 'Business Partner' },
  { email: 'dantanas@aol.com', name: 'Dan Tana’s', category: 'Fine Dining' },
  { email: 'obrienswilshire@aol.com', name: "O'Brien's Wilshire", category: 'Pub & Eatery' },
  { email: 'rosetreeco@aol.com', name: 'Rose Tree Cottage', category: 'Tea & Bakery' },
  { email: 'nickbalyan@aol.com', name: 'Nick Balyan', category: 'Hospitality Partner' },
  { email: 'pastinafood@aol.com', name: 'Pastina Food', category: 'Italian Deli' },
  { email: 'schwartzbakery@aol.com', name: 'Schwartz Bakery', category: 'Artisan Bakery' },
  { email: 'dishcatering2003@aol.com', name: 'Dish Catering 2003', category: 'Catering Services' },
  { email: 'mrsgarciascatering@aol.com', name: "Mrs. Garcia's Catering", category: 'Catering Services' },
  { email: 'oldsasoon@aol.com', name: 'Old Sasoon Bakery', category: 'Artisan Bakery' },
  { email: 'amazingcatering@aol.com', name: 'Amazing Catering', category: 'Event Catering' },
  { email: 'mariachidivas@aol.com', name: 'Mariachi Divas', category: 'Entertainment & Events' },
  { email: 'eltepeyaccafe@aol.com', name: 'El Tepeyac Cafe', category: 'Mexican Dining' },
  { email: 'laperla3425@aol.com', name: 'La Perla 3425', category: 'Seafood & Grill' },
  { email: 'saddleranch@aol.com', name: 'Saddle Ranch Chop House', category: 'Steakhouse & Grill' },
  { email: 'casabianca@aol.com', name: 'Casa Bianca Pizza Pie', category: 'Pizzeria' },
  { email: 'chateaubiz@aol.com', name: 'Chateau Biz', category: 'Hospitality Business' },
  { email: 'cirospizza@aol.com', name: "Ciro's Pizza Cafe", category: 'Pizzeria' },
  { email: 'colombos@aol.com', name: "Colombo's Italian Steakhouse", category: 'Italian Steakhouse' },
  { email: 'mammasicily@aol.com', name: 'Mamma Sicily', category: 'Italian Dining' },
  { email: 'pinocchiodeli@aol.com', name: 'Pinocchio Deli', category: 'Italian Deli' },
  { email: 'petrillospizza@aol.com', name: "Petrillo's Pizza", category: 'Pizzeria' },
  { email: 'mariosdeli@aol.com', name: "Mario's Italian Deli", category: 'Italian Deli' },
  { email: 'filippissp@aol.com', name: "Filippi's Pizza Grotto", category: 'Pizzeria' },
  { email: 'laparolaccia@aol.com', name: 'La Parolaccia Osteria', category: 'Italian Osteria' }
];

export const AOL_TEST_EMAILS_TEXT = AOL_TEST_ACCOUNTS.map(a => a.email).join('\n');
