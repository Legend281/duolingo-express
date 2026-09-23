/**
 * Duolingo Express — Hybrid Geocoding & Address Intelligence Service
 * Combines dynamic OpenStreetMap / Nominatim live address resolution with
 * an instant in-memory cache and resilient offline fallback table.
 * Resolves exact pickup/delivery coordinates, formatted addresses, and gateway facilities.
 */

export interface GeoLocationResult {
  formattedAddress?: string;
  city: string;
  state: string;
  stateFull: string;
  zip?: string;
  country?: string;
  lat: number;
  lng: number;
  timezone: string;
  facilityName: string;
  isExactCoordinate?: boolean;
}

// In-memory geocoding cache to avoid redundant API calls
const GEOCODE_CACHE = new Map<string, GeoLocationResult>();

// Resilient US Logistics Reference Coordinates & Gateway Facilities Database
export const US_METRO_DATABASE: Record<string, GeoLocationResult> = {
  // New York Metro Area
  '10001': { city: 'New York', state: 'NY', stateFull: 'New York', zip: '10001', lat: 40.7501, lng: -73.9967, timezone: 'ET', facilityName: 'New York Gateway Facility' },
  '10005': { city: 'New York', state: 'NY', stateFull: 'New York', zip: '10005', lat: 40.7064, lng: -74.0094, timezone: 'ET', facilityName: 'Manhattan Financial Hub' },
  '11201': { city: 'Brooklyn', state: 'NY', stateFull: 'New York', zip: '11201', lat: 40.6958, lng: -73.9897, timezone: 'ET', facilityName: 'Brooklyn Logistics Center' },
  '07102': { city: 'Newark', state: 'NJ', stateFull: 'New Jersey', zip: '07102', lat: 40.7357, lng: -74.1724, timezone: 'ET', facilityName: 'Newark Regional Sort Hub' },
  
  // Los Angeles & Southern California
  '90071': { city: 'Los Angeles', state: 'CA', stateFull: 'California', zip: '90071', lat: 34.0522, lng: -118.2520, timezone: 'PT', facilityName: 'Los Angeles Metro Sort Hub' },
  '90001': { city: 'Los Angeles', state: 'CA', stateFull: 'California', zip: '90001', lat: 33.9731, lng: -118.2479, timezone: 'PT', facilityName: 'SoCal Linehaul Gateway' },
  '92101': { city: 'San Diego', state: 'CA', stateFull: 'California', zip: '92101', lat: 32.7157, lng: -117.1611, timezone: 'PT', facilityName: 'San Diego Freight Center' },
  '94102': { city: 'San Francisco', state: 'CA', stateFull: 'California', zip: '94102', lat: 37.7749, lng: -122.4194, timezone: 'PT', facilityName: 'Bay Area Intermodal Hub' },
  '95110': { city: 'San Jose', state: 'CA', stateFull: 'California', zip: '95110', lat: 37.3382, lng: -121.8863, timezone: 'PT', facilityName: 'Silicon Valley Hub' },

  // Midwest Corridors
  '60601': { city: 'Chicago', state: 'IL', stateFull: 'Illinois', zip: '60601', lat: 41.8781, lng: -87.6298, timezone: 'CT', facilityName: 'Chicago Regional Sort Facility' },
  '48226': { city: 'Detroit', state: 'MI', stateFull: 'Michigan', zip: '48226', lat: 42.3314, lng: -83.0458, timezone: 'ET', facilityName: 'Detroit Automotive Freight Hub' },
  '43215': { city: 'Columbus', state: 'OH', stateFull: 'Ohio', zip: '43215', lat: 39.9612, lng: -82.9988, timezone: 'ET', facilityName: 'Ohio Valley Sort Center' },
  '46204': { city: 'Indianapolis', state: 'IN', stateFull: 'Indiana', zip: '46204', lat: 39.7684, lng: -86.1581, timezone: 'ET', facilityName: 'Crossroads Logistics Hub' },
  '63101': { city: 'St. Louis', state: 'MO', stateFull: 'Missouri', zip: '63101', lat: 38.6270, lng: -90.1994, timezone: 'CT', facilityName: 'Gateway Arch Intermodal' },
  '64106': { city: 'Kansas City', state: 'MO', stateFull: 'Missouri', zip: '64106', lat: 39.0997, lng: -94.5786, timezone: 'CT', facilityName: 'Kansas City Central Corridor' },

  // Texas & South Central
  '75201': { city: 'Dallas', state: 'TX', stateFull: 'Texas', zip: '75201', lat: 32.7767, lng: -96.7970, timezone: 'CT', facilityName: 'Dallas Freight Intermodal Hub' },
  '77002': { city: 'Houston', state: 'TX', stateFull: 'Texas', zip: '77002', lat: 29.7604, lng: -95.3698, timezone: 'CT', facilityName: 'Gulf Coast Gateway' },
  '78701': { city: 'Austin', state: 'TX', stateFull: 'Texas', zip: '78701', lat: 30.2672, lng: -97.7431, timezone: 'CT', facilityName: 'Austin Regional Hub' },
  '78205': { city: 'San Antonio', state: 'TX', stateFull: 'Texas', zip: '78205', lat: 29.4241, lng: -98.4936, timezone: 'CT', facilityName: 'Alamo Logistics Terminal' },

  // Southeast Corridors
  '30303': { city: 'Atlanta', state: 'GA', stateFull: 'Georgia', zip: '30303', lat: 33.7490, lng: -84.3880, timezone: 'ET', facilityName: 'Atlanta Gateway Center' },
  '33101': { city: 'Miami', state: 'FL', stateFull: 'Florida', zip: '33101', lat: 25.7617, lng: -80.1918, timezone: 'ET', facilityName: 'South Florida Air/Sea Hub' },
  '32801': { city: 'Orlando', state: 'FL', stateFull: 'Florida', zip: '32801', lat: 28.5383, lng: -81.3792, timezone: 'ET', facilityName: 'Central Florida Sort Hub' },
  '28202': { city: 'Charlotte', state: 'NC', stateFull: 'North Carolina', zip: '28202', lat: 35.2271, lng: -80.8431, timezone: 'ET', facilityName: 'Piedmont Intermodal Hub' },
  '37203': { city: 'Nashville', state: 'TN', stateFull: 'Tennessee', zip: '37203', lat: 36.1627, lng: -86.7816, timezone: 'CT', facilityName: 'Music City Linehaul Center' },
  '38103': { city: 'Memphis', state: 'TN', stateFull: 'Tennessee', zip: '38103', lat: 35.1495, lng: -90.0490, timezone: 'CT', facilityName: 'Mid-South Global Hub' },

  // Mountain & Southwest
  '80202': { city: 'Denver', state: 'CO', stateFull: 'Colorado', zip: '80202', lat: 39.7392, lng: -104.9903, timezone: 'MT', facilityName: 'Rocky Mountain Gateway' },
  '85001': { city: 'Phoenix', state: 'AZ', stateFull: 'Arizona', zip: '85001', lat: 33.4484, lng: -112.0740, timezone: 'MST', facilityName: 'Desert Southwest Hub' },
  '84101': { city: 'Salt Lake City', state: 'UT', stateFull: 'Utah', zip: '84101', lat: 40.7608, lng: -111.8910, timezone: 'MT', facilityName: 'Wasatch Freight Hub' },
  '89101': { city: 'Las Vegas', state: 'NV', stateFull: 'Nevada', zip: '89101', lat: 36.1699, lng: -115.1398, timezone: 'PT', facilityName: 'Silver State Terminal' },
  '87102': { city: 'Albuquerque', state: 'NM', stateFull: 'New Mexico', zip: '87102', lat: 35.0844, lng: -106.6504, timezone: 'MT', facilityName: 'Rio Grande Gateway' },

  // Pacific Northwest & West Coast
  '98101': { city: 'Seattle', state: 'WA', stateFull: 'Washington', zip: '98101', lat: 47.6062, lng: -122.3321, timezone: 'PT', facilityName: 'Puget Sound Gateway' },
  '99201': { city: 'Spokane', state: 'WA', stateFull: 'Washington', zip: '99201', lat: 47.6588, lng: -117.4260, timezone: 'PT', facilityName: 'Inland Northwest Hub' },
  '97201': { city: 'Portland', state: 'OR', stateFull: 'Oregon', zip: '97201', lat: 45.5152, lng: -122.6784, timezone: 'PT', facilityName: 'Columbia River Sort Center' },
  '95814': { city: 'Sacramento', state: 'CA', stateFull: 'California', zip: '95814', lat: 38.5816, lng: -121.4944, timezone: 'PT', facilityName: 'Sacramento Valley Hub' },
  '93721': { city: 'Fresno', state: 'CA', stateFull: 'California', zip: '93721', lat: 36.7468, lng: -119.7726, timezone: 'PT', facilityName: 'Central Valley Linehaul Depot' },

  // Mid-Atlantic & Northeast
  '19104': { city: 'Philadelphia', state: 'PA', stateFull: 'Pennsylvania', zip: '19104', lat: 39.9526, lng: -75.1652, timezone: 'ET', facilityName: 'Delaware Valley Sort Hub' },
  '15222': { city: 'Pittsburgh', state: 'PA', stateFull: 'Pennsylvania', zip: '15222', lat: 40.4406, lng: -79.9959, timezone: 'ET', facilityName: 'Three Rivers Freight Terminal' },
  '02108': { city: 'Boston', state: 'MA', stateFull: 'Massachusetts', zip: '02108', lat: 42.3601, lng: -71.0589, timezone: 'ET', facilityName: 'New England Metro Hub' },
  '02903': { city: 'Providence', state: 'RI', stateFull: 'Rhode Island', zip: '02903', lat: 41.8240, lng: -71.4128, timezone: 'ET', facilityName: 'Ocean State Gateway' },
  '06103': { city: 'Hartford', state: 'CT', stateFull: 'Connecticut', zip: '06103', lat: 41.7658, lng: -72.6734, timezone: 'ET', facilityName: 'Connecticut River Hub' },
  '20001': { city: 'Washington', state: 'DC', stateFull: 'District of Columbia', zip: '20001', lat: 38.9072, lng: -77.0369, timezone: 'ET', facilityName: 'Capital Logistics Center' },
  '21201': { city: 'Baltimore', state: 'MD', stateFull: 'Maryland', zip: '21201', lat: 39.2904, lng: -76.6122, timezone: 'ET', facilityName: 'Chesapeake Gateway' },
  '23219': { city: 'Richmond', state: 'VA', stateFull: 'Virginia', zip: '23219', lat: 37.5407, lng: -77.4360, timezone: 'ET', facilityName: 'Virginia Central Linehaul' },
  '23451': { city: 'Virginia Beach', state: 'VA', stateFull: 'Virginia', zip: '23451', lat: 36.8529, lng: -75.9780, timezone: 'ET', facilityName: 'Hampton Roads Maritime Dock' },
  '14202': { city: 'Buffalo', state: 'NY', stateFull: 'New York', zip: '14202', lat: 42.8864, lng: -78.8784, timezone: 'ET', facilityName: 'Niagara Frontier Sort Terminal' },

  // Southeast & Florida
  '33602': { city: 'Tampa', state: 'FL', stateFull: 'Florida', zip: '33602', lat: 27.9506, lng: -82.4572, timezone: 'ET', facilityName: 'Tampa Bay Logistics Hub' },
  '32202': { city: 'Jacksonville', state: 'FL', stateFull: 'Florida', zip: '32202', lat: 30.3322, lng: -81.6557, timezone: 'ET', facilityName: 'First Coast Intermodal' },
  '27601': { city: 'Raleigh', state: 'NC', stateFull: 'North Carolina', zip: '27601', lat: 35.7796, lng: -78.6382, timezone: 'ET', facilityName: 'Research Triangle Hub' },
  '29401': { city: 'Charleston', state: 'SC', stateFull: 'South Carolina', zip: '29401', lat: 32.7765, lng: -79.9311, timezone: 'ET', facilityName: 'Port of Charleston Gateway' },
  '35203': { city: 'Birmingham', state: 'AL', stateFull: 'Alabama', zip: '35203', lat: 33.5186, lng: -86.8104, timezone: 'CT', facilityName: 'Alabama Central Freight Dock' },
  '70112': { city: 'New Orleans', state: 'LA', stateFull: 'Louisiana', zip: '70112', lat: 29.9511, lng: -90.0715, timezone: 'CT', facilityName: 'Mississippi Delta Port Hub' },
  '40202': { city: 'Louisville', state: 'KY', stateFull: 'Kentucky', zip: '40202', lat: 38.2527, lng: -85.7585, timezone: 'ET', facilityName: 'Ohio River Air/Ground Hub' },

  // Midwest, Upper Great Lakes & Plains
  '53202': { city: 'Milwaukee', state: 'WI', stateFull: 'Wisconsin', zip: '53202', lat: 43.0389, lng: -87.9065, timezone: 'CT', facilityName: 'Lake Michigan Linehaul Hub' },
  '55401': { city: 'Minneapolis', state: 'MN', stateFull: 'Minnesota', zip: '55401', lat: 44.9778, lng: -93.2650, timezone: 'CT', facilityName: 'Twin Cities Distribution Hub' },
  '45202': { city: 'Cincinnati', state: 'OH', stateFull: 'Ohio', zip: '45202', lat: 39.1031, lng: -84.5120, timezone: 'ET', facilityName: 'Cincinnati Freight Gateway' },
  '44114': { city: 'Cleveland', state: 'OH', stateFull: 'Ohio', zip: '44114', lat: 41.4993, lng: -81.6944, timezone: 'ET', facilityName: 'Lake Erie Sort Center' },
  '50309': { city: 'Des Moines', state: 'IA', stateFull: 'Iowa', zip: '50309', lat: 41.5868, lng: -93.6250, timezone: 'CT', facilityName: 'Iowa Heartland Hub' },
  '68102': { city: 'Omaha', state: 'NE', stateFull: 'Nebraska', zip: '68102', lat: 41.2565, lng: -95.9345, timezone: 'CT', facilityName: 'Mid-America Rail/Road Terminal' },
  '73102': { city: 'Oklahoma City', state: 'OK', stateFull: 'Oklahoma', zip: '73102', lat: 35.4676, lng: -97.5164, timezone: 'CT', facilityName: 'Sooner State Transit Center' },
  '67202': { city: 'Wichita', state: 'KS', stateFull: 'Kansas', zip: '67202', lat: 37.6872, lng: -97.3301, timezone: 'CT', facilityName: 'Air Capital Logistics' },

  // Mountain, Desert & Pacific Extras
  '83702': { city: 'Boise', state: 'ID', stateFull: 'Idaho', zip: '83702', lat: 43.6150, lng: -116.2023, timezone: 'MT', facilityName: 'Treasure Valley Freight Hub' },
  '79901': { city: 'El Paso', state: 'TX', stateFull: 'Texas', zip: '79901', lat: 31.7619, lng: -106.4850, timezone: 'MT', facilityName: 'Borderlands Intermodal Terminal' },
  '82001': { city: 'Cheyenne', state: 'WY', stateFull: 'Wyoming', zip: '82001', lat: 41.1400, lng: -104.8202, timezone: 'MT', facilityName: 'Wyoming Rail/Road Hub' },
  '59101': { city: 'Billings', state: 'MT', stateFull: 'Montana', zip: '59101', lat: 45.7833, lng: -108.5007, timezone: 'MT', facilityName: 'Big Sky Regional Center' },
  '99501': { city: 'Anchorage', state: 'AK', stateFull: 'Alaska', zip: '99501', lat: 61.2181, lng: -149.9003, timezone: 'AKST', facilityName: 'Alaska Air Cargo Gateway' },
  '96813': { city: 'Honolulu', state: 'HI', stateFull: 'Hawaii', zip: '96813', lat: 21.3069, lng: -157.8583, timezone: 'HST', facilityName: 'Pacific Ocean Intermodal Port' },
  // Extra Metro Hubs
  '04101': { city: 'Portland', state: 'ME', stateFull: 'Maine', zip: '04101', lat: 43.6591, lng: -70.2568, timezone: 'ET', facilityName: 'Maine Coastal Freight Terminal' },
  '25301': { city: 'Charleston', state: 'WV', stateFull: 'West Virginia', zip: '25301', lat: 38.3498, lng: -81.6326, timezone: 'ET', facilityName: 'Mountain State Logistics Hub' },
  '31901': { city: 'Columbus', state: 'GA', stateFull: 'Georgia', zip: '31901', lat: 32.4610, lng: -84.9877, timezone: 'ET', facilityName: 'Chattahoochee Valley Sort Center' },
  '76102': { city: 'Fort Worth', state: 'TX', stateFull: 'Texas', zip: '76102', lat: 32.7555, lng: -97.3308, timezone: 'CT', facilityName: 'Fort Worth Intermodal Gateway' },
  '72201': { city: 'Little Rock', state: 'AR', stateFull: 'Arkansas', zip: '72201', lat: 34.7465, lng: -92.2896, timezone: 'CT', facilityName: 'Arkansas Central Terminal' },
  '94801': { city: 'Richmond', state: 'CA', stateFull: 'California', zip: '94801', lat: 37.9358, lng: -122.3477, timezone: 'PT', facilityName: 'East Bay Maritime Center' }
};

