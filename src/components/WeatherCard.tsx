import { Calendar, Thermometer, Droplets, Wind, Eye } from 'lucide-react';
import { WeatherDay } from '@/types/weather';
import { TipChip } from './TipChip';

interface WeatherCardProps {
  date: string;
  weather: WeatherDay;
  suggestions: string[];
}

export const WeatherCard = ({ date, weather, suggestions }: WeatherCardProps) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('shower')) return '🌧️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('clear') || desc.includes('sunny')) return '☀️';
    if (desc.includes('storm') || desc.includes('thunder')) return '⛈️';
    if (desc.includes('wind')) return '💨';
    return '🌤️';
  };

  return (
    <div className="weather-card animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="weather-icon text-2xl">
            {getWeatherIcon(weather.description)}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              {formatDate(date)}
            </h3>
            <p className="text-sm text-muted-foreground capitalize">
              {weather.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Thermometer className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {Math.round(weather.tempmin)}°-{Math.round(weather.tempmax)}°
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Droplets className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {weather.humidity}%
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wind className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {Math.round(weather.windspeed)} mph
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            {weather.precip}" rain
          </span>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-sm text-foreground mb-3">
          💡 Energy & Money-Saving Tips
        </h4>
        <div className="space-y-2">
          {suggestions.map((tip, index) => (
            <TipChip key={index} tip={tip} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};