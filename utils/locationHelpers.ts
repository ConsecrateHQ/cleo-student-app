import { GeoPoint } from "firebase/firestore";

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the distance between two geographical points using the Haversine formula.
 * @param point1 - The first point with latitude and longitude.
 * @param point2 - The second point with latitude and longitude.
 * @returns The distance in meters.
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180; // φ, λ in radians
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in meters
  return distance;
}

/**
 * Checks if a point is within a specified radius of a center point.
 * Firestore GeoPoint is compatible with the Coordinates interface.
 * @param center - The center point coordinates (e.g., session location). Can be Firestore GeoPoint.
 * @param point - The point to check (e.g., student location).
 * @param radius - The radius in meters.
 * @returns True if the point is within the radius, false otherwise.
 */
export function isWithinRadius(
  center: GeoPoint | Coordinates,
  point: Coordinates,
  radius: number
): boolean {
  // Ensure center has latitude/longitude properties (like GeoPoint or Coordinates)
  if (
    typeof center?.latitude !== "number" ||
    typeof center?.longitude !== "number"
  ) {
    console.warn("Invalid center point provided to isWithinRadius");
    return false;
  }
  if (
    typeof point?.latitude !== "number" ||
    typeof point?.longitude !== "number"
  ) {
    console.warn("Invalid point provided to isWithinRadius");
    return false;
  }

  const distance = calculateDistance(
    { latitude: center.latitude, longitude: center.longitude },
    point
  );

  // Debug log the actual distance for comparison
  console.log(
    `🔍 Distance calculation: ${distance.toFixed(2)}m (Radius: ${radius}m)`
  );

  return distance <= radius;
}

/**
 * Validates if a student's location is within the attendance radius of a class session.
 * Acts as a semantic wrapper around isWithinRadius.
 *
 * @param sessionLocation - The location coordinates of the class session
 * @param studentLocation - The location coordinates of the student
 * @param attendanceRadius - The radius (in meters) within which attendance is valid
 * @returns True if the student's location is valid for attendance, false otherwise
 */
export function validateLocationForSession(
  sessionLocation: GeoPoint | Coordinates,
  studentLocation: Coordinates,
  attendanceRadius: number = 100 // Default radius of 100 meters
): boolean {
  return isWithinRadius(sessionLocation, studentLocation, attendanceRadius);
}