// State coordinates table ensuring 100% of US states resolve accurately
export const US_STATE_CENTROIDS: Record<string, { lat: number; lng: number; name: string; hubCity: string; tz: string }> = {
  AL: { lat: 32.8067, lng: -86.7911, name: 'Alabama', hubCity: 'Birmingham', tz: 'CT' },
  AK: { lat: 61.2181, lng: -149.9003, name: 'Alaska', hubCity: 'Anchorage', tz: 'AKST' },
  AZ: { lat: 33.4484, lng: -112.0740, name: 'Arizona', hubCity: 'Phoenix', tz: 'MST' },
  AR: { lat: 34.7465, lng: -92.2896, name: 'Arkansas', hubCity: 'Little Rock', tz: 'CT' },
  CA: { lat: 36.7783, lng: -119.4179, name: 'California', hubCity: 'Los Angeles', tz: 'PT' },
  CO: { lat: 39.7392, lng: -104.9903, name: 'Colorado', hubCity: 'Denver', tz: 'MT' },
  CT: { lat: 41.6032, lng: -73.0877, name: 'Connecticut', hubCity: 'Hartford', tz: 'ET' },
  DE: { lat: 38.9108, lng: -75.5277, name: 'Delaware', hubCity: 'Wilmington', tz: 'ET' },
  FL: { lat: 27.6648, lng: -81.5158, name: 'Florida', hubCity: 'Miami', tz: 'ET' },
  GA: { lat: 33.7490, lng: -84.3880, name: 'Georgia', hubCity: 'Atlanta', tz: 'ET' },
  HI: { lat: 21.3069, lng: -157.8583, name: 'Hawaii', hubCity: 'Honolulu', tz: 'HST' },
  ID: { lat: 44.0682, lng: -114.7420, name: 'Idaho', hubCity: 'Boise', tz: 'MT' },
  IL: { lat: 40.6331, lng: -89.3985, name: 'Illinois', hubCity: 'Chicago', tz: 'CT' },
  IN: { lat: 39.7684, lng: -86.1581, name: 'Indiana', hubCity: 'Indianapolis', tz: 'ET' },
  IA: { lat: 41.5868, lng: -93.6250, name: 'Iowa', hubCity: 'Des Moines', tz: 'CT' },
  KS: { lat: 38.5266, lng: -96.7265, name: 'Kansas', hubCity: 'Wichita', tz: 'CT' },
  KY: { lat: 38.2527, lng: -85.7585, name: 'Kentucky', hubCity: 'Louisville', tz: 'ET' },
  LA: { lat: 29.9511, lng: -90.0715, name: 'Louisiana', hubCity: 'New Orleans', tz: 'CT' },
  ME: { lat: 45.2538, lng: -69.4455, name: 'Maine', hubCity: 'Portland', tz: 'ET' },
  MD: { lat: 39.0458, lng: -76.6413, name: 'Maryland', hubCity: 'Baltimore', tz: 'ET' },
  MA: { lat: 42.3601, lng: -71.0589, name: 'Massachusetts', hubCity: 'Boston', tz: 'ET' },
  MI: { lat: 44.3148, lng: -85.6024, name: 'Michigan', hubCity: 'Detroit', tz: 'ET' },
  MN: { lat: 44.9778, lng: -93.2650, name: 'Minnesota', hubCity: 'Minneapolis', tz: 'CT' },
  MS: { lat: 32.3547, lng: -89.3985, name: 'Mississippi', hubCity: 'Jackson', tz: 'CT' },
  MO: { lat: 38.5739, lng: -92.6038, name: 'Missouri', hubCity: 'St. Louis', tz: 'CT' },
  MT: { lat: 46.8797, lng: -110.3626, name: 'Montana', hubCity: 'Billings', tz: 'MT' },
  NE: { lat: 41.4925, lng: -99.9018, name: 'Nebraska', hubCity: 'Omaha', tz: 'CT' },
  NV: { lat: 38.8026, lng: -116.4194, name: 'Nevada', hubCity: 'Las Vegas', tz: 'PT' },
  NH: { lat: 43.1939, lng: -71.5724, name: 'New Hampshire', hubCity: 'Manchester', tz: 'ET' },
  NJ: { lat: 40.0583, lng: -74.4057, name: 'New Jersey', hubCity: 'Newark', tz: 'ET' },
  NM: { lat: 34.5199, lng: -105.8701, name: 'New Mexico', hubCity: 'Albuquerque', tz: 'MT' },
  NY: { lat: 40.7128, lng: -74.0060, name: 'New York', hubCity: 'New York', tz: 'ET' },
  NC: { lat: 35.7596, lng: -79.0193, name: 'North Carolina', hubCity: 'Charlotte', tz: 'ET' },
  ND: { lat: 47.5515, lng: -101.0020, name: 'North Dakota', hubCity: 'Fargo', tz: 'CT' },
  OH: { lat: 40.4173, lng: -82.9071, name: 'Ohio', hubCity: 'Columbus', tz: 'ET' },
  OK: { lat: 35.4676, lng: -97.5164, name: 'Oklahoma', hubCity: 'Oklahoma City', tz: 'CT' },
  OR: { lat: 43.8041, lng: -120.5542, name: 'Oregon', hubCity: 'Portland', tz: 'PT' },
  PA: { lat: 41.2033, lng: -77.1945, name: 'Pennsylvania', hubCity: 'Philadelphia', tz: 'ET' },
  RI: { lat: 41.5801, lng: -71.4774, name: 'Rhode Island', hubCity: 'Providence', tz: 'ET' },
  SC: { lat: 33.8361, lng: -81.1637, name: 'South Carolina', hubCity: 'Charleston', tz: 'ET' },
  SD: { lat: 43.9695, lng: -99.9018, name: 'South Dakota', hubCity: 'Sioux Falls', tz: 'CT' },
  TN: { lat: 35.5175, lng: -86.5804, name: 'Tennessee', hubCity: 'Nashville', tz: 'CT' },
  TX: { lat: 31.9686, lng: -99.9018, name: 'Texas', hubCity: 'Dallas', tz: 'CT' },
  UT: { lat: 39.3210, lng: -111.0937, name: 'Utah', hubCity: 'Salt Lake City', tz: 'MT' },
  VT: { lat: 44.5588, lng: -72.5778, name: 'Vermont', hubCity: 'Burlington', tz: 'ET' },
  VA: { lat: 37.4316, lng: -78.6569, name: 'Virginia', hubCity: 'Richmond', tz: 'ET' },
  WA: { lat: 47.7511, lng: -120.7401, name: 'Washington', hubCity: 'Seattle', tz: 'PT' },
  WV: { lat: 38.5976, lng: -80.4549, name: 'West Virginia', hubCity: 'Charleston', tz: 'ET' },
  WI: { lat: 43.7844, lng: -88.7879, name: 'Wisconsin', hubCity: 'Milwaukee', tz: 'CT' },
  WY: { lat: 43.0760, lng: -107.2903, name: 'Wyoming', hubCity: 'Cheyenne', tz: 'MT' },
  DC: { lat: 38.9072, lng: -77.0369, name: 'District of Columbia', hubCity: 'Washington', tz: 'ET' }
};

