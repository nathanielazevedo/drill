// The quiz set: China's 31 mainland provincial-level divisions plus Hong Kong and Macau.
// Taiwan is left out here (it's in the Countries quiz) and drawn as grey context.
// [display name, Natural Earth admin-1 name, or { country } for a world-atlas country, region, accepted alternate answers]
export const PROVINCES = [
  // ── North ──
  ['Beijing', 'Beijing', 'North', ['Peking']],
  ['Tianjin', 'Tianjin', 'North', ['Tientsin']],
  ['Hebei', 'Hebei', 'North'],
  ['Shanxi', 'Shanxi', 'North'],
  ['Inner Mongolia', 'Inner Mongol', 'North', ['Nei Mongol']],

  // ── Northeast ──
  ['Liaoning', 'Liaoning', 'Northeast'],
  ['Jilin', 'Jilin', 'Northeast'],
  ['Heilongjiang', 'Heilongjiang', 'Northeast'],

  // ── East ──
  ['Shanghai', 'Shanghai', 'East'],
  ['Jiangsu', 'Jiangsu', 'East'],
  ['Zhejiang', 'Zhejiang', 'East'],
  ['Anhui', 'Anhui', 'East'],
  ['Fujian', 'Fujian', 'East'],
  ['Jiangxi', 'Jiangxi', 'East'],
  ['Shandong', 'Shandong', 'East'],

  // ── Central & South ──
  ['Henan', 'Henan', 'Central & South'],
  ['Hubei', 'Hubei', 'Central & South'],
  ['Hunan', 'Hunan', 'Central & South'],
  ['Guangdong', 'Guangdong', 'Central & South', ['Canton']],
  ['Guangxi', 'Guangxi', 'Central & South'],
  ['Hainan', 'Hainan', 'Central & South'],
  ['Hong Kong', { country: 'Hong Kong' }, 'Central & South'],
  ['Macau', { country: 'Macao' }, 'Central & South', ['Macao']],

  // ── Southwest ──
  ['Chongqing', 'Chongqing', 'Southwest', ['Chungking']],
  ['Sichuan', 'Sichuan', 'Southwest', ['Szechuan']],
  ['Guizhou', 'Guizhou', 'Southwest'],
  ['Yunnan', 'Yunnan', 'Southwest'],
  ['Tibet', 'Xizang', 'Southwest', ['Xizang']],

  // ── Northwest ──
  ['Shaanxi', 'Shaanxi', 'Northwest'],
  ['Gansu', 'Gansu', 'Northwest'],
  ['Qinghai', 'Qinghai', 'Northwest'],
  ['Ningxia', 'Ningxia', 'Northwest'],
  ['Xinjiang', 'Xinjiang', 'Northwest'],
];
