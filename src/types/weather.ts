// WeatherWise API Types

export interface WeatherDay {
  date: string;
  tempmin: number;
  tempmax: number;
  humidity: number;
  windspeed: number;
  precip: number;
  description: string;
}

export interface WeatherTipsResponse {
  location: string;
  unit_group: 'us' | 'metric' | 'uk';
  days: {
    date: string;
    weather: WeatherDay;
    suggestions: string[];
  }[];
}

export interface WeatherApiRequest {
  location?: string;
  lat?: number;
  lon?: number;
  unit_group: 'us' | 'metric' | 'uk';
  focus?: 'thermostat' | 'sprinklers' | 'solar';
  focuses?: ('thermostat' | 'sprinklers' | 'solar')[];
}

export interface WeatherError {
  error: string;
  message?: string;
}