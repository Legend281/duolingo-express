/**
 * Duolingo Express — Offline World Gateway Cities
 * Major non-US cities (logistics hubs and population centers on every continent) used as:
 *  - an instant, network-free fast path when geocoding a common international city, and
 *  - a resilient fallback when the live geocoder is slow or down (it often is), and
 *  - a reference set for naming a shipment's in-transit position outside the US.
 * Country names match what Nominatim returns with accept-language=en, so live results and
 * table entries compare equal.
 */

// [city, region, country, lat, lng, timezone label, aliases?]
type WorldCityRow = [string, string, string, number, number, string, string[]?];

const ROWS: WorldCityRow[] = [
  // Canada
  ['Toronto', 'Ontario', 'Canada', 43.6532, -79.3832, 'ET'],
  ['Montreal', 'Quebec', 'Canada', 45.5019, -73.5674, 'ET', ['Montréal']],
  ['Vancouver', 'British Columbia', 'Canada', 49.2827, -123.1207, 'PT'],
  ['Calgary', 'Alberta', 'Canada', 51.0447, -114.0719, 'MT'],
  ['Edmonton', 'Alberta', 'Canada', 53.5461, -113.4938, 'MT'],
  ['Ottawa', 'Ontario', 'Canada', 45.4215, -75.6972, 'ET'],
  ['Winnipeg', 'Manitoba', 'Canada', 49.8951, -97.1384, 'CT'],
  ['Halifax', 'Nova Scotia', 'Canada', 44.6488, -63.5752, 'AT'],

  // Mexico, Central America & Caribbean
  ['Mexico City', 'Mexico City', 'Mexico', 19.4326, -99.1332, 'CST', ['Ciudad de México', 'CDMX']],
  ['Guadalajara', 'Jalisco', 'Mexico', 20.6597, -103.3496, 'CST'],
  ['Monterrey', 'Nuevo León', 'Mexico', 25.6866, -100.3161, 'CST'],
  ['Tijuana', 'Baja California', 'Mexico', 32.5149, -117.0382, 'PT'],
  ['Panama City', 'Panamá', 'Panama', 8.9824, -79.5199, 'EST'],
  ['San José', 'San José', 'Costa Rica', 9.9281, -84.0907, 'CST'],
  ['Guatemala City', 'Guatemala', 'Guatemala', 14.6349, -90.5069, 'CST'],
  ['Kingston', 'Kingston', 'Jamaica', 17.9712, -76.7936, 'EST'],
  ['Santo Domingo', 'Distrito Nacional', 'Dominican Republic', 18.4861, -69.9312, 'AST'],
  ['Havana', 'Havana', 'Cuba', 23.1136, -82.3666, 'CST'],

  // South America
  ['São Paulo', 'São Paulo', 'Brazil', -23.5505, -46.6333, 'BRT', ['Sao Paulo']],
  ['Rio de Janeiro', 'Rio de Janeiro', 'Brazil', -22.9068, -43.1729, 'BRT'],
  ['Buenos Aires', 'Buenos Aires', 'Argentina', -34.6037, -58.3816, 'ART'],
  ['Santiago', 'Santiago Metropolitan', 'Chile', -33.4489, -70.6693, 'CLT'],
  ['Lima', 'Lima', 'Peru', -12.0464, -77.0428, 'PET'],
  ['Bogotá', 'Bogotá', 'Colombia', 4.7110, -74.0721, 'COT', ['Bogota']],
  ['Medellín', 'Antioquia', 'Colombia', 6.2442, -75.5812, 'COT', ['Medellin']],
  ['Caracas', 'Capital District', 'Venezuela', 10.4806, -66.9036, 'VET'],
  ['Quito', 'Pichincha', 'Ecuador', -0.1807, -78.4678, 'ECT'],
  ['Montevideo', 'Montevideo', 'Uruguay', -34.9011, -56.1645, 'UYT'],

  // Europe
  ['London', 'England', 'United Kingdom', 51.5074, -0.1278, 'GMT'],
  ['Manchester', 'England', 'United Kingdom', 53.4808, -2.2426, 'GMT'],
  ['Birmingham', 'England', 'United Kingdom', 52.4862, -1.8904, 'GMT'],
  ['Edinburgh', 'Scotland', 'United Kingdom', 55.9533, -3.1883, 'GMT'],
  ['Glasgow', 'Scotland', 'United Kingdom', 55.8642, -4.2518, 'GMT'],
  ['Dublin', 'Leinster', 'Ireland', 53.3498, -6.2603, 'GMT'],
  ['Paris', 'Île-de-France', 'France', 48.8566, 2.3522, 'CET'],
  ['Lyon', 'Auvergne-Rhône-Alpes', 'France', 45.7640, 4.8357, 'CET'],
  ['Marseille', "Provence-Alpes-Côte d'Azur", 'France', 43.2965, 5.3698, 'CET'],
  ['Berlin', 'Berlin', 'Germany', 52.5200, 13.4050, 'CET'],
  ['Hamburg', 'Hamburg', 'Germany', 53.5511, 9.9937, 'CET'],
  ['Frankfurt', 'Hesse', 'Germany', 50.1109, 8.6821, 'CET', ['Frankfurt am Main']],
  ['Munich', 'Bavaria', 'Germany', 48.1351, 11.5820, 'CET', ['München']],
  ['Cologne', 'North Rhine-Westphalia', 'Germany', 50.9375, 6.9603, 'CET', ['Köln']],
  ['Amsterdam', 'North Holland', 'Netherlands', 52.3676, 4.9041, 'CET'],
  ['Rotterdam', 'South Holland', 'Netherlands', 51.9244, 4.4777, 'CET'],
  ['Brussels', 'Brussels-Capital', 'Belgium', 50.8503, 4.3517, 'CET', ['Bruxelles']],
  ['Antwerp', 'Antwerp', 'Belgium', 51.2194, 4.4025, 'CET', ['Antwerpen']],
  ['Luxembourg', 'Luxembourg', 'Luxembourg', 49.6116, 6.1319, 'CET'],
  ['Zurich', 'Zurich', 'Switzerland', 47.3769, 8.5417, 'CET', ['Zürich']],
  ['Geneva', 'Geneva', 'Switzerland', 46.2044, 6.1432, 'CET', ['Genève']],
  ['Vienna', 'Vienna', 'Austria', 48.2082, 16.3738, 'CET', ['Wien']],
  ['Madrid', 'Community of Madrid', 'Spain', 40.4168, -3.7038, 'CET'],
  ['Barcelona', 'Catalonia', 'Spain', 41.3874, 2.1686, 'CET'],
  ['Valencia', 'Valencian Community', 'Spain', 39.4699, -0.3763, 'CET'],
  ['Lisbon', 'Lisbon', 'Portugal', 38.7223, -9.1393, 'WET', ['Lisboa']],
  ['Porto', 'Porto', 'Portugal', 41.1579, -8.6291, 'WET'],
  ['Rome', 'Lazio', 'Italy', 41.9028, 12.4964, 'CET', ['Roma']],
  ['Milan', 'Lombardy', 'Italy', 45.4642, 9.1900, 'CET', ['Milano']],
  ['Naples', 'Campania', 'Italy', 40.8518, 14.2681, 'CET', ['Napoli']],
  ['Copenhagen', 'Capital Region', 'Denmark', 55.6761, 12.5683, 'CET', ['København']],
  ['Stockholm', 'Stockholm', 'Sweden', 59.3293, 18.0686, 'CET'],
  ['Gothenburg', 'Västra Götaland', 'Sweden', 57.7089, 11.9746, 'CET', ['Göteborg']],
  ['Oslo', 'Oslo', 'Norway', 59.9139, 10.7522, 'CET'],
  ['Helsinki', 'Uusimaa', 'Finland', 60.1699, 24.9384, 'EET'],
  ['Reykjavík', 'Capital Region', 'Iceland', 64.1466, -21.9426, 'GMT', ['Reykjavik']],
  ['Warsaw', 'Masovia', 'Poland', 52.2297, 21.0122, 'CET', ['Warszawa']],
  ['Kraków', 'Lesser Poland', 'Poland', 50.0647, 19.9450, 'CET', ['Krakow', 'Cracow']],
  ['Prague', 'Prague', 'Czechia', 50.0755, 14.4378, 'CET', ['Praha']],
  ['Budapest', 'Budapest', 'Hungary', 47.4979, 19.0402, 'CET'],
  ['Bucharest', 'Bucharest', 'Romania', 44.4268, 26.1025, 'EET', ['București']],
  ['Sofia', 'Sofia City', 'Bulgaria', 42.6977, 23.3219, 'EET'],
  ['Athens', 'Attica', 'Greece', 37.9838, 23.7275, 'EET', ['Athina']],
  ['Belgrade', 'Belgrade', 'Serbia', 44.7866, 20.4489, 'CET', ['Beograd']],
  ['Zagreb', 'Zagreb', 'Croatia', 45.8150, 15.9819, 'CET'],
  ['Riga', 'Riga', 'Latvia', 56.9496, 24.1052, 'EET'],
  ['Vilnius', 'Vilnius County', 'Lithuania', 54.6872, 25.2797, 'EET'],
  ['Tallinn', 'Harju County', 'Estonia', 59.4370, 24.7536, 'EET'],
  ['Kyiv', 'Kyiv', 'Ukraine', 50.4501, 30.5234, 'EET', ['Kiev']],
  ['Moscow', 'Moscow', 'Russia', 55.7558, 37.6173, 'MSK', ['Moskva']],
  ['Saint Petersburg', 'Saint Petersburg', 'Russia', 59.9311, 30.3609, 'MSK', ['St. Petersburg', 'St Petersburg']],
  ['Istanbul', 'Istanbul', 'Türkiye', 41.0082, 28.9784, 'TRT'],
  ['Ankara', 'Ankara', 'Türkiye', 39.9334, 32.8597, 'TRT'],

  // Middle East
  ['Dubai', 'Dubai', 'United Arab Emirates', 25.2048, 55.2708, 'GST'],
  ['Abu Dhabi', 'Abu Dhabi', 'United Arab Emirates', 24.4539, 54.3773, 'GST'],
  ['Doha', 'Doha', 'Qatar', 25.2854, 51.5310, 'AST'],
  ['Riyadh', 'Riyadh', 'Saudi Arabia', 24.7136, 46.6753, 'AST'],
  ['Jeddah', 'Makkah', 'Saudi Arabia', 21.4858, 39.1925, 'AST', ['Jiddah']],
  ['Kuwait City', 'Capital', 'Kuwait', 29.3759, 47.9774, 'AST'],
  ['Manama', 'Capital', 'Bahrain', 26.2285, 50.5860, 'AST'],
  ['Muscat', 'Muscat', 'Oman', 23.5880, 58.3829, 'GST'],
  ['Tel Aviv', 'Tel Aviv', 'Israel', 32.0853, 34.7818, 'UTC+2', ['Tel Aviv-Yafo']],
  ['Amman', 'Amman', 'Jordan', 31.9454, 35.9284, 'UTC+3'],
  ['Beirut', 'Beirut', 'Lebanon', 33.8938, 35.5018, 'EET'],
  ['Tehran', 'Tehran', 'Iran', 35.6892, 51.3890, 'IRST'],
  ['Baghdad', 'Baghdad', 'Iraq', 33.3152, 44.3661, 'AST'],

  // Africa
  ['Lagos', 'Lagos', 'Nigeria', 6.5244, 3.3792, 'WAT'],
  ['Abuja', 'Federal Capital Territory', 'Nigeria', 9.0765, 7.3986, 'WAT'],
  ['Kano', 'Kano', 'Nigeria', 12.0022, 8.5920, 'WAT'],
  ['Port Harcourt', 'Rivers', 'Nigeria', 4.8156, 7.0498, 'WAT'],
  ['Ibadan', 'Oyo', 'Nigeria', 7.3775, 3.9470, 'WAT'],
  ['Accra', 'Greater Accra', 'Ghana', 5.6037, -0.1870, 'GMT'],
  ['Kumasi', 'Ashanti', 'Ghana', 6.6885, -1.6244, 'GMT'],
  ['Abidjan', 'Abidjan', "Côte d'Ivoire", 5.3600, -4.0083, 'GMT'],
  ['Dakar', 'Dakar', 'Senegal', 14.7167, -17.4677, 'GMT'],
  ['Lomé', 'Maritime', 'Togo', 6.1256, 1.2254, 'GMT', ['Lome']],
  ['Cotonou', 'Littoral', 'Benin', 6.3703, 2.3912, 'WAT'],
  ['Douala', 'Littoral', 'Cameroon', 4.0511, 9.7679, 'WAT'],
  ['Kinshasa', 'Kinshasa', 'Democratic Republic of the Congo', -4.4419, 15.2663, 'WAT'],
  ['Luanda', 'Luanda', 'Angola', -8.8390, 13.2894, 'WAT'],
  ['Libreville', 'Estuaire', 'Gabon', 0.4162, 9.4673, 'WAT'],
  ['Niamey', 'Niamey', 'Niger', 13.5116, 2.1254, 'WAT'],
  ['Bamako', 'Bamako', 'Mali', 12.6392, -8.0029, 'GMT'],
  ['Ouagadougou', 'Centre', 'Burkina Faso', 12.3714, -1.5197, 'GMT'],
  ['Freetown', 'Western Area', 'Sierra Leone', 8.4657, -13.2317, 'GMT'],
  ['Monrovia', 'Montserrado', 'Liberia', 6.3156, -10.8074, 'GMT'],
  ['Nairobi', 'Nairobi', 'Kenya', -1.2921, 36.8219, 'EAT'],
  ['Mombasa', 'Mombasa', 'Kenya', -4.0435, 39.6682, 'EAT'],
  ['Kampala', 'Central', 'Uganda', 0.3476, 32.5825, 'EAT'],
  ['Kigali', 'Kigali', 'Rwanda', -1.9441, 30.0619, 'CAT'],
  ['Dar es Salaam', 'Dar es Salaam', 'Tanzania', -6.7924, 39.2083, 'EAT'],
  ['Addis Ababa', 'Addis Ababa', 'Ethiopia', 9.0054, 38.7636, 'EAT'],
  ['Khartoum', 'Khartoum', 'Sudan', 15.5007, 32.5599, 'CAT'],
  ['Antananarivo', 'Analamanga', 'Madagascar', -18.8792, 47.5079, 'EAT'],
  ['Port Louis', 'Port Louis', 'Mauritius', -20.1609, 57.5012, 'MUT'],
  ['Johannesburg', 'Gauteng', 'South Africa', -26.2041, 28.0473, 'SAST'],
  ['Pretoria', 'Gauteng', 'South Africa', -25.7479, 28.2293, 'SAST'],
  ['Cape Town', 'Western Cape', 'South Africa', -33.9249, 18.4241, 'SAST'],
  ['Durban', 'KwaZulu-Natal', 'South Africa', -29.8587, 31.0218, 'SAST'],
  ['Lusaka', 'Lusaka', 'Zambia', -15.3875, 28.3228, 'CAT'],
  ['Harare', 'Harare', 'Zimbabwe', -17.8252, 31.0335, 'CAT'],
  ['Maputo', 'Maputo', 'Mozambique', -25.9692, 32.5732, 'CAT'],
  ['Windhoek', 'Khomas', 'Namibia', -22.5609, 17.0658, 'CAT'],
  ['Gaborone', 'South-East', 'Botswana', -24.6282, 25.9231, 'CAT'],
  ['Cairo', 'Cairo', 'Egypt', 30.0444, 31.2357, 'EET'],
  ['Alexandria', 'Alexandria', 'Egypt', 31.2001, 29.9187, 'EET'],
  ['Casablanca', 'Casablanca-Settat', 'Morocco', 33.5731, -7.5898, 'UTC+1'],
  ['Tunis', 'Tunis', 'Tunisia', 36.8065, 10.1815, 'CET'],
  ['Algiers', 'Algiers', 'Algeria', 36.7538, 3.0588, 'CET', ['Alger']],

  // South & Central Asia
  ['Mumbai', 'Maharashtra', 'India', 19.0760, 72.8777, 'IST', ['Bombay']],
  ['New Delhi', 'Delhi', 'India', 28.6139, 77.2090, 'IST', ['Delhi']],
  ['Bengaluru', 'Karnataka', 'India', 12.9716, 77.5946, 'IST', ['Bangalore']],
  ['Chennai', 'Tamil Nadu', 'India', 13.0827, 80.2707, 'IST', ['Madras']],
  ['Kolkata', 'West Bengal', 'India', 22.5726, 88.3639, 'IST', ['Calcutta']],
  ['Hyderabad', 'Telangana', 'India', 17.3850, 78.4867, 'IST'],
  ['Ahmedabad', 'Gujarat', 'India', 23.0225, 72.5714, 'IST'],
  ['Pune', 'Maharashtra', 'India', 18.5204, 73.8567, 'IST'],
  ['Karachi', 'Sindh', 'Pakistan', 24.8607, 67.0011, 'PKT'],
  ['Lahore', 'Punjab', 'Pakistan', 31.5204, 74.3587, 'PKT'],
  ['Islamabad', 'Islamabad Capital Territory', 'Pakistan', 33.6844, 73.0479, 'PKT'],
  ['Dhaka', 'Dhaka', 'Bangladesh', 23.8103, 90.4125, 'UTC+6'],
  ['Chittagong', 'Chittagong', 'Bangladesh', 22.3569, 91.7832, 'UTC+6', ['Chattogram']],
  ['Colombo', 'Western', 'Sri Lanka', 6.9271, 79.8612, 'UTC+5:30'],
  ['Kathmandu', 'Bagmati', 'Nepal', 27.7172, 85.3240, 'NPT'],
  ['Almaty', 'Almaty', 'Kazakhstan', 43.2220, 76.8512, 'UTC+5'],
  ['Tashkent', 'Tashkent', 'Uzbekistan', 41.2995, 69.2401, 'UTC+5'],

  // East Asia
  ['Beijing', 'Beijing', 'China', 39.9042, 116.4074, 'UTC+8', ['Peking']],
  ['Shanghai', 'Shanghai', 'China', 31.2304, 121.4737, 'UTC+8'],
  ['Shenzhen', 'Guangdong', 'China', 22.5431, 114.0579, 'UTC+8'],
  ['Guangzhou', 'Guangdong', 'China', 23.1291, 113.2644, 'UTC+8', ['Canton']],
  ['Chengdu', 'Sichuan', 'China', 30.5728, 104.0668, 'UTC+8'],
  ['Tianjin', 'Tianjin', 'China', 39.3434, 117.3616, 'UTC+8'],
  ['Ningbo', 'Zhejiang', 'China', 29.8683, 121.5440, 'UTC+8'],
  ['Qingdao', 'Shandong', 'China', 36.0671, 120.3826, 'UTC+8'],
  ['Hong Kong', 'Hong Kong', 'Hong Kong', 22.3193, 114.1694, 'HKT'],
  ['Taipei', 'Taipei', 'Taiwan', 25.0330, 121.5654, 'UTC+8'],
  ['Tokyo', 'Tokyo', 'Japan', 35.6762, 139.6503, 'JST'],
  ['Osaka', 'Osaka', 'Japan', 34.6937, 135.5023, 'JST'],
  ['Yokohama', 'Kanagawa', 'Japan', 35.4437, 139.6380, 'JST'],
  ['Seoul', 'Seoul', 'South Korea', 37.5665, 126.9780, 'KST'],
  ['Busan', 'Busan', 'South Korea', 35.1796, 129.0756, 'KST', ['Pusan']],
  ['Ulaanbaatar', 'Ulaanbaatar', 'Mongolia', 47.8864, 106.9057, 'UTC+8'],

  // Southeast Asia
  ['Singapore', 'Singapore', 'Singapore', 1.3521, 103.8198, 'SGT'],
  ['Kuala Lumpur', 'Federal Territory of Kuala Lumpur', 'Malaysia', 3.1390, 101.6869, 'UTC+8'],
  ['Bangkok', 'Bangkok', 'Thailand', 13.7563, 100.5018, 'ICT'],
  ['Ho Chi Minh City', 'Ho Chi Minh City', 'Vietnam', 10.8231, 106.6297, 'ICT', ['Saigon', 'Ho Chi Minh']],
  ['Hanoi', 'Hanoi', 'Vietnam', 21.0278, 105.8342, 'ICT', ['Ha Noi']],
  ['Phnom Penh', 'Phnom Penh', 'Cambodia', 11.5564, 104.9282, 'ICT'],
  ['Yangon', 'Yangon', 'Myanmar', 16.8409, 96.1735, 'UTC+6:30', ['Rangoon']],
  ['Jakarta', 'Jakarta', 'Indonesia', -6.2088, 106.8456, 'WIB'],
  ['Surabaya', 'East Java', 'Indonesia', -7.2575, 112.7521, 'WIB'],
  ['Manila', 'Metro Manila', 'Philippines', 14.5995, 120.9842, 'PHT'],
  ['Cebu City', 'Central Visayas', 'Philippines', 10.3157, 123.8854, 'PHT', ['Cebu']],

  // Oceania
  ['Sydney', 'New South Wales', 'Australia', -33.8688, 151.2093, 'AEST'],
  ['Melbourne', 'Victoria', 'Australia', -37.8136, 144.9631, 'AEST'],
  ['Brisbane', 'Queensland', 'Australia', -27.4698, 153.0251, 'AEST'],
  ['Perth', 'Western Australia', 'Australia', -31.9505, 115.8605, 'AWST'],
  ['Adelaide', 'South Australia', 'Australia', -34.9285, 138.6007, 'ACST'],
  ['Auckland', 'Auckland', 'New Zealand', -36.8485, 174.7633, 'NZST'],
  ['Wellington', 'Wellington', 'New Zealand', -41.2865, 174.7762, 'NZST'],
  ['Christchurch', 'Canterbury', 'New Zealand', -43.5321, 172.6362, 'NZST'],
  ['Suva', 'Central', 'Fiji', -18.1248, 178.4501, 'UTC+12'],
  ['Port Moresby', 'National Capital District', 'Papua New Guinea', -9.4438, 147.1803, 'UTC+10'],
];

