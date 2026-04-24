//src/services/fallSimulationService.ts

export type SeverityLevel = "low" | "medium" | "high";

export type SimulationSeverity = {
  label: string;
  level: SeverityLevel;
  impactValue: number;
};

export type ResidentialZone = {
  id: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  weight: number;
};

export type BlacklistZone = {
  id: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type SimulatedFallPoint = {
  lat: number;
  lng: number;
  zoneName: string;
};

const BANGKOK_RESIDENTIAL_ZONES: ResidentialZone[] = [
  {
    id: "ladprao",
    name: "ลาดพร้าว",
    minLat: 13.797,
    maxLat: 13.834,
    minLng: 100.592,
    maxLng: 100.635,
    weight: 12,
  },
  {
    id: "bangkapi",
    name: "บางกะปิ",
    minLat: 13.748,
    maxLat: 13.795,
    minLng: 100.615,
    maxLng: 100.676,
    weight: 11,
  },
  {
    id: "huaikhwang",
    name: "ห้วยขวาง",
    minLat: 13.755,
    maxLat: 13.794,
    minLng: 100.562,
    maxLng: 100.602,
    weight: 10,
  },
  {
    id: "dindaeng",
    name: "ดินแดง",
    minLat: 13.755,
    maxLat: 13.786,
    minLng: 100.538,
    maxLng: 100.571,
    weight: 8,
  },
  {
    id: "chatuchak",
    name: "จตุจักร",
    minLat: 13.801,
    maxLat: 13.845,
    minLng: 100.533,
    maxLng: 100.579,
    weight: 10,
  },
  {
    id: "bangna",
    name: "บางนา",
    minLat: 13.651,
    maxLat: 13.698,
    minLng: 100.603,
    maxLng: 100.670,
    weight: 9,
  },
  {
    id: "phrakhanong",
    name: "พระโขนง",
    minLat: 13.690,
    maxLat: 13.731,
    minLng: 100.581,
    maxLng: 100.621,
    weight: 8,
  },
  {
    id: "thonburi",
    name: "ธนบุรี",
    minLat: 13.707,
    maxLat: 13.744,
    minLng: 100.463,
    maxLng: 100.500,
    weight: 8,
  },
  {
    id: "bangkhae",
    name: "บางแค",
    minLat: 13.683,
    maxLat: 13.735,
    minLng: 100.375,
    maxLng: 100.432,
    weight: 7,
  },
  {
    id: "minburi",
    name: "มีนบุรี",
    minLat: 13.789,
    maxLat: 13.851,
    minLng: 100.702,
    maxLng: 100.780,
    weight: 7,
  },
  {
    id: "sathon",
    name: "สาทร",
    minLat: 13.708,
    maxLat: 13.736,
    minLng: 100.523,
    maxLng: 100.553,
    weight: 6,
  },
  {
    id: "bangrak",
    name: "บางรัก",
    minLat: 13.718,
    maxLat: 13.739,
    minLng: 100.507,
    maxLng: 100.532,
    weight: 4,
  },
];

const BANGKOK_BLACKLIST_ZONES: BlacklistZone[] = [
  {
    id: "chaopraya_north",
    name: "แม่น้ำเจ้าพระยา โซนเหนือ",
    minLat: 13.760,
    maxLat: 13.814,
    minLng: 100.470,
    maxLng: 100.501,
  },
  {
    id: "chaopraya_mid",
    name: "แม่น้ำเจ้าพระยา โซนกลาง",
    minLat: 13.720,
    maxLat: 13.759,
    minLng: 100.486,
    maxLng: 100.516,
  },
  {
    id: "chaopraya_south",
    name: "แม่น้ำเจ้าพระยา โซนใต้",
    minLat: 13.671,
    maxLat: 13.719,
    minLng: 100.487,
    maxLng: 100.525,
  },
  {
    id: "lumphini_park",
    name: "สวนลุมพินี",
    minLat: 13.725,
    maxLat: 13.735,
    minLng: 100.539,
    maxLng: 100.551,
  },
  {
    id: "chatuchak_park",
    name: "สวนจตุจักร",
    minLat: 13.807,
    maxLat: 13.819,
    minLng: 100.545,
    maxLng: 100.561,
  },
  {
    id: "sanam_luang",
    name: "สนามหลวง",
    minLat: 13.753,
    maxLat: 13.759,
    minLng: 100.488,
    maxLng: 100.494,
  },
];

const severityPool: Array<{ label: string; level: SeverityLevel; min: number; max: number; weight: number }> = [
  { label: "เล็กน้อย", level: "low", min: 0.8, max: 2.4, weight: 25 },
  { label: "ปานกลาง", level: "medium", min: 2.5, max: 6.5, weight: 50 },
  { label: "รุนแรง", level: "high", min: 6.6, max: 10, weight: 25 },
];

const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const isInsideBox = (
  lat: number,
  lng: number,
  box: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  },
): boolean => {
  return (
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lng >= box.minLng &&
    lng <= box.maxLng
  );
};

const weightedRandom = <T extends { weight: number }>(items: T[]): T => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const item of items) {
    threshold -= item.weight;
    if (threshold <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
};

const roundCoordinate = (value: number): number => {
  return Number(value.toFixed(6));
};

export const getBangkokResidentialZones = (): ResidentialZone[] => {
  return BANGKOK_RESIDENTIAL_ZONES;
};

export const getBangkokBlacklistZones = (): BlacklistZone[] => {
  return BANGKOK_BLACKLIST_ZONES;
};

export const simulateFallPointInBangkok = (): SimulatedFallPoint => {
  const maxAttempts = 120;

  for (let i = 0; i < maxAttempts; i += 1) {
    const zone = weightedRandom(BANGKOK_RESIDENTIAL_ZONES);
    const lat = roundCoordinate(randomBetween(zone.minLat, zone.maxLat));
    const lng = roundCoordinate(randomBetween(zone.minLng, zone.maxLng));

    const isBlacklisted = BANGKOK_BLACKLIST_ZONES.some((blacklistZone) =>
      isInsideBox(lat, lng, blacklistZone),
    );

    if (!isBlacklisted) {
      return {
        lat,
        lng,
        zoneName: zone.name,
      };
    }
  }

  const fallbackZone = BANGKOK_RESIDENTIAL_ZONES[0];

  return {
    lat: roundCoordinate((fallbackZone.minLat + fallbackZone.maxLat) / 2),
    lng: roundCoordinate((fallbackZone.minLng + fallbackZone.maxLng) / 2),
    zoneName: fallbackZone.name,
  };
};

export const generateSimulatedSeverity = (): SimulationSeverity => {
  const selected = weightedRandom(severityPool);

  return {
    label: selected.label,
    level: selected.level,
    impactValue: Number(randomBetween(selected.min, selected.max).toFixed(1)),
  };
};

export const generateSimulatedFallEvent = () => {
  const point = simulateFallPointInBangkok();
  const severity = generateSimulatedSeverity();

  return {
    ...point,
    severity,
    happenedAt: new Date(),
    isSimulated: true,
  };
};