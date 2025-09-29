# WeatherWise Backend Integration (Local, Gemini)

This guide provides a minimal, local-only Flask backend that matches what the frontend expects and uses the Gemini API for generating tips. No production/deployment steps, no extra services.

## What the frontend expects

- Endpoint: `POST /api/tips`
- Request body:
  ```json
  { "location": "Ann Arbor, MI", "unit_group": "us" }
  ```
- Response body (per `src/types/weather.ts`):
  ```json
  {
    "location": "Ann Arbor, MI",
    "unit_group": "us",
    "days": [
      {
        "date": "2025-09-30",
        "weather": {
          "date": "2025-09-30",
          "tempmin": 65,
          "tempmax": 78,
          "humidity": 45,
          "windspeed": 12,
          "precip": 0.1,
          "description": "Partly cloudy"
        },
        "suggestions": ["...", "...", "..."]
      }
    ]
  }
  ```

## Minimal backend (Flask + Gemini)

### 1) Create files

```
backend/
├── app.py
└── requirements.txt
```

`requirements.txt`
```
Flask==2.3.3
Flask-CORS==4.0.0
requests==2.31.0
python-dotenv==1.0.0
google-generativeai==0.7.2
```

`app.py`
```python
import os
import json
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
CORS(app)

WEATHERAPI_KEY = os.getenv("WEATHERAPI_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def get_weather_forecast(location: str, unit_group: str = "us") -> list:
    if not WEATHERAPI_KEY:
        raise RuntimeError("WEATHERAPI_KEY not set")

    url = "https://api.weatherapi.com/v1/forecast.json"
    params = {
        "key": WEATHERAPI_KEY,
        "q": location,
        "days": 3,
        "aqi": "no",
        "alerts": "no",
    }

    r = requests.get(url, params=params, timeout=12)
    r.raise_for_status()
    data = r.json()

    forecast_days = data.get("forecast", {}).get("forecastday", [])
    days = []
    for fd in forecast_days[:3]:
        day = fd.get("day", {})
        condition = day.get("condition", {})
        if unit_group == "us":
            tempmin = day.get("mintemp_f")
            tempmax = day.get("maxtemp_f")
            windspeed = day.get("maxwind_mph")
            precip = day.get("totalprecip_in")
        else:
            tempmin = day.get("mintemp_c")
            tempmax = day.get("maxtemp_c")
            windspeed = day.get("maxwind_mph")
            precip = day.get("totalprecip_in")

        days.append(
            {
                "date": fd.get("date"),
                "tempmin": tempmin,
                "tempmax": tempmax,
                "humidity": day.get("avghumidity"),
                "windspeed": windspeed,
                "precip": precip or 0,
                "description": condition.get("text", "Clear"),
            }
        )
    return days


def get_fallback_tips(day: dict) -> list:
    tips = []
    temp_max = day.get("tempmax", 70) or 70
    precip = day.get("precip", 0) or 0
    wind = day.get("windspeed", 0) or 0

    tips.append(
        "Rain expected — skip sprinklers, save water and pump energy." if precip > 0.1
        else "Dry conditions — water in evening for efficiency."
    )
    if temp_max > 85:
        tips.append("Hot day — set thermostat 3°F higher; use fans to cut A/C use.")
    elif temp_max < 60:
        tips.append("Cool weather — lower heat by 2°F and wear layers to save energy.")
    else:
        tips.append("Mild temps — open windows instead of running HVAC systems.")
    tips.append(
        "High winds — expect good turbine output; delay noisy generator use." if wind > 15
        else "Calm conditions — run appliances during off-peak hours for savings."
    )
    return tips[:3]


def generate_tips_gemini(day: dict) -> list:
    if not GEMINI_API_KEY:
        # If no key configured, fall back without erroring
        return get_fallback_tips(day)

    model = genai.GenerativeModel(GEMINI_MODEL)
    prompt = (
        "You generate actionable energy- and cost-saving tips based on a single day's "
        "weather forecast.\n"
        f"Input JSON: {json.dumps(day)}\n\n"
        "Return only a JSON object: {\"suggestions\": [\"tip1\", \"tip2\", \"tip3\"]}.\n"
        "Rules: exactly three suggestions; each 6–20 words; each includes an action "
        "and expected benefit (energy, water, or money). Prefer concrete settings."
    )

    res = model.generate_content(prompt)
    text = (res.text or "").strip()

    # Best-effort to parse JSON; fall back if parsing fails
    try:
        # Remove common code-fence wrappers
        text = text.strip("`\n ")
        data = json.loads(text)
        out = data.get("suggestions")
        if isinstance(out, list) and len(out) == 3:
            return [str(x) for x in out]
    except Exception:
        pass

    return get_fallback_tips(day)


@app.post("/api/tips")
def tips():
    try:
        body = request.get_json(force=True) or {}
        location = str(body.get("location", "")).strip()
        unit_group = body.get("unit_group", "us")
        if not location:
            return jsonify({"error": "Location is required"}), 400

        forecast = get_weather_forecast(location, unit_group)

        days = []
        for d in forecast:
            suggestions = generate_tips_gemini(d)
            days.append(
                {
                    "date": d["date"],
                    "weather": {"date": d["date"], **d},
                    "suggestions": suggestions,
                }
            )

        return jsonify({"location": location, "unit_group": unit_group, "days": days})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

### 2) Environment

Create a `.env` file in `backend/`:
```
WEATHERAPI_KEY=your_weatherapi_key
GEMINI_API_KEY=your_gemini_key
# Optional model override:
# GEMINI_MODEL=gemini-1.5-pro
```

### 3) Run locally

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs at `http://localhost:5000`.

## Frontend change (one function)

Replace the mock in `src/pages/Index.tsx` with this call:

```ts
const fetchWeatherTips = async (request: WeatherApiRequest): Promise<WeatherTipsResponse> => {
  const res = await fetch("/api/tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const err: WeatherError = await res.json();
    throw new Error(err.error || "Failed to fetch weather tips");
  }
  return res.json();
};
```

That’s it. Keep both processes running locally:
- Frontend: `npm run dev` (port 8080)
- Backend: `python app.py` (port 5000)

No additional services or deployment steps are required.