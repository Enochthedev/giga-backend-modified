import axios from 'axios';
import { logger } from 'common';

const apiKey = process.env.API_KEY as string;

const getRoute = async (startLocation: string, endLocation: string) => {
  logger.info(apiKey);
  
  const routingEndpoint = `https://api.tomtom.com/routing/1/calculateRoute/${startLocation}:${endLocation}/json`;
  try {
    const response = await axios.get(routingEndpoint, {
      params: {
        key: "o3ZCkcG0PQXX37wC6rHfogTIHcFzlLIa"
      },
    });

    const route = response.data.routes[0];
    logger.info('Route Summary: ' + JSON.stringify(route.summary));

    

   return route
  } catch (error) {
    logger.error('Error fetching route:', error);
  }
}

const geocodeAddress = async (address: string) => {
  const geocodeEndpoint = `https://api.tomtom.com/search/2/geocode/${address}.json`;
  try {

    const response = await axios.get(geocodeEndpoint, {
      params: {
        key: apiKey,
      },
    });

    const location = response.data.results[0].position;
    logger.info('Geocoded Location: ' + JSON.stringify(location));

    // Sample Response:
    /*
    Geocoded Location: { lat: 40.7128, lon: -74.0060 }
    
    */
    return location
  } catch (error) {
    logger.error('Error geocoding address:', error);
    
  }
};
export default {
    getRoute,
    geocodeAddress
};