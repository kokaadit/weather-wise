import os
import json
import random
from datetime import datetime, timedelta

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    import google.generativeai as genai
except Exception:  # pragma: no cover - optional at dev time
    genai = None


load_dotenv()

app = Flask(__name__)
CORS(app)


WEATHERAPI_KEY = os.getenv("WEATHERAPI_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if GEMINI_API_KEY and genai is not None:
    genai.configure(api_key=GEMINI_API_KEY)


def _mock_forecast_3_days() -> list:
    days = []
    for offset in (1, 2, 3):  # Start from tomorrow (offset 1)
        dt = datetime.now() + timedelta(days=offset)
        tempmin = 60 + random.uniform(-5, 5)
        tempmax = 75 + random.uniform(-5, 10)
        days.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "tempmin": round(tempmin, 1),
                "tempmax": round(tempmax, 1),
                "humidity": int(35 + random.uniform(0, 50)),
                "windspeed": round(5 + random.uniform(0, 20), 1),
                "precip": round(max(0, random.uniform(0, 0.5)), 2),
                "description": random.choice(
                    ["Clear skies", "Partly cloudy", "Light rain", "Sunny", "Scattered clouds"]
                ),
            }
        )
    return days


def get_weather_forecast(location_param: str, unit_group: str = "us") -> list:
    """Return list with WeatherDay objects for the next 3 days (tomorrow + 2).

    Uses WeatherAPI if WEATHERAPI_KEY is set; otherwise returns a mock forecast
    so local development works without external keys.
    """

    if not WEATHERAPI_KEY:
        return _mock_forecast_3_days()

    # WeatherAPI forecast (4 days to get tomorrow + next 2)
    url = "https://api.weatherapi.com/v1/forecast.json"
    params = {
        "key": WEATHERAPI_KEY,
        "q": location_param,
        "days": 4,
        "aqi": "no",
        "alerts": "no",
    }

    try:
        r = requests.get(url, params=params, timeout=12)
        r.raise_for_status()
        data = r.json()
    except requests.exceptions.HTTPError as http_err:
        status_code = getattr(getattr(http_err, "response", None), "status_code", None)
        # Gracefully fall back to mock data on common upstream denials/quotas
        if status_code in (401, 403, 429):
            return _mock_forecast_3_days()
        raise
    except requests.exceptions.RequestException:
        # Network/timeouts or other request issues → fall back
        return _mock_forecast_3_days()

    forecast_days = data.get("forecast", {}).get("forecastday", [])

    days: list[dict] = []
    for fd in forecast_days[1:4]:  # Skip today (index 0), take next 3 days
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
            # Keep windspeed in mph to match current UI label
            windspeed = day.get("maxwind_mph")
            # Keep precip in inches to match current UI label
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


def _apply_focus_rules(day: dict, focus: str | None = None, tips: list | None = None, focuses: list | None = None) -> list:
    """Optionally adjust or prepend tips based on user focus/focuses and weather."""
    tips = tips or []
    selected = []
    if focuses:
        selected = [str(f).lower() for f in focuses if str(f).lower() in ("thermostat", "sprinklers", "solar")]
    elif focus:
        selected = [str(focus).lower()]
    if not selected:
        return tips
    desc = (day.get("description") or "").lower()
    temp_max = day.get("tempmax", 70) or 70
    precip = day.get("precip", 0) or 0

    prefix = []
    if "sprinklers" in selected and precip > 0.1:
        prefix.append("Rain expected — skip sprinklers tomorrow to save water and energy.")
    if "thermostat" in selected and temp_max > 85:
        prefix.append("Hot day tomorrow — set thermostat ~3°F higher and use fans to save A/C costs.")
    if "solar" in selected and ("sunny" in desc or "clear" in desc):
        prefix.append("Sunny tomorrow — prioritize solar-powered usage for appliances/EV charging.")
    tips = prefix + tips
    return tips[:3]


def generate_tips_gemini(day: dict, focus: str | None, focuses: list | None = None) -> list:
    # If Gemini SDK not available or no API key, fall back deterministically
    if not GEMINI_API_KEY or genai is None:
        return _apply_focus_rules(day, focus, get_fallback_tips(day), focuses)

    model = genai.GenerativeModel(GEMINI_MODEL)
    system = (
        "You are WeatherWise, a friendly energy-saving assistant. Given a single day's weather data, "
        "produce three concrete, varied tips that help a typical household save energy, water, or money. "
        "Use short, crisp sentences. Avoid repeating the same structure or phrases across tips."
    )
    prompt = (
        f"Weather JSON: {json.dumps(day)}\n\n"
        "Return strictly this JSON shape (no extra text):\n"
        "{\"suggestions\": [\"tip1\", \"tip2\", \"tip3\"]}\n\n"
        "Constraints:\n"
        "- Exactly 3 tips.\n"
        "- 6–20 words each.\n"
        "- Each states an action and expected benefit.\n"
        "- Vary wording and focus (HVAC, lighting, laundry, irrigation, EV, solar, cooking, etc).\n"
        "- Use Fahrenheit-friendly phrasing if temps look like US units.\n"
    )

    res = model.generate_content([system, prompt])
    text = (getattr(res, "text", None) or "").strip()

    # Best-effort JSON parsing; fall back if parsing fails
    try:
        text = text.strip("`\n ")
        data = json.loads(text)
        out = data.get("suggestions")
        if isinstance(out, list) and len(out) == 3:
            return _apply_focus_rules(day, focus, [str(x) for x in out], focuses)
    except Exception:
        pass

    return _apply_focus_rules(day, focus, get_fallback_tips(day), focuses)


@app.post("/api/tips")
def tips():
    try:
        body = request.get_json(force=True) or {}
        location = str(body.get("location", "")).strip()
        lat = body.get("lat", None)
        lon = body.get("lon", None)
        unit_group = body.get("unit_group", "us")
        focus = body.get("focus")
        focuses = body.get("focuses")

        if (lat is None or lon is None) and not location:
            return jsonify({"error": "Location or lat/lon required"}), 400

        if lat is not None and lon is not None:
            location_param = f"{lat},{lon}"
            response_location = location_param
        else:
            location_param = location
            response_location = location

        forecast = get_weather_forecast(location_param, unit_group)

        days = []
        for d in forecast:
            suggestions = generate_tips_gemini(d, focus, focuses)
            days.append(
                {
                    "date": d["date"],
                    "weather": {
                        "date": d["date"],
                        "tempmin": d.get("tempmin"),
                        "tempmax": d.get("tempmax"),
                        "humidity": d.get("humidity"),
                        "windspeed": d.get("windspeed"),
                        "precip": d.get("precip", 0),
                        "description": d.get("description", "Clear"),
                    },
                    "suggestions": suggestions,
                }
            )

        return jsonify({"location": response_location, "unit_group": unit_group, "days": days})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", os.getenv("FLASK_RUN_PORT", "5000")))
    app.run(debug=True, host=host, port=port)


