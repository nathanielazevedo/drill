// The Terrain quiz set: oceans, lakes, mountain ranges, deserts.
// Each entry is [name, type, [west, south, east, north], Natural Earth names].
// The box is an approximate bounding box the map flies to, with the locator ring centered on it
// (same convention Countries uses for its focus frame). The Natural Earth names pick the shape
// that gets filled in: several are unioned (the Pacific is North + South), and some are the
// nearest region Natural Earth has (Arabian Peninsula for the Arabian Desert, Patagonia for the
// Patagonian Desert, Great Basin for its desert). None means ring only (the Mojave isn't in it).
// Longitudes may run past ±180 for features that straddle the antimeridian (e.g. the Pacific),
// the same unwrapped-longitude convention build-data.mjs uses for Russia/Fiji/Kiribati.
export const FEATURES = [
  // ── Oceans ──
  ['Pacific Ocean', 'ocean', [130, -55, 290, 60], ['North Pacific Ocean', 'South Pacific Ocean']],
  ['Atlantic Ocean', 'ocean', [-80, -60, 20, 65], ['North Atlantic Ocean', 'South Atlantic Ocean']],
  ['Indian Ocean', 'ocean', [45, -60, 115, 25], ['INDIAN OCEAN']],
  ['Arctic Ocean', 'ocean', [-10, 70, 70, 80], ['Arctic Ocean']],

  // ── Lakes ──
  ['Caspian Sea', 'lake', [46, 36, 55, 47], ['Caspian Sea']],
  ['Lake Superior', 'lake', [-92, 46, -84, 49], ['Lake Superior']],
  ['Lake Victoria', 'lake', [31, -3, 35, 0.5], ['Lake Victoria']],
  ['Lake Huron', 'lake', [-84.5, 43, -79.5, 46.5], ['Lake Huron']],
  ['Lake Michigan', 'lake', [-88, 41.5, -85, 46], ['Lake Michigan']],
  ['Lake Baikal', 'lake', [103, 51, 110, 56], ['Lake Baikal']],
  ['Lake Tanganyika', 'lake', [29, -8.8, 31.2, -3.3], ['Lake Tanganyika']],
  ['Great Bear Lake', 'lake', [-125, 64.8, -117, 67], ['Great Bear Lake']],
  ['Great Slave Lake', 'lake', [-117, 60.5, -110, 63], ['Great Slave Lake']],
  ['Lake Malawi', 'lake', [33.8, -14.5, 35.3, -9.5], ['Lake Malawi']],
  ['Lake Erie', 'lake', [-83.5, 41.3, -78.8, 43], ['Lake Erie']],
  ['Lake Winnipeg', 'lake', [-99.5, 50.3, -96.3, 54], ['Lake Winnipeg']],
  ['Lake Ontario', 'lake', [-79.9, 43.1, -76, 44.3], ['Lake Ontario']],
  ['Lake Ladoga', 'lake', [29.5, 59.8, 32.9, 61.8], ['Lake Ladoga']],
  ['Lake Balkhash', 'lake', [72.5, 45.5, 79.5, 47], ['Lake Balkhash']],
  ['Lake Titicaca', 'lake', [-70.1, -16.6, -68.5, -15.2], ['Lago Titicaca']],
  ['Lake Nicaragua', 'lake', [-85.9, 11.1, -84.7, 12.2], ['Lago de Nicaragua']],
  ['Lake Chad', 'lake', [13, 12.3, 15, 14.3], ['Lake Chad']],
  ['Aral Sea', 'lake', [58, 43.4, 61.4, 46.8], ['North Aral Sea', 'South Aral Sea']],
  ['Lake Eyre', 'lake', [135.5, -29.9, 138.2, -27.5], ['Lake Eyre North', 'Lake Eyre South']],
  ['Lake Turkana', 'lake', [35.7, 2.2, 36.7, 4.7], ['Lake Turkana']],
  ['Lake Onega', 'lake', [34, 60.9, 36.8, 62.9], ['Lake Onega']],

  // ── Mountain ranges ──
  ['Rocky Mountains', 'mountain', [-125, 32, -104, 60], ['ROCKY MOUNTAINS']],
  ['Andes', 'mountain', [-77, -55, -66, 11], ['ANDES']],
  ['Himalayas', 'mountain', [74, 26, 95, 31], ['HIMALAYAS']],
  ['Alps', 'mountain', [5, 44, 16, 48], ['ALPS']],
  ['Ural Mountains', 'mountain', [57, 50, 67, 68], ['URAL MOUNTAINS']],
  ['Atlas Mountains', 'mountain', [-9, 29, 10, 36], ['ATLAS MOUNTAINS']],
  ['Appalachian Mountains', 'mountain', [-84.5, 33, -68, 47], ['APPALACHIAN MTS.']],
  ['Caucasus Mountains', 'mountain', [38, 41, 49, 44.5], ['CAUCASUS MTS.']],
  ['Alaska Range', 'mountain', [-152, 62, -148, 64.2], ['ALASKA RANGE']],
  ['Sierra Nevada', 'mountain', [-120.5, 35.5, -118, 40], ['SIERRA NEVADA']],
  ['Pyrenees', 'mountain', [-1.8, 42, 3, 43.2], ['PYRENEES']],
  ['Carpathian Mountains', 'mountain', [17, 45, 26.5, 49.5], ['CARPATHIAN MOUNTAINS']],
  ['Great Dividing Range', 'mountain', [143, -37, 153, -16], ['GREAT DIVIDING RANGE']],
  ['Drakensberg', 'mountain', [27.5, -31, 31, -27.5], ['DRAKENSBERG']],
  ['Zagros Mountains', 'mountain', [46, 28, 51, 37], ['ZAGROS MOUNTAINS']],
  ['Tian Shan', 'mountain', [67, 39, 95, 45], ['TIAN SHAN']],
  ['Hindu Kush', 'mountain', [66, 34, 74, 37], ['HINDU KUSH']],
  ['Kunlun Mountains', 'mountain', [75, 34.5, 95, 37.5], ['KUNLUN MOUNTAINS']],
  ['Southern Alps', 'mountain', [169, -44.7, 171.5, -42.5], ['SOUTHERN ALPS']],

  // ── Deserts ──
  ['Sahara', 'desert', [-17, 15, 35, 32], ['SAHARA']],
  ['Arabian Desert', 'desert', [34, 12, 56, 32], ['ARABIAN PENINSULA']],
  ['Gobi Desert', 'desert', [90, 38, 110, 47], ['GOBI DESERT']],
  ['Kalahari Desert', 'desert', [18, -27, 26, -19], ['KALAHARI DESERT']],
  ['Namib Desert', 'desert', [11.5, -28.5, 16.5, -16.5], ['NAMIB DESERT']],
  ['Atacama Desert', 'desert', [-70.5, -27, -68, -19], ['DESIERTO DE ATACAMA']],
  ['Mojave Desert', 'desert', [-118, 34, -114.5, 36.8], []],
  ['Sonoran Desert', 'desert', [-117, 26, -109, 34.5], ['SONORAN DESERT']],
  ['Great Victoria Desert', 'desert', [122, -31, 135, -26.5], ['GREAT VICTORIA DESERT']],
  ['Patagonian Desert', 'desert', [-73, -52, -65, -38], ['PATAGONIA']],
  ['Thar Desert', 'desert', [69, 24, 75, 30], ['THAR DESERT']],
  ['Karakum Desert', 'desert', [53, 36.5, 64, 42.5], ['GARAGUM DESERT']],
  ['Taklamakan Desert', 'desert', [77, 36.5, 89, 41.5], ['TAKLIMAKAN DESERT']],
  ['Chihuahuan Desert', 'desert', [-108, 25, -101, 32], ['CHIHUAHUAN DESERT']],
  ['Great Basin Desert', 'desert', [-120, 36, -112, 43], ['GREAT BASIN']],
  ['Simpson Desert', 'desert', [135, -27.5, 139, -23.5], ['Simpson Desert']],
];