export interface WorldCity {
  city: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  aliases: string[];
}

export const WORLD_CITIES: WorldCity[] = ROWS.map(([city, region, country, lat, lng, timezone, aliases]) => ({
  city, region, country, lat, lng, timezone, aliases: aliases || [],
}));

/** Lowercase, strip accents and punctuation so "São Paulo" == "sao paulo" and "St." == "st". */
export function normalizePlace(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Common ways people write a country that differ from Nominatim's English name.
const COUNTRY_ALIASES: Record<string, string> = {
  'us': 'United States', 'usa': 'United States', 'u s': 'United States', 'u s a': 'United States',
  'united states of america': 'United States', 'america': 'United States',
  'uk': 'United Kingdom', 'u k': 'United Kingdom', 'gb': 'United Kingdom', 'great britain': 'United Kingdom',
  'britain': 'United Kingdom', 'england': 'United Kingdom', 'scotland': 'United Kingdom',
  'wales': 'United Kingdom', 'northern ireland': 'United Kingdom',
  'uae': 'United Arab Emirates', 'emirates': 'United Arab Emirates',
  'drc': 'Democratic Republic of the Congo', 'dr congo': 'Democratic Republic of the Congo',
  'congo-kinshasa': 'Democratic Republic of the Congo',
  'korea': 'South Korea', 'republic of korea': 'South Korea',
  'turkey': 'Türkiye', 'turkiye': 'Türkiye',
  'czech republic': 'Czechia',
  'ivory coast': "Côte d'Ivoire", 'cote divoire': "Côte d'Ivoire",
  'holland': 'Netherlands', 'the netherlands': 'Netherlands',
  'russian federation': 'Russia',
  'peoples republic of china': 'China', 'prc': 'China',
  'viet nam': 'Vietnam',
};

/** Canonical country name for comparisons/storage ("UK" -> "United Kingdom"). Unknown names pass through trimmed. */
export function canonicalCountry(country?: string | null): string {
  const raw = (country || '').trim();
  if (!raw) return '';
  return COUNTRY_ALIASES[normalizePlace(raw)] || raw;
}

/** True for a blank country (legacy US-only callers) or any spelling of the United States. */
export function isUnitedStates(country?: string | null): boolean {
  const c = canonicalCountry(country);
  return !c || c === 'United States';
}

function sameCountry(a: string, b: string): boolean {
  return normalizePlace(canonicalCountry(a)) === normalizePlace(canonicalCountry(b));
}

/**
 * Finds a city in the offline world table. Accepts "City", "City, Region" or
 * "City, Region, Country"; when `country` is given only that country's cities match.
 */
export function findWorldCity(input: string, country?: string): WorldCity | null {
  const parts = (input || '').split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const cityKey = normalizePlace(parts[0]);
  // A trailing part may itself name the country ("Paris, France") when none was passed.
  const countryHint = country || (parts.length > 1 ? parts[parts.length - 1] : '');

  const candidates = WORLD_CITIES.filter(c =>
    normalizePlace(c.city) === cityKey || c.aliases.some(a => normalizePlace(a) === cityKey)
  );
  if (candidates.length === 0) return null;

  if (country) {
    return candidates.find(c => sameCountry(c.country, country)) || null;
  }
  if (countryHint) {
    const hinted = candidates.find(c => sameCountry(c.country, countryHint) || normalizePlace(c.region) === normalizePlace(countryHint));
    if (hinted) return hinted;
  }
  return candidates[0];
}

/** Nearest table city to a coordinate, optionally limited to one country. */
export function findNearestWorldCity(lat: number, lng: number, country?: string): WorldCity | null {
  let best: WorldCity | null = null;
  let bestDist = Infinity;
  for (const c of WORLD_CITIES) {
    if (country && !sameCountry(c.country, country)) continue;
    // Equirectangular approximation — plenty for picking the closest of a few hundred points.
    const x = (lng - c.lng) * Math.cos(((lat + c.lat) / 2) * Math.PI / 180);
    const y = lat - c.lat;
    const d = x * x + y * y;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Last-resort timezone label from longitude, e.g. "UTC+3", for places not near any table city. */
export function utcOffsetLabelFromLongitude(lng: number): string {
  const offset = Math.round(lng / 15);
  return offset === 0 ? 'UTC' : `UTC${offset > 0 ? '+' : '-'}${Math.abs(offset)}`;
}

// Country picker list: [display name, ISO 3166-1 alpha-2]. United States first (the default),
// the rest alphabetical. Codes are what the geocoder filters on, so a name only has to be
// unambiguous, not identical to any provider's spelling.
export const COUNTRIES: ReadonlyArray<readonly [string, string]> = [
  ['United States', 'US'],
  ['Afghanistan', 'AF'], ['Albania', 'AL'], ['Algeria', 'DZ'], ['Andorra', 'AD'], ['Angola', 'AO'],
  ['Antigua and Barbuda', 'AG'], ['Argentina', 'AR'], ['Armenia', 'AM'], ['Australia', 'AU'], ['Austria', 'AT'],
  ['Azerbaijan', 'AZ'], ['Bahamas', 'BS'], ['Bahrain', 'BH'], ['Bangladesh', 'BD'], ['Barbados', 'BB'],
  ['Belarus', 'BY'], ['Belgium', 'BE'], ['Belize', 'BZ'], ['Benin', 'BJ'], ['Bhutan', 'BT'],
  ['Bolivia', 'BO'], ['Bosnia and Herzegovina', 'BA'], ['Botswana', 'BW'], ['Brazil', 'BR'], ['Brunei', 'BN'],
  ['Bulgaria', 'BG'], ['Burkina Faso', 'BF'], ['Burundi', 'BI'], ['Cabo Verde', 'CV'], ['Cambodia', 'KH'],
  ['Cameroon', 'CM'], ['Canada', 'CA'], ['Central African Republic', 'CF'], ['Chad', 'TD'], ['Chile', 'CL'],
  ['China', 'CN'], ['Colombia', 'CO'], ['Comoros', 'KM'], ['Congo', 'CG'], ['Costa Rica', 'CR'],
  ["Côte d'Ivoire", 'CI'], ['Croatia', 'HR'], ['Cuba', 'CU'], ['Cyprus', 'CY'], ['Czechia', 'CZ'],
  ['Democratic Republic of the Congo', 'CD'], ['Denmark', 'DK'], ['Djibouti', 'DJ'], ['Dominica', 'DM'],
  ['Dominican Republic', 'DO'], ['Ecuador', 'EC'], ['Egypt', 'EG'], ['El Salvador', 'SV'],
  ['Equatorial Guinea', 'GQ'], ['Eritrea', 'ER'], ['Estonia', 'EE'], ['Eswatini', 'SZ'], ['Ethiopia', 'ET'],
  ['Fiji', 'FJ'], ['Finland', 'FI'], ['France', 'FR'], ['Gabon', 'GA'], ['Gambia', 'GM'],
  ['Georgia', 'GE'], ['Germany', 'DE'], ['Ghana', 'GH'], ['Greece', 'GR'], ['Grenada', 'GD'],
  ['Guatemala', 'GT'], ['Guinea', 'GN'], ['Guinea-Bissau', 'GW'], ['Guyana', 'GY'], ['Haiti', 'HT'],
  ['Honduras', 'HN'], ['Hong Kong', 'HK'], ['Hungary', 'HU'], ['Iceland', 'IS'], ['India', 'IN'],
  ['Indonesia', 'ID'], ['Iran', 'IR'], ['Iraq', 'IQ'], ['Ireland', 'IE'], ['Israel', 'IL'],
  ['Italy', 'IT'], ['Jamaica', 'JM'], ['Japan', 'JP'], ['Jordan', 'JO'], ['Kazakhstan', 'KZ'],
  ['Kenya', 'KE'], ['Kiribati', 'KI'], ['Kosovo', 'XK'], ['Kuwait', 'KW'], ['Kyrgyzstan', 'KG'],
  ['Laos', 'LA'], ['Latvia', 'LV'], ['Lebanon', 'LB'], ['Lesotho', 'LS'], ['Liberia', 'LR'],
  ['Libya', 'LY'], ['Liechtenstein', 'LI'], ['Lithuania', 'LT'], ['Luxembourg', 'LU'], ['Macao', 'MO'],
  ['Madagascar', 'MG'], ['Malawi', 'MW'], ['Malaysia', 'MY'], ['Maldives', 'MV'], ['Mali', 'ML'],
  ['Malta', 'MT'], ['Marshall Islands', 'MH'], ['Mauritania', 'MR'], ['Mauritius', 'MU'], ['Mexico', 'MX'],
  ['Micronesia', 'FM'], ['Moldova', 'MD'], ['Monaco', 'MC'], ['Mongolia', 'MN'], ['Montenegro', 'ME'],
  ['Morocco', 'MA'], ['Mozambique', 'MZ'], ['Myanmar', 'MM'], ['Namibia', 'NA'], ['Nauru', 'NR'],
  ['Nepal', 'NP'], ['Netherlands', 'NL'], ['New Zealand', 'NZ'], ['Nicaragua', 'NI'], ['Niger', 'NE'],
  ['Nigeria', 'NG'], ['North Korea', 'KP'], ['North Macedonia', 'MK'], ['Norway', 'NO'], ['Oman', 'OM'],
  ['Pakistan', 'PK'], ['Palau', 'PW'], ['Palestine', 'PS'], ['Panama', 'PA'], ['Papua New Guinea', 'PG'],
  ['Paraguay', 'PY'], ['Peru', 'PE'], ['Philippines', 'PH'], ['Poland', 'PL'], ['Portugal', 'PT'],
  ['Qatar', 'QA'], ['Romania', 'RO'], ['Russia', 'RU'], ['Rwanda', 'RW'], ['Saint Kitts and Nevis', 'KN'],
  ['Saint Lucia', 'LC'], ['Saint Vincent and the Grenadines', 'VC'], ['Samoa', 'WS'], ['San Marino', 'SM'],
  ['São Tomé and Príncipe', 'ST'], ['Saudi Arabia', 'SA'], ['Senegal', 'SN'], ['Serbia', 'RS'],
  ['Seychelles', 'SC'], ['Sierra Leone', 'SL'], ['Singapore', 'SG'], ['Slovakia', 'SK'], ['Slovenia', 'SI'],
  ['Solomon Islands', 'SB'], ['Somalia', 'SO'], ['South Africa', 'ZA'], ['South Korea', 'KR'],
  ['South Sudan', 'SS'], ['Spain', 'ES'], ['Sri Lanka', 'LK'], ['Sudan', 'SD'], ['Suriname', 'SR'],
  ['Sweden', 'SE'], ['Switzerland', 'CH'], ['Syria', 'SY'], ['Taiwan', 'TW'], ['Tajikistan', 'TJ'],
  ['Tanzania', 'TZ'], ['Thailand', 'TH'], ['Timor-Leste', 'TL'], ['Togo', 'TG'], ['Tonga', 'TO'],
  ['Trinidad and Tobago', 'TT'], ['Tunisia', 'TN'], ['Türkiye', 'TR'], ['Turkmenistan', 'TM'], ['Tuvalu', 'TV'],
  ['Uganda', 'UG'], ['Ukraine', 'UA'], ['United Arab Emirates', 'AE'], ['United Kingdom', 'GB'],
  ['Uruguay', 'UY'], ['Uzbekistan', 'UZ'], ['Vanuatu', 'VU'], ['Vatican City', 'VA'], ['Venezuela', 'VE'],
  ['Vietnam', 'VN'], ['Yemen', 'YE'], ['Zambia', 'ZM'], ['Zimbabwe', 'ZW'],
];

/**
 * The picker's own spelling for any way a country might be written ("UK", "Turkey",
 * "united kingdom"), so a stored value always matches an option in the dropdown.
 * Blank means United States (legacy rows); unknown names pass through unchanged.
 */
export function pickerCountryName(country?: string | null): string {
  const canonical = canonicalCountry(country);
  if (!canonical) return 'United States';
  const key = normalizePlace(canonical);
  return COUNTRIES.find(([name]) => normalizePlace(name) === key)?.[0] || canonical;
}