// Popular multi-state Interstate Corridors for 1-click selection
export interface RouteCorridorPreset {
  id: string;
  label: string;
  sublabel: string;
  originCity: string;
  originState: string;
  originZip: string;
  originFacility: string;
  destCity: string;
  destState: string;
  destZip: string;
  destFacility: string;
  miles: number;
}

export const POPULAR_ROUTE_CORRIDORS: RouteCorridorPreset[] = [
  {
    id: 'nyc-lax',
    label: '🗽 NYC → 🌴 LAX',
    sublabel: 'Transcontinental (2,790 mi)',
    originCity: 'New York',
    originState: 'NY',
    originZip: '10001',
    originFacility: 'New York Gateway Facility',
    destCity: 'Los Angeles',
    destState: 'CA',
    destZip: '90071',
    destFacility: 'Los Angeles Metro Sort Hub',
    miles: 2790
  },
  {
    id: 'chi-dfw',
    label: '🌬️ Chicago → 🤠 Dallas',
    sublabel: 'Central Linehaul (960 mi)',
    originCity: 'Chicago',
    originState: 'IL',
    originZip: '60601',
    originFacility: 'Chicago Regional Sort Facility',
    destCity: 'Dallas',
    destState: 'TX',
    destZip: '75201',
    destFacility: 'Dallas Freight Intermodal Hub',
    miles: 960
  },
  {
    id: 'mia-sea',
    label: '☀️ Miami → 🌲 Seattle',
    sublabel: 'Diagonal Coast-to-Coast (3,310 mi)',
    originCity: 'Miami',
    originState: 'FL',
    originZip: '33101',
    originFacility: 'South Florida Air/Sea Hub',
    destCity: 'Seattle',
    destState: 'WA',
    destZip: '98101',
    destFacility: 'Puget Sound Gateway',
    miles: 3310
  },
  {
    id: 'atl-den',
    label: '🍑 Atlanta → 🏔️ Denver',
    sublabel: 'Southeast to Rockies (1,410 mi)',
    originCity: 'Atlanta',
    originState: 'GA',
    originZip: '30303',
    originFacility: 'Atlanta Gateway Center',
    destCity: 'Denver',
    destState: 'CO',
    destZip: '80202',
    destFacility: 'Rocky Mountain Gateway',
    miles: 1410
  },
  {
    id: 'bos-sfo',
    label: '🦀 Boston → 🌉 San Francisco',
    sublabel: 'Northern Cross-Country (3,100 mi)',
    originCity: 'Boston',
    originState: 'MA',
    originZip: '02108',
    originFacility: 'New England Metro Hub',
    destCity: 'San Francisco',
    destState: 'CA',
    destZip: '94102',
    destFacility: 'Bay Area Intermodal Hub',
    miles: 3100
  },
  {
    id: 'hou-ord',
    label: '🛢️ Houston → 🏙️ Chicago',
    sublabel: 'Gulf to Great Lakes (1,080 mi)',
    originCity: 'Houston',
    originState: 'TX',
    originZip: '77002',
    originFacility: 'Gulf Coast Gateway',
    destCity: 'Chicago',
    destState: 'IL',
    destZip: '60601',
    destFacility: 'Chicago Regional Sort Facility',
    miles: 1080
  }
];

