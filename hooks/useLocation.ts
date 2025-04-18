import { useState, useEffect } from "react";
import * as Location from "expo-location";

export const useLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLocationLoading(true);
      setLocationErrorMsg(null);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationErrorMsg(
          "Permission to access location was denied. Please enable it in settings."
        );
        setIsLocationLoading(false);
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation, // Highest accuracy
        });
        setLocation(currentLocation);
        console.log("Fetched Location:", currentLocation.coords);
      } catch (error) {
        console.error("Error fetching location:", error);
        setLocationErrorMsg("Failed to fetch location.");
      } finally {
        setIsLocationLoading(false);
      }
    })();
  }, []);

  return { location, locationErrorMsg, isLocationLoading };
};
