# WeatherWise 🌤️💡

**Smart Energy Tips from Weather Data**

WeatherWise is a full-stack web application that fetches real-time weather data and uses AI to generate personalized, actionable energy-saving tips. Turn weather forecasts into money-saving opportunities!

![WeatherWise Preview](src/assets/hero-weather.jpg)

## ✨ Features

- **Real-time Weather Data**: Integration with WeatherAPI.com
- **AI-Powered Tips**: Local LLM (Ollama) generates personalized energy-saving suggestions
- **Beautiful UI**: Modern, responsive design with soft green & yellow palette
- **Mobile-First**: Fully responsive design that works on all devices
- **Dark/Light Mode**: Energy-efficient theme switching
- **Accessibility**: Semantic HTML and ARIA attributes
- **Share & Copy**: Share tips via email or copy to clipboard

## 🎯 Core Functionality

### Frontend (React + Tailwind)
- Clean, modern interface with weather cards
- Location-based weather tips (5-day forecast)
- Animated transitions and loading states
- Theme toggle (light/dark mode)
- Responsive grid layout
- Toast notifications
- Error handling and loading states

### Backend Integration Ready
- Flask REST API structure provided
- WeatherAPI.com integration
- Google Gemini AI integration
- Deterministic rule-based fallback
- Environment variable configuration

## 🚀 Quick Start

### Frontend Only (Current Status)
```bash
# Clone and install
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Full-Stack Setup
See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) for complete Flask backend implementation.

## 🎨 Design System

WeatherWise uses a carefully crafted design system inspired by nature and energy efficiency:

- **Primary Color**: `#1F8A70` (Soft Green) - Nature, growth, sustainability
- **Accent Color**: `#F6C85F` (Warm Yellow) - Sun, energy, optimism  
- **Neutral**: `#F7FAFC` (Off-white) - Clean, modern, efficient
- **Text**: `#0F172A` (Dark Slate) - Readability, professionalism

### Component Architecture
```
src/
├── components/
│   ├── WeatherCard.tsx     # Daily weather + tips display
│   ├── TipChip.tsx         # Individual tip component
│   └── ui/                 # Reusable UI components
├── types/
│   └── weather.ts          # TypeScript interfaces
├── assets/                 # Generated images & icons
└── pages/
    └── Index.tsx           # Main application page
```

## 🌟 Example Tips Generated

- **"Rain tomorrow — skip sprinklers, save water and pump energy."**
- **"Hot afternoon — set thermostat 3°F higher and use ceiling fans to cut A/C use."**
- **"High winds overnight — expect good turbine output; delay noisy generator use."**

## 🔧 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Lucide React** icons
- **React Query** for data fetching
- **Vite** for build tooling

### Backend (Integration Ready)
- **Flask** (Python) REST API
- **WeatherAPI.com** (weather data)
- **Google Gemini** (AI tips generation)
- **Deterministic fallback** (rule-based tips)
- **PostgreSQL/SQLite** (optional)

## 🎯 API Structure

### POST /api/tips
```json
{
  "location": "Ann Arbor, MI",
  "unit_group": "us"
}
```

**Response:**
```json
{
  "location": "Ann Arbor, MI",
  "unit_group": "us", 
  "days": [
    {
      "date": "2025-09-30",
      "weather": {
        "tempmin": 65, "tempmax": 78,
        "humidity": 45, "windspeed": 12,
        "precip": 0.1, "description": "Partly cloudy"
      },
      "suggestions": [
        "Light rain expected — skip irrigation, save water costs.",
        "Mild temps — open windows instead of running HVAC systems.", 
        "Moderate winds — good conditions for natural ventilation."
      ]
    }
  ]
}
```

## 🔒 Environment Variables

```bash
WEATHERAPI_KEY=your_weather_api_key
GEMINI_API_KEY=your_gemini_api_key
FLASK_ENV=development
```

## 📱 Responsive Design

- **Mobile**: Single column layout, touch-friendly buttons
- **Tablet**: Two-column weather cards
- **Desktop**: Three-column grid with enhanced spacing
- **Animations**: Smooth transitions that respect `prefers-reduced-motion`

## 🧪 Testing

The backend includes comprehensive testing:
- Unit tests for API endpoints
- Mock weather API responses  
- LLM integration testing
- Error handling validation

## 🚀 Deployment Options

1. **Vercel + Heroku**: Frontend on Vercel, backend on Heroku
2. **Render**: Full-stack deployment on single platform
3. **Railway**: Modern deployment with automatic builds
4. **Self-hosted**: Docker containers with reverse proxy

## 🌱 Energy Efficiency Focus

WeatherWise embodies the energy-saving principles it promotes:

- **Optimized Images**: WebP format, lazy loading
- **Efficient CSS**: Design system reduces bundle size
- **Local LLM**: No API costs, private data processing
- **Dark Mode**: Reduces screen energy consumption
- **Performance**: Fast loading, minimal JavaScript

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [Your deployed app URL]
- **Weather API**: [WeatherAPI.com](https://www.weatherapi.com/)
- **AI**: [Google Gemini](https://makersuite.google.com/app/apikey)
- **Design System**: [Tailwind CSS](https://tailwindcss.com/)

---

**WeatherWise** - Turn every forecast into an opportunity to save energy and money! 🌱💰