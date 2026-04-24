//src/unit/distance.ts

export type HospitalItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  phone: string;
};

export type HospitalDistanceItem = HospitalItem & {
  distance: number;
  estimatedMinutes: number;
};

// ฟังก์ชันคำนวณระยะทางระหว่าง 2 จุด (Lat/Lng) หน่วยเป็นกิโลเมตร
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // รัศมีของโลก (กิโลเมตร)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const estimateTravelMinutes = (distanceKm: number): number => {
  const averageCitySpeedKmPerHour = 35;
  return Math.max(1, Math.ceil((distanceKm / averageCitySpeedKmPerHour) * 60));
};

// ฐานข้อมูลจำลองของโรงพยาบาล (fallback)
export const HOSPITALS: HospitalItem[] = [
  {
    id: "h1",
    name: "โรงพยาบาลศิริราช",
    lat: 13.7574,
    lng: 100.4862,
    phone: "024191000",
  },
  {
    id: "h2",
    name: "โรงพยาบาลจุฬาลงกรณ์",
    lat: 13.7314,
    lng: 100.5334,
    phone: "022564000",
  },
  {
    id: "h3",
    name: "โรงพยาบาลรามาธิบดี",
    lat: 13.7668,
    lng: 100.5274,
    phone: "022011000",
  },
  {
    id: "h4",
    name: "โรงพยาบาลราชวิถี",
    lat: 13.7651,
    lng: 100.5361,
    phone: "023548108",
  },
  {
    id: "h5",
    name: "โรงพยาบาลกลาง",
    lat: 13.7437,
    lng: 100.5088,
    phone: "022208000",
  },
  {
    id: "h6",
    name: "โรงพยาบาลเจริญกรุงประชารักษ์",
    lat: 13.6909,
    lng: 100.5078,
    phone: "022896000",
  },
  {
    id: "h7",
    name: "โรงพยาบาลพระมงกุฎเกล้า",
    lat: 13.7698,
    lng: 100.5347,
    phone: "027633000",
  },
  {
    id: "h8",
    name: "โรงพยาบาลนพรัตนราชธานี",
    lat: 13.8247,
    lng: 100.6831,
    phone: "025483333",
  },
];

export const withHospitalDistance = (
  sourceLat: number,
  sourceLng: number,
  hospitals: HospitalItem[],
): HospitalDistanceItem[] => {
  return hospitals
    .map((hospital) => {
      const distance = calculateDistance(
        sourceLat,
        sourceLng,
        hospital.lat,
        hospital.lng,
      );

      return {
        ...hospital,
        distance,
        estimatedMinutes: estimateTravelMinutes(distance),
      };
    })
    .sort((a, b) => a.distance - b.distance);
};

export const findNearestHospital = (
  sourceLat: number,
  sourceLng: number,
  hospitals: HospitalItem[] = HOSPITALS,
): HospitalDistanceItem | null => {
  const sorted = withHospitalDistance(sourceLat, sourceLng, hospitals);
  return sorted.length > 0 ? sorted[0] : null;
};