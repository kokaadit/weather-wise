import { useEffect, useState } from 'react';
import { MapPin, Search, Loader2, AlertCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { WeatherCard } from '@/components/WeatherCard';
import { useToast } from '@/hooks/use-toast';
import { WeatherTipsResponse, WeatherApiRequest, WeatherError } from '@/types/weather';
import heroImage from '@/assets/hero-weather.jpg';
import logoImage from '@/assets/logo.png';

const Index = () => {
  const [location, setLocation] = useState('');
  const [unitGroup, setUnitGroup] = useState<'us' | 'metric' | 'uk'>('us');
  const [focuses, setFocuses] = useState<('thermostat' | 'sprinklers' | 'solar')[]>([]);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherTipsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [lastCoords, setLastCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Real API call to Flask backend (robust to empty/non-JSON error bodies)
  const fetchWeatherTips = async (request: WeatherApiRequest): Promise<WeatherTipsResponse> => {
    const res = await fetch('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const text = await res.text();

    if (!text) {
      if (!res.ok) {
        throw new Error(`Request failed (status ${res.status})`);
      }
      throw new Error('Empty response from server');
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) {
        throw new Error(`Request failed (status ${res.status})`);
      }
      throw new Error('Server returned non-JSON');
    }

    if (!res.ok) {
      // If the proxy blocks (403), try direct backend URL as fallback(s)
      if (res.status === 403) {
        const tryDirect = async (base: string) => {
          const r = await fetch(`${base}/api/tips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          });
          const t = await r.text();
          if (!t) throw new Error(`Request failed (status ${r.status})`);
          let d: any;
          try { d = JSON.parse(t); } catch { throw new Error('Server returned non-JSON'); }
          if (!r.ok) {
            const err = (d as WeatherError)?.error;
            throw new Error(err || `Request failed (status ${r.status})`);
          }
          return d as WeatherTipsResponse;
        };

        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const candidates = [
          `http://${host}:5000`,
          'http://127.0.0.1:5000',
          'http://localhost:5000',
        ];
        for (const base of candidates) {
          try {
            return await tryDirect(base);
          } catch (_) {
            // try next
          }
        }
      }
      const err = (data as WeatherError)?.error;
      throw new Error(err || `Request failed (status ${res.status})`);
    }

    return data as WeatherTipsResponse;
  };

  // Track last submitted inputs to prevent no-op submissions
  const [lastQuery, setLastQuery] = useState<{ location: string; unit: 'us'|'metric'|'uk'; focuses: string[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location.trim() && !lastCoords) {
      toast({ variant: "destructive", title: "Location required", description: "Enter a location or allow location access." });
      return;
    }

    // Guard: disallow if user hasn't changed location, unit, or focuses
    const current = { location: location.trim(), unit: unitGroup, focuses: [...focuses].sort() };
    const unchanged =
      lastQuery &&
      lastQuery.location === current.location &&
      lastQuery.unit === current.unit &&
      JSON.stringify(lastQuery.focuses) === JSON.stringify(current.focuses);
    if (unchanged) {
      toast({ variant: "destructive", title: "No changes detected", description: "Update location or focus to get new tips." });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const base: WeatherApiRequest = location.trim()
        ? { location: location.trim(), unit_group: unitGroup }
        : lastCoords
          ? { lat: lastCoords.lat, lon: lastCoords.lon, unit_group: unitGroup }
          : { unit_group: unitGroup } as WeatherApiRequest;
      const request: WeatherApiRequest = focuses.length ? { ...base, focuses } : base;

      const data = await fetchWeatherTips(request);
      setWeatherData(data);
      setLastQuery(current);
      
      toast({
        title: "Weather tips loaded!",
        description: `Found ${data.days.length} days of energy-saving tips for ${data.location}.`
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather tips';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // On mount: ask for geolocation and auto-fetch tips for tomorrow
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setLastCoords({ lat: latitude, lon: longitude });
          const req: WeatherApiRequest = focuses.length
            ? { lat: latitude, lon: longitude, unit_group: unitGroup, focuses }
            : { lat: latitude, lon: longitude, unit_group: unitGroup };
          const data = await fetchWeatherTips(req);
          setWeatherData(data);
          setError(null);
          setLastQuery({ location: "", unit: unitGroup, focuses: [...focuses].sort() });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather tips';
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      },
      (geoErr) => {
        setLoading(false);
        // Non-blocking: user can still search manually
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareAllTips = () => {
    if (!weatherData) return;
    
    const allTips = weatherData.days.flatMap(day => 
      day.suggestions.map(tip => `${day.date}: ${tip}`)
    ).join('\\n\\n');
    
    const shareText = `WeatherWise Tips for ${weatherData.location}:\\n\\n${allTips}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'WeatherWise Energy Tips',
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Tips copied!",
        description: "All energy-saving tips have been copied to your clipboard."
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="WeatherWise Logo" className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold gradient-text">WeatherWise</h1>
                <p className="text-xs text-muted-foreground">Smart energy tips from weather data</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background/60 to-accent/20"></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 animate-fade-in">
              Turn Weather Data Into 
              <span className="gradient-text"> Energy Savings</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 animate-slide-up">
              Get personalized, AI-powered tips to reduce energy waste and save money based on your local weather forecast.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSubmit} className="space-y-4 animate-bounce-in">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Enter your location (e.g., Ann Arbor, MI)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                <Select value={unitGroup} onValueChange={(value: 'us' | 'metric' | 'uk') => setUnitGroup(value)}>
                  <SelectTrigger className="w-full sm:w-32 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">US (°F)</SelectItem>
                    <SelectItem value="metric">Metric (°C)</SelectItem>
                    <SelectItem value="uk">UK</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  type="submit" 
                  className="btn-hero h-12 px-8"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Get Tips
                </Button>
              </div>

              {/* Focus toggles under the search controls */}
              <div className="text-left">
                <ToggleGroup
                  type="multiple"
                  value={focuses as any}
                  onValueChange={(vals) => setFocuses(vals as any)}
                  className="flex flex-wrap gap-2"
                >
                  <ToggleGroupItem value="thermostat" aria-label="Thermostat focus">Thermostat</ToggleGroupItem>
                  <ToggleGroupItem value="sprinklers" aria-label="Sprinklers focus">Sprinklers</ToggleGroupItem>
                  <ToggleGroupItem value="solar" aria-label="Solar focus">Solar</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6 animate-slide-up">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-lg">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Analyzing weather data and generating energy tips...</span>
            </div>
          </div>
        )}

        {weatherData && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">
                  3-Day Energy Tips for your location
                </h3>
                <p className="text-muted-foreground">
                  Personalized recommendations to save energy and money
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={shareAllTips}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share All Tips
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {weatherData.days.map((day, index) => (
                <WeatherCard
                  key={day.date}
                  date={day.date}
                  weather={day.weather}
                  suggestions={day.suggestions}
                />
              ))}
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                💡 Tips are generated locally via your Flask backend at <code>/api/tips</code>.
              </p>
            </div>
          </div>
        )}

        {!weatherData && !loading && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold mb-2">Ready to Save Energy?</h3>
              <p className="text-muted-foreground">
                Enter your location above to get personalized energy-saving tips based on your local weather forecast.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            WeatherWise • Powered by Visual Crossing Weather API & Local LLM • 
            Built with React, Tailwind & Flask
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;