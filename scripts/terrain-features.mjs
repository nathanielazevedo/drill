// The Terrain quiz set: oceans, lakes, mountain ranges, deserts.
// Each entry is [name, type, [west, south, east, north]] — an approximate bounding box.
// These features don't have crisp official boundaries, so the game shows a locator ring
// centered on the box (same convention Countries uses for its focus frame) rather than a
// precise outline. Longitudes may run past ±180 for features that straddle the antimeridian
// (e.g. the Pacific), the same unwrapped-longitude convention build-data.mjs uses for
// Russia/Fiji/Kiribati.
export const FEATURES = [
  // ── Oceans ──
  ['Pacific Ocean', 'ocean', [130, -55, 290, 60]],
  ['Atlantic Ocean', 'ocean', [-80, -60, 20, 65]],
  ['Indian Ocean', 'ocean', [45, -60, 115, 25]],
  ['Arctic Ocean', 'ocean', [-10, 70, 70, 80]],

  // ── Lakes ──
  ['Caspian Sea', 'lake', [46, 36, 55, 47]],
  ['Lake Superior', 'lake', [-92, 46, -84, 49]],
  ['Lake Victoria', 'lake', [31, -3, 35, 0.5]],
  ['Lake Huron', 'lake', [-84.5, 43, -79.5, 46.5]],
  ['Lake Michigan', 'lake', [-88, 41.5, -85, 46]],
  ['Lake Baikal', 'lake', [103, 51, 110, 56]],
  ['Lake Tanganyika', 'lake', [29, -8.8, 31.2, -3.3]],
  ['Great Bear Lake', 'lake', [-125, 64.8, -117, 67]],
  ['Great Slave Lake', 'lake', [-117, 60.5, -110, 63]],
  ['Lake Malawi', 'lake', [33.8, -14.5, 35.3, -9.5]],
  ['Lake Erie', 'lake', [-83.5, 41.3, -78.8, 43]],
  ['Lake Winnipeg', 'lake', [-99.5, 50.3, -96.3, 54]],
  ['Lake Ontario', 'lake', [-79.9, 43.1, -76, 44.3]],
  ['Lake Ladoga', 'lake', [29.5, 59.8, 32.9, 61.8]],
  ['Lake Balkhash', 'lake', [72.5, 45.5, 79.5, 47]],
  ['Lake Titicaca', 'lake', [-70.1, -16.6, -68.5, -15.2]],
  ['Lake Nicaragua', 'lake', [-85.9, 11.1, -84.7, 12.2]],
  ['Lake Chad', 'lake', [13, 12.3, 15, 14.3]],
  ['Aral Sea', 'lake', [58, 43.4, 61.4, 46.8]],
  ['Lake Eyre', 'lake', [135.5, -29.9, 138.2, -27.5]],
  ['Lake Turkana', 'lake', [35.7, 2.2, 36.7, 4.7]],
  ['Lake Onega', 'lake', [34, 60.9, 36.8, 62.9]],

  // ── Mountain ranges ──
  ['Rocky Mountains', 'mountain', [-125, 32, -104, 60]],
  ['Andes', 'mountain', [-77, -55, -66, 11]],
  ['Himalayas', 'mountain', [74, 26, 95, 31]],
  ['Alps', 'mountain', [5, 44, 16, 48]],
  ['Ural Mountains', 'mountain', [57, 50, 67, 68]],
  ['Atlas Mountains', 'mountain', [-9, 29, 10, 36]],
  ['Appalachian Mountains', 'mountain', [-84.5, 33, -68, 47]],
  ['Caucasus Mountains', 'mountain', [38, 41, 49, 44.5]],
  ['Alaska Range', 'mountain', [-152, 62, -148, 64.2]],
  ['Sierra Nevada', 'mountain', [-120.5, 35.5, -118, 40]],
  ['Pyrenees', 'mountain', [-1.8, 42, 3, 43.2]],
  ['Carpathian Mountains', 'mountain', [17, 45, 26.5, 49.5]],
  ['Great Dividing Range', 'mountain', [143, -37, 153, -16]],
  ['Drakensberg', 'mountain', [27.5, -31, 31, -27.5]],
  ['Zagros Mountains', 'mountain', [46, 28, 51, 37]],
  ['Tian Shan', 'mountain', [67, 39, 95, 45]],
  ['Hindu Kush', 'mountain', [66, 34, 74, 37]],
  ['Kunlun Mountains', 'mountain', [75, 34.5, 95, 37.5]],
  ['Southern Alps', 'mountain', [169, -44.7, 171.5, -42.5]],

  // ── Deserts ──
  ['Sahara', 'desert', [-17, 15, 35, 32]],
  ['Arabian Desert', 'desert', [34, 12, 56, 32]],
  ['Gobi Desert', 'desert', [90, 38, 110, 47]],
  ['Kalahari Desert', 'desert', [18, -27, 26, -19]],
  ['Namib Desert', 'desert', [11.5, -28.5, 16.5, -16.5]],
  ['Atacama Desert', 'desert', [-70.5, -27, -68, -19]],
  ['Mojave Desert', 'desert', [-118, 34, -114.5, 36.8]],
  ['Sonoran Desert', 'desert', [-117, 26, -109, 34.5]],
  ['Great Victoria Desert', 'desert', [122, -31, 135, -26.5]],
  ['Patagonian Desert', 'desert', [-73, -52, -65, -38]],
  ['Thar Desert', 'desert', [69, 24, 75, 30]],
  ['Karakum Desert', 'desert', [53, 36.5, 64, 42.5]],
  ['Taklamakan Desert', 'desert', [77, 36.5, 89, 41.5]],
  ['Chihuahuan Desert', 'desert', [-108, 25, -101, 32]],
  ['Great Basin Desert', 'desert', [-120, 36, -112, 43]],
  ['Simpson Desert', 'desert', [135, -27.5, 139, -23.5]],
];
