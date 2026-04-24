//src/services/hospitalService.ts

import {
  HOSPITALS,
  calculateDistance,
  estimateTravelMinutes,
  type HospitalDistanceItem,
  type HospitalItem,
} from "../unit/distance";

const LONGDO_API_KEY = "1afa8f91fa27973c6bff0322201a437e";

const VALID_PREFIXES = [
  "โรงพยาบาล",
  "รพ.",
  "ศูนย์การแพทย์",
  "สถานพยาบาล",
];

const FORBIDDEN_WORDS = [
  "ตู้",
  "เต่าบิน",
  "7-Eleven",
  "เซเว่น",
  "ATM",
  "ถนน",
  "ซอย",
];

const normalizeLongdoHospital = (
  sourceLat: number,
  sourceLng: number,
  item: any,
): HospitalDistanceItem | null => {
  const name = String(item?.name || "").trim();
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const hasValidPrefix = VALID_PREFIXES.some((prefix) => name.startsWith(prefix));
  const hasForbiddenWord = FORBIDDEN_WORDS.some((word) => name.includes(word));

  if (!hasValidPrefix || hasForbiddenWord) {
    return null;
  }

  const distance = calculateDistance(sourceLat, sourceLng, lat, lng);

  return {
    id: String(item?.id || `${name}-${lat}-${lng}`),
    name,
    lat,
    lng,
    phone: item?.tel || "1669",
    distance,
    estimatedMinutes: estimateTravelMinutes(distance),
  };
};

export const getFallbackNearbyHospitals = (
  lat: number,
  lng: number,
  limit = 5,
): HospitalDistanceItem[] => {
  return HOSPITALS.map((hospital: HospitalItem) => {
    const distance = calculateDistance(lat, lng, hospital.lat, hospital.lng);

    return {
      ...hospital,
      distance,
      estimatedMinutes: estimateTravelMinutes(distance),
    };
  })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};

export const getNearbyHospitals = async (
  lat: number,
  lng: number,
  limit = 5,
): Promise<HospitalDistanceItem[]> => {
  if (!lat || !lng) {
    return [];
  }

  try {
    const url =
      `https://search.longdo.com/mapsearch/json/search?keyword=โรงพยาบาล` +
      `&limit=20&lat=${lat}&lon=${lng}&span=0.2&key=${LONGDO_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Longdo API error: ${response.status}`);
    }

    const result = await response.json();

    const items = Array.isArray(result?.data) ? result.data : [];

    const hospitals = items
      .map((item: any) => normalizeLongdoHospital(lat, lng, item))
      .filter(Boolean) as HospitalDistanceItem[];

    if (hospitals.length === 0) {
      return getFallbackNearbyHospitals(lat, lng, limit);
    }

    return hospitals
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  } catch (error) {
    console.error("getNearbyHospitals error:", error);
    return getFallbackNearbyHospitals(lat, lng, limit);
  }
};

export const getNearestHospital = async (
  lat: number,
  lng: number,
): Promise<HospitalDistanceItem | null> => {
  const hospitals = await getNearbyHospitals(lat, lng, 1);
  return hospitals.length > 0 ? hospitals[0] : null;
};