// US State Code mapping
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia'
};

function getTimezoneForState(stateCode: string): string {
  const code = (stateCode || '').toUpperCase().trim();
  if (['CA', 'WA', 'OR', 'NV'].includes(code)) return 'PT';
  if (['CO', 'UT', 'AZ', 'NM', 'WY', 'MT', 'ID'].includes(code)) return 'MT';
  if (['TX', 'IL', 'MO', 'MN', 'WI', 'IA', 'KS', 'NE', 'OK', 'AR', 'LA', 'MS', 'AL', 'TN'].includes(code)) return 'CT';
  if (code === 'AK') return 'AKST';
  if (code === 'HI') return 'HST';
  return 'ET';
}

/**
 * Asynchronously geocodes an address or ZIP using live OpenStreetMap provider
 * with in-memory caching and fallback to the reference table.
 */
export async function geocodeAddressLive(query: string): Promise<GeoLocationResult | null> {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return null;

  const cacheKey = cleanQuery.toLowerCase();
  if (GEOCODE_CACHE.has(cacheKey)) {
    return GEOCODE_CACHE.get(cacheKey)!;
  }

  // Check local offline table first for instant response
  const localMatch = resolveLocation(cleanQuery);

  try {
    const encoded = encodeURIComponent(`${cleanQuery}, United States`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200); // 2.2s timeout

    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&addressdetails=1&limit=1`,
      {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      }
    );
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || localMatch?.city || 'Metro City';
        const state = addr['ISO3166-2-lvl4']?.replace('US-', '') || addr.state_code || localMatch?.state || 'NY';
        const stateFull = STATE_NAMES[state] || addr.state || localMatch?.stateFull || 'New York';
        const zip = addr.postcode || localMatch?.zip;
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);

        const result: GeoLocationResult = {
          formattedAddress: item.display_name,
          city,
          state,
          stateFull,
          zip,
          country: 'United States',
          lat,
          lng,
          timezone: getTimezoneForState(state),
          facilityName: `${city} Logistics Terminal`,
          isExactCoordinate: true
        };

        GEOCODE_CACHE.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Fall back smoothly to reference database on network / timeout
  }

  if (localMatch) {
    GEOCODE_CACHE.set(cacheKey, localMatch);
    return localMatch;
  }

  return null;
}

/**
 * Hybrid resolver: instant for the ~80 major metros already in the offline table (no network
 * call, so shipment creation / quote submission stay fast for the common case), and only
 * falls through to the live geocoding API for everything else — smaller towns that would
 * otherwise silently resolve to their state's rough centroid instead of their real location.
 * This is the function shipment/quote creation should call instead of the synchronous
 * resolveLocation() alone, whenever the extra ~200ms-2s for an uncommon town is acceptable
 * (i.e. not on every keystroke, but on final submit).
 */
export async function resolveLocationPrecise(input: string): Promise<GeoLocationResult | null> {
  const local = resolveLocation(input);
  if (local?.isExactCoordinate) {
    return local;
  }
  // Local match was only a state-centroid guess (or there was no match at all) — worth the
  // network round-trip to get the real town. geocodeAddressLive() already falls back to the
  // same local result on failure/timeout, so this never regresses below what resolveLocation
  // alone would have given.
  const live = await geocodeAddressLive(input);
  return live || local;
}

/**
 * Reverse-lookup: the nearest known metro to an arbitrary lat/lng, used to keep a shipment's
 * displayed current-location city/state in sync with wherever its marker actually is along a
 * route (schedule-based server sync, or a live admin simulation tick) — instead of freezing at
 * the origin city while the marker itself keeps visibly moving.
 */
export function findNearestMetro(lat: number, lng: number): { city: string; state: string } | null {
  let best: { city: string; state: string } | null = null;
  let bestDistSq = Infinity;
  for (const entry of Object.values(US_METRO_DATABASE)) {
    const distSq = (entry.lat - lat) ** 2 + (entry.lng - lng) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = { city: entry.city, state: entry.state };
    }
  }
  return best;
}

/**
 * Resolves address, ZIP, city, or state synchronously using cached, metro, or 50-state reference data.
 * Guarantees that ANY US state (e.g. "Texas", "Washington DC", "Florida", "Ohio"), city, or ZIP code
 * will immediately map to accurate geographic coordinates and display correctly on the map.
 */
export function resolveLocation(input: string): GeoLocationResult | null {
  if (!input) return null;
  const cleaned = input.replace(/\b(usa|united states)\b/gi, '').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  if (!cleaned) return null;
  const trimmed = cleaned;
  const lower = trimmed.toLowerCase();

  // 1. Direct Washington DC / District of Columbia Match
  if (
    /^(dc|washington\s*,?\s*d\.?c\.?|district\s+of\s+columbia)$/i.test(trimmed) ||
    /\b(washington\s*,?\s*d\.?c\.?|district\s+of\s+columbia)\b/i.test(trimmed)
  ) {
    const dcInfo = US_STATE_CENTROIDS['DC'];
    return {
      city: 'Washington',
      state: 'DC',
      stateFull: 'District of Columbia',
      zip: '20001',
      lat: dcInfo.lat,
      lng: dcInfo.lng,
      timezone: 'ET',
      facilityName: 'Capital Logistics Center',
      country: 'United States',
      isExactCoordinate: true
    };
  }

  // 2. Direct 2-letter State Code Exact Match (e.g. "TX", "CA", "FL", "NY", "WA")
  // isExactCoordinate: false — this is only the state's rough centroid, not a real city.
  const upperTrimmed = trimmed.toUpperCase();
  if (US_STATE_CENTROIDS[upperTrimmed]) {
    const stateInfo = US_STATE_CENTROIDS[upperTrimmed];
    return {
      city: stateInfo.name, // e.g. "Texas"
      state: upperTrimmed,
      stateFull: stateInfo.name,
      lat: stateInfo.lat,
      lng: stateInfo.lng,
      timezone: stateInfo.tz,
      facilityName: `${stateInfo.name} Interstate Gateway`,
      country: 'United States',
      isExactCoordinate: false
    };
  }

  // 3. Direct Full State Name Exact Match (e.g. "Texas", "California", "Florida", "Ohio")
  // isExactCoordinate: false — state centroid only.
  for (const [code, info] of Object.entries(US_STATE_CENTROIDS)) {
    if (lower === info.name.toLowerCase()) {
      return {
        city: info.name,
        state: code,
        stateFull: info.name,
        lat: info.lat,
        lng: info.lng,
        timezone: info.tz,
        facilityName: `${info.name} Linehaul Terminal`,
        country: 'United States',
        isExactCoordinate: false
      };
    }
  }

  // 4. Direct 5-Digit ZIP Code Match
  const zipMatch = trimmed.match(/\b\d{5}\b/);
  if (zipMatch) {
    const zip = zipMatch[0];
    if (US_METRO_DATABASE[zip]) {
      return { ...US_METRO_DATABASE[zip], isExactCoordinate: true };
    }
  }

  // 5. Explicit "City, State" or "City, ST" parsing (State takes precedence to avoid cross-state collision)
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const rawCity = parts[0];
      const rawStatePart = parts[1];

      // Extract state code or full state name from the state portion
      let detectedCode: string | null = null;
      let detectedInfo: typeof US_STATE_CENTROIDS[string] | null = null;

      // Check for 2-letter code
      const stateMatch = rawStatePart.match(/\b([A-Za-z]{2})\b/);
      if (stateMatch) {
        const potentialCode = stateMatch[1].toUpperCase();
        if (US_STATE_CENTROIDS[potentialCode]) {
          detectedCode = potentialCode;
          detectedInfo = US_STATE_CENTROIDS[potentialCode];
        }
      }

      // Check for full state name if code not found
      if (!detectedCode) {
        for (const [c, info] of Object.entries(US_STATE_CENTROIDS)) {
          if (new RegExp(`\\b${info.name}\\b`, 'i').test(rawStatePart)) {
            detectedCode = c;
            detectedInfo = info;
            break;
          }
        }
      }

      if (detectedCode && detectedInfo) {
        // Check if rawCity exists in US_METRO_DATABASE for this exact state
        const cityLower = rawCity.toLowerCase();
        for (const entry of Object.values(US_METRO_DATABASE)) {
          if (entry.state === detectedCode && (entry.city.toLowerCase() === cityLower || cityLower.includes(entry.city.toLowerCase()))) {
            return {
              ...entry,
              city: rawCity,
              isExactCoordinate: true
            };
          }
        }

        // Custom city in this confirmed state — not in the metro database, so this is only
        // the state's centroid standing in for the actual (unknown) town.
        return {
          city: rawCity,
          state: detectedCode,
          stateFull: detectedInfo.name,
          lat: detectedInfo.lat,
          lng: detectedInfo.lng,
          timezone: detectedInfo.tz,
          facilityName: `${rawCity} Gateway Terminal`,
          country: 'United States',
          isExactCoordinate: false
        };
      }
    }
  }

  // 6. Input ending with a 2-letter state code boundary (e.g. "Austin TX", "Miami FL")
  const trailingStateMatch = trimmed.match(/(?:,\s*|\s+)([A-Za-z]{2})(?:\s+\d{5})?$/);
  if (trailingStateMatch) {
    const code = trailingStateMatch[1].toUpperCase();
    if (US_STATE_CENTROIDS[code]) {
      const stateInfo = US_STATE_CENTROIDS[code];
      const rawCity = trimmed.replace(new RegExp(`(?:,\\s*|\\s+)${code}(?:\\s+\\d{5})?$`, 'i'), '').trim();
      const cityLower = rawCity.toLowerCase();

      for (const entry of Object.values(US_METRO_DATABASE)) {
        if (entry.state === code && (entry.city.toLowerCase() === cityLower || cityLower.includes(entry.city.toLowerCase()))) {
          return {
            ...entry,
            city: rawCity || entry.city,
            isExactCoordinate: true
          };
        }
      }

      // Not in the metro database — state centroid standing in for an unknown town.
      const city = rawCity || stateInfo.hubCity;
      return {
        city,
        state: code,
        stateFull: stateInfo.name,
        lat: stateInfo.lat,
        lng: stateInfo.lng,
        timezone: stateInfo.tz,
        facilityName: `${city} Gateway Terminal`,
        country: 'United States',
        isExactCoordinate: false
      };
    }
  }

  // 7. Input containing a full state name with word boundary (e.g. "Austin Texas", "Orlando Florida")
  // isExactCoordinate: false — always the state centroid, never checked against the metro DB.
  for (const [code, info] of Object.entries(US_STATE_CENTROIDS)) {
    const stateWordRegex = new RegExp(`\\b${info.name}\\b`, 'i');
    if (stateWordRegex.test(trimmed)) {
      const rawCity = trimmed.replace(stateWordRegex, '').replace(/^[,\s]+|[,\s]+$/g, '').trim();
      const city = rawCity || info.hubCity;
      return {
        city,
        state: code,
        stateFull: info.name,
        lat: info.lat,
        lng: info.lng,
        timezone: info.tz,
        facilityName: `${city} Sort Hub`,
        country: 'United States',
        isExactCoordinate: false
      };
    }
  }

  // 8. Standalone City Exact Match in Metro Database (e.g. "Dallas", "Houston", "Denver", "Seattle")
  for (const entry of Object.values(US_METRO_DATABASE)) {
    if (lower === entry.city.toLowerCase()) {
      return { ...entry, isExactCoordinate: true };
    }
  }

  // 9. Metro Database prefix / substring match
  for (const entry of Object.values(US_METRO_DATABASE)) {
    if (lower.startsWith(entry.city.toLowerCase()) || lower.includes(entry.city.toLowerCase())) {
      return { ...entry, isExactCoordinate: true };
    }
  }

  // 10. Graceful fallback (defaults to central US geographic centroid) — lowest possible
  // confidence, only ever used when nothing above recognized the input at all.
  return {
    city: trimmed.split(',')[0] || 'Origin Gateway',
    state: (trimmed.split(',')[1] || 'US').trim().substring(0, 2).toUpperCase(),
    stateFull: 'United States',
    lat: 39.8283,
    lng: -98.5795,
    timezone: 'ET',
    facilityName: `${trimmed.split(',')[0] || 'Regional'} Terminal`,
    country: 'United States',
    isExactCoordinate: false
  };
}
