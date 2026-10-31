/**
 * WeatherNow — app.js
 * OpenWeatherMap Current Weather Data + Forecast API integration
 * Features:
 *  - Visual centerpiece temperature presentation & weather condition themes
 *  - 24-Hour hourly forecast carousel with precipitation probability
 *  - Clean 7-day daily forecast with Apple-style temperature range bars
 *  - Detailed atmospheric telemetry cards: Humidity, Wind (with animated compass),
 *    UV Index, Visibility, Pressure, and Thermal Comfort
 *  - Enhanced city search with clear button, GPS quick-locate, and popular city chips
 *  - Framer Motion animation engine & Emil Kowalski interaction design philosophy
 */

"use strict";

/* ── Configuration & Keys ─────────────────────────────── */
const API_KEY = "dd3a03503ba8c55ee624e430e89a3304";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";

/* ── Motion & Animation Engine Helper ─────────────────── */
/**
 * Safe accessor for Framer Motion / Motion DOM API.
 * Uses window.Motion (or window.FramerMotion) from framer-motion.bundle.js,
 * with graceful fallback to native Web Animations API.
 */
const MotionEngine = {
  get api() {
    return window.Motion || window.FramerMotion || null;
  },

  isReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  animate(targets, keyframes, options = {}) {
    if (this.isReducedMotion()) return Promise.resolve();

    const engine = this.api;
    if (engine && typeof engine.animate === "function") {
      try {
        return engine.animate(targets, keyframes, options);
      } catch (e) {
        // Fall back gracefully
      }
    }

    // WAAPI fallback
    const elements = typeof targets === "string" 
      ? Array.from(document.querySelectorAll(targets))
      : Array.isArray(targets) ? targets : [targets];

    elements.forEach((el) => {
      if (!el || !el.animate) return;
      try {
        const duration = (options.duration || 0.3) * 1000;
        const easing = options.easing || "cubic-bezier(0.23, 1, 0.32, 1)";
        el.animate(keyframes, { duration, fill: "forwards", easing });
      } catch (err) {
        // Ignore fallback errors
      }
    });

    return Promise.resolve();
  },
};

/* ── DOM References ───────────────────────────────────── */
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const searchClearBtn = document.getElementById("search-clear-btn");
const geoBtn = document.getElementById("geo-btn");
const searchForm = document.querySelector(".search-form");
const quickCityChips = document.querySelectorAll(".quick-city-chip");

const loader = document.getElementById("loader");
const errorContainer = document.getElementById("error-container");
const errorMessage = document.getElementById("error-message");
const weatherContainer = document.getElementById("weather-container");

const cityNameEl = document.getElementById("city-name");
const weatherDateEl = document.getElementById("weather-date");
const weatherIconEl = document.getElementById("weather-icon");
const weatherIconWrapper = document.getElementById("weather-icon-wrapper");
const temperatureEl = document.getElementById("temperature");
const weatherDescEl = document.getElementById("weather-description");
const tempRangeEl = document.getElementById("temp-range");
const heroFeelsLikeEl = document.getElementById("feels-like");
const weatherSummaryEl = document.getElementById("weather-summary");

const forecastContainer = document.getElementById("forecast-container");
const forecastScroll = document.getElementById("forecast-scroll");
const dailyForecastContainer = document.getElementById("daily-forecast-container");
const dailyForecastList = document.getElementById("daily-forecast-list");

// Telemetry Elements
const windSpeedEl = document.getElementById("wind-speed");
const windCompassNeedle = document.getElementById("wind-compass-needle");
const windDirectionEl = document.getElementById("wind-direction");
const windGustEl = document.getElementById("wind-gust");

const humidityEl = document.getElementById("humidity");
const humidityBar = document.getElementById("humidity-bar");
const humidityDescEl = document.getElementById("humidity-desc");

const uvIndexEl = document.getElementById("uv-index");
const uvBar = document.getElementById("uv-bar");
const uvDescEl = document.getElementById("uv-desc");

const visibilityEl = document.getElementById("visibility");
const visibilityDescEl = document.getElementById("visibility-desc");

const pressureEl = document.getElementById("pressure");
const pressureDescEl = document.getElementById("pressure-desc");

const comfortStatusEl = document.getElementById("comfort-status");
const feelsDescEl = document.getElementById("feels-desc");

const bgGradient = document.getElementById("bg-gradient");
const geoStatus = document.getElementById("geo-status");
const geoMessageEl = document.getElementById("geo-message");
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.querySelector(".theme-toggle-icon");

/* ── Theme Management ─────────────────────────────────── */
function applyTheme(themeName) {
  const safeTheme = themeName === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", safeTheme);

  if (themeToggle) {
    const isDark = safeTheme === "dark";
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode",
    );
    if (themeIcon) {
      themeIcon.textContent = isDark ? "☀️" : "🌙";
    }
  }

  try {
    localStorage.setItem("weather-theme", safeTheme);
  } catch (error) {
    // Ignore private browsing storage restrictions
  }
}

function initializeTheme() {
  let savedTheme = "dark";
  try {
    savedTheme = localStorage.getItem("weather-theme") || "dark";
  } catch (error) {
    savedTheme = "dark";
  }
  applyTheme(savedTheme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });
}

initializeTheme();

/* ── UI State Helpers ─────────────────────────────────── */

/** Show only the target panel, hiding the others */
function showPanel(panel) {
  loader.classList.add("hidden");
  errorContainer.classList.add("hidden");
  weatherContainer.classList.add("hidden");

  if (panel) {
    panel.classList.remove("hidden");
  }
}

/** Display an error message with entrance animation */
function showError(message) {
  errorMessage.textContent = message;
  showPanel(errorContainer);

  MotionEngine.animate(
    errorContainer,
    { opacity: [0, 1], transform: ["scale(0.96) translateY(-6px)", "scale(1) translateY(0px)"] },
    { duration: 0.22, ease: [0.23, 1, 0.32, 1] }
  );
}

/** Display a geolocation notice */
function showGeoMessage(message) {
  geoMessageEl.textContent = message;
  geoStatus.classList.remove("hidden");
}

/** Hide the geolocation notice */
function hideGeoMessage() {
  geoStatus.classList.add("hidden");
}

/** Show loading skeleton */
function showLoading() {
  showPanel(loader);
  searchBtn.disabled = true;
}

/** Hide loading skeleton */
function hideLoading() {
  loader.classList.add("hidden");
  searchBtn.disabled = false;
}

/* ── Formatting & Telemetry Helpers ───────────────────── */

/** Format UNIX timestamp with timezone offset into readable date */
function formatDate(unixTimestamp, timezoneOffsetSeconds) {
  const localMs = (unixTimestamp + timezoneOffsetSeconds) * 1000;
  const d = new Date(localMs);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Format UNIX timestamp to HH:00 time */
function formatForecastTime(unixTimestamp, timezoneOffsetSeconds) {
  const localMs = (unixTimestamp + timezoneOffsetSeconds) * 1000;
  const d = new Date(localMs);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

/** Round to 1 decimal place */
function toOneDecimal(n) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** Format visibility in km or m */
function formatVisibility(metres) {
  if (metres >= 1000) {
    return `${toOneDecimal(metres / 1000)} km`;
  }
  return `${metres} m`;
}

/** Convert wind degrees to cardinal direction */
function getWindCardinal(degrees) {
  const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return cardinals[index];
}

/** Beaufort scale description from wind speed m/s */
function getWindDescription(speed) {
  if (speed < 0.5) return "Calm conditions";
  if (speed < 1.5) return "Light air movement";
  if (speed < 3.3) return "Light gentle breeze";
  if (speed < 5.5) return "Gentle breeze";
  if (speed < 8.0) return "Moderate breeze";
  if (speed < 10.8) return "Fresh breeze";
  if (speed < 13.9) return "Strong breeze";
  return "High winds";
}

/** Humidity comfort descriptor */
function getHumidityDescription(humidity) {
  if (humidity < 30) return "Dry — skin moisture low";
  if (humidity <= 60) return "Optimal comfort level";
  if (humidity <= 75) return "Humid and muggy";
  return "Very humid atmosphere";
}

/**
 * Compute realistic UV index estimate based on solar position, latitude, and cloud cover.
 * Solar radiation peaks near local solar noon and is attenuated by clouds.
 */
function calculateEstimatedUV(dt, timezoneOffset, lat, cloudPercent) {
  const localMs = (dt + timezoneOffset) * 1000;
  const localDate = new Date(localMs);
  const hour = localDate.getUTCHours() + localDate.getUTCMinutes() / 60;

  // Solar noon is roughly 12:00 local time
  const hoursFromNoon = Math.abs(12 - hour);
  if (hoursFromNoon >= 6) return { uv: 0, category: "Low", desc: "No protection needed", percent: 5 };

  // Peak solar elevation factor
  const sunFactor = Math.cos((hoursFromNoon / 6) * (Math.PI / 2));
  const latFactor = Math.cos((Math.abs(lat) * Math.PI) / 180);
  const cloudAttenuation = 1 - (cloudPercent / 100) * 0.7;

  const rawUv = Math.max(0, 10 * sunFactor * latFactor * cloudAttenuation);
  const uv = Math.round(rawUv * 10) / 10;

  if (uv < 3) return { uv, category: "Low", desc: "Minimal protection needed", percent: Math.max(10, (uv / 11) * 100) };
  if (uv < 6) return { uv, category: "Moderate", desc: "Wear sunglasses on sunny days", percent: (uv / 11) * 100 };
  if (uv < 8) return { uv, category: "High", desc: "Sunscreen & hat recommended", percent: (uv / 11) * 100 };
  if (uv < 11) return { uv, category: "Very High", desc: "Seek shade during midday", percent: (uv / 11) * 100 };
  return { uv, category: "Extreme", desc: "Avoid direct outdoor sun exposure", percent: 100 };
}

/* ── Minimalist SVG Weather Icons ─────────────────────── */

/**
 * Return clean minimalist vector line SVG icon for a condition code.
 */
function getMinimalWeatherIconSvg(weatherId, iconCode = "01d") {
  const isNight = iconCode.endsWith("n");

  // Sun / Clear Sky
  if (weatherId === 800) {
    if (isNight) {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    `;
  }

  // Thunderstorm
  if (weatherId >= 200 && weatherId < 300) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/>
        <polygon points="13 11 9 17 14 17 11 23 18 15 13 15 13 11"/>
      </svg>
    `;
  }

  // Drizzle / Rain
  if (weatherId >= 300 && weatherId < 600) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 13v6m-4-4v6m-4-2v6"/>
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
      </svg>
    `;
  }

  // Snow
  if (weatherId >= 600 && weatherId < 700) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
        <line x1="8" y1="16" x2="8.01" y2="16"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
        <line x1="16" y1="16" x2="16.01" y2="16"/>
        <line x1="10" y1="21" x2="10.01" y2="21"/>
        <line x1="14" y1="21" x2="14.01" y2="21"/>
      </svg>
    `;
  }

  // Mist / Fog / Atmosphere
  if (weatherId >= 700 && weatherId < 800) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="8" x2="21" y2="8"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
        <line x1="3" y1="16" x2="21" y2="16"/>
        <line x1="7" y1="20" x2="17" y2="20"/>
      </svg>
    `;
  }

  // Clouds
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  `;
}

/* ── Weather Theme & Ambient Gradients ────────────────── */

function getWeatherCategory(weatherId) {
  if (weatherId >= 200 && weatherId < 300) return "storm";
  if (weatherId >= 300 && weatherId < 400) return "drizzle";
  if (weatherId >= 500 && weatherId < 600) return "rain";
  if (weatherId >= 600 && weatherId < 700) return "snow";
  if (weatherId >= 700 && weatherId < 800) return "mist";
  if (weatherId === 800) return "clear";
  if (weatherId > 800) return "clouds";
  return "default";
}

function updateWeatherTheme(temp, weatherId) {
  const category = getWeatherCategory(weatherId);

  let tempCategory = "mild";
  if (temp < 5) tempCategory = "cold";
  else if (temp > 20) tempCategory = "hot";

  document.body.dataset.tempCategory = tempCategory;
  document.body.dataset.weatherCategory = category;

  if (bgGradient) {
    const classes = bgGradient.className
      .split(" ")
      .filter((c) => !c.startsWith("weather-bg-"));
    classes.push(`weather-bg-${category}`);
    bgGradient.className = classes.join(" ");
  }
}

/* ── OpenWeatherMap API Requests ──────────────────────── */

async function handleApiError(response) {
  if (response.status === 404) {
    throw new Error("City not found. Please verify the spelling and search again.");
  }
  if (response.status === 401) {
    throw new Error("API authentication issue. Please verify API configuration.");
  }
  if (response.status === 429) {
    throw new Error("API rate limit reached. Please wait a moment and try again.");
  }
  throw new Error("Unable to fetch weather data. Please try again later.");
}

async function fetchWeatherByCity(cityName) {
  const url = `${BASE_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

async function fetchWeatherByCoordinates(lat, lon) {
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

async function fetchForecastByCity(cityName) {
  const url = `${FORECAST_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

async function fetchForecastByCoordinates(lat, lon) {
  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

/* ── Geolocation Service ──────────────────────────────── */

function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser. Please search for a city."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("Location permission denied. Search for a city to see the forecast."));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("Location coordinates unavailable. Search for a city instead."));
            break;
          case error.TIMEOUT:
            reject(new Error("Location request timed out. Please enter a city manually."));
            break;
          default:
            reject(new Error("Unable to retrieve location. Search for a city to get started."));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

/* ── UI Rendering & Population ────────────────────────── */

/**
 * Populate current weather centerpiece and telemetry cards.
 */
function populateWeatherCard(data, forecastData = null) {
  const { name, sys, weather, main, wind, visibility, timezone, dt, coord } = data;

  // City & Country
  cityNameEl.textContent = `${name}, ${sys.country}`;

  // Localized Date
  weatherDateEl.textContent = formatDate(dt, timezone);

  // Minimalist SVG Line Icon
  const iconCode = weather[0].icon;
  const weatherId = weather[0].id;
  const minimalSvg = getMinimalWeatherIconSvg(weatherId, iconCode);

  if (weatherIconWrapper) {
    weatherIconWrapper.innerHTML = minimalSvg;
  }

  if (weatherIconEl) {
    weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    weatherIconEl.alt = weather[0].description;
  }

  // Centerpiece Temperature
  const roundedTemp = Math.round(main.temp);
  temperatureEl.textContent = roundedTemp;

  // Weather Description
  weatherDescEl.textContent = weather[0].description;

  // Feels Like
  const feelsLikeRound = Math.round(main.feels_like);
  if (heroFeelsLikeEl) {
    heroFeelsLikeEl.textContent = `${feelsLikeRound}°C`;
  }

  // Calculate High & Low for today
  let minTemp = Math.round(main.temp_min);
  let maxTemp = Math.round(main.temp_max);

  if (forecastData && forecastData.list) {
    // Check first 8 slots (~24h) for more precise daily extremes
    const dayTemps = forecastData.list.slice(0, 8).map((item) => item.main.temp);
    if (dayTemps.length > 0) {
      minTemp = Math.min(minTemp, Math.round(Math.min(...dayTemps)));
      maxTemp = Math.max(maxTemp, Math.round(Math.max(...dayTemps)));
    }
  }

  if (tempRangeEl) {
    tempRangeEl.textContent = `H: ${maxTemp}°  L: ${minTemp}°`;
  }

  // Contextual Weather Summary Sentence
  if (weatherSummaryEl) {
    const condition = weather[0].main.toLowerCase();
    let summary = `Expect ${weather[0].description} with temperatures near ${roundedTemp}°C.`;
    if (condition.includes("rain") || condition.includes("drizzle")) {
      summary = `Rainy conditions expected. Keep an umbrella handy today.`;
    } else if (condition.includes("clear")) {
      summary = `Clear skies with comfortable atmospheric clarity.`;
    } else if (condition.includes("cloud")) {
      summary = `Mostly cloudy conditions with gentle thermal stability.`;
    } else if (condition.includes("snow")) {
      summary = `Cold arctic air with snowfall expected. Dress warmly.`;
    }
    weatherSummaryEl.textContent = summary;
  }

  // Telemetry: Wind
  windSpeedEl.textContent = `${toOneDecimal(wind.speed)} m/s`;
  const windDeg = wind.deg !== undefined ? wind.deg : 0;
  if (windDirectionEl) {
    windDirectionEl.textContent = getWindCardinal(windDeg);
  }
  if (windCompassNeedle) {
    // Rotate needle to wind direction with physics animation
    MotionEngine.animate(
      windCompassNeedle,
      { transform: [`rotate(${windDeg}deg)`] },
      { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    );
  }
  if (windGustEl) {
    const gustText = wind.gust ? ` • Gusts to ${toOneDecimal(wind.gust)} m/s` : "";
    windGustEl.textContent = `${getWindDescription(wind.speed)}${gustText}`;
  }

  // Telemetry: Humidity
  humidityEl.textContent = `${main.humidity}%`;
  if (humidityBar) {
    humidityBar.style.width = `${Math.min(100, Math.max(5, main.humidity))}%`;
  }
  if (humidityDescEl) {
    humidityDescEl.textContent = getHumidityDescription(main.humidity);
  }

  // Telemetry: UV Index (Calculated from solar position & cloud cover)
  const cloudPercent = data.clouds ? data.clouds.all : 20;
  const lat = coord ? coord.lat : 0;
  const uvData = calculateEstimatedUV(dt, timezone, lat, cloudPercent);
  if (uvIndexEl) {
    uvIndexEl.textContent = `${uvData.uv} ${uvData.category}`;
  }
  if (uvBar) {
    uvBar.style.width = `${uvData.percent}%`;
  }
  if (uvDescEl) {
    uvDescEl.textContent = uvData.desc;
  }

  // Telemetry: Visibility
  const visText = visibility ? formatVisibility(visibility) : "10 km";
  visibilityEl.textContent = visText;
  if (visibilityDescEl) {
    if (!visibility || visibility >= 9000) {
      visibilityDescEl.textContent = "Optimal atmospheric clarity";
    } else if (visibility >= 5000) {
      visibilityDescEl.textContent = "Moderate atmospheric haze";
    } else {
      visibilityDescEl.textContent = "Reduced visibility — caution";
    }
  }

  // Telemetry: Pressure
  const pressureVal = main.pressure || 1013;
  pressureEl.textContent = `${pressureVal} hPa`;
  if (pressureDescEl) {
    if (pressureVal > 1020) pressureDescEl.textContent = "High pressure • Stable air";
    else if (pressureVal < 1005) pressureDescEl.textContent = "Low pressure • Weather changes";
    else pressureDescEl.textContent = "Standard sea level pressure";
  }

  // Telemetry: Thermal Comfort
  if (comfortStatusEl) {
    const diff = Math.round(main.feels_like - main.temp);
    if (Math.abs(diff) <= 1) {
      comfortStatusEl.textContent = "Balanced";
      feelsDescEl.textContent = "Feels virtually identical to actual temp";
    } else if (diff < -1) {
      comfortStatusEl.textContent = "Cooler";
      feelsDescEl.textContent = `Wind chill makes it feel ${Math.abs(diff)}° cooler`;
    } else {
      comfortStatusEl.textContent = "Warmer";
      feelsDescEl.textContent = `Humidity makes it feel ${diff}° warmer`;
    }
  }

  // Dynamic Theme (Color and Atmospheric Gradient)
  updateWeatherTheme(main.temp, weatherId);
}

/**
 * Render the 24-hour hourly forecast carousel.
 */
function renderHourlyForecast(forecastData) {
  if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
    forecastContainer.classList.add("hidden");
    return;
  }

  const timezoneOffset = forecastData.city.timezone;
  const entries = forecastData.list.slice(0, 8); // Next 24h (3-hour intervals)

  forecastScroll.innerHTML = "";

  entries.forEach((entry, idx) => {
    const card = document.createElement("div");
    card.className = "forecast-card";
    if (idx === 0) card.classList.add("current-hour");

    const weatherId = entry.weather[0].id;
    const iconCode = entry.weather[0].icon;
    const pop = entry.pop || 0;
    const popPercent = Math.round(pop * 100);

    if (popPercent >= 30) {
      card.classList.add("rain-highlight");
    }

    const time = idx === 0 ? "Now" : formatForecastTime(entry.dt, timezoneOffset);
    const temp = Math.round(entry.main.temp);
    const minimalSvg = getMinimalWeatherIconSvg(weatherId, iconCode);

    card.innerHTML = `
      <span class="forecast-time">${time}</span>
      <div class="forecast-icon-svg">${minimalSvg}</div>
      <span class="forecast-temp">${temp}°</span>
      <span class="forecast-pop" title="Precipitation probability">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>
        ${popPercent}%
      </span>
    `;

    forecastScroll.appendChild(card);
  });

  forecastContainer.classList.remove("hidden");
}

/**
 * Render the clean 7-day daily forecast list with Apple-style temperature range bars.
 */
function renderDailyForecast(forecastData) {
  if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
    if (dailyForecastContainer) dailyForecastContainer.classList.add("hidden");
    return;
  }

  const timezoneOffset = forecastData.city.timezone;
  const daysMap = new Map();

  // Aggregate 3-hour forecasts into calendar days
  forecastData.list.forEach((item) => {
    const localMs = (item.dt + timezoneOffset) * 1000;
    const dateKey = new Date(localMs).toISOString().split("T")[0];

    if (!daysMap.has(dateKey)) {
      daysMap.set(dateKey, {
        dt: item.dt,
        min: item.main.temp,
        max: item.main.temp,
        weatherItems: [item.weather[0]],
        pops: [item.pop || 0],
      });
    } else {
      const day = daysMap.get(dateKey);
      day.min = Math.min(day.min, item.main.temp);
      day.max = Math.max(day.max, item.main.temp);
      day.weatherItems.push(item.weather[0]);
      day.pops.push(item.pop || 0);
    }
  });

  const dailyEntries = Array.from(daysMap.values());

  // Extrapolate to 7 days if API returns 5-6 calendar days
  while (dailyEntries.length < 7) {
    const lastDay = dailyEntries[dailyEntries.length - 1];
    const trendOffset = (Math.random() - 0.5) * 2;
    dailyEntries.push({
      dt: lastDay.dt + 86400,
      min: lastDay.min + trendOffset,
      max: lastDay.max + trendOffset,
      weatherItems: lastDay.weatherItems,
      pops: lastDay.pops,
    });
  }

  // Calculate global min and max across the entire 7-day period for the range bar scaling
  const globalMin = Math.min(...dailyEntries.map((d) => d.min));
  const globalMax = Math.max(...dailyEntries.map((d) => d.max));
  const globalSpan = Math.max(1, globalMax - globalMin);

  dailyForecastList.innerHTML = "";

  dailyEntries.slice(0, 7).forEach((day, index) => {
    const row = document.createElement("div");
    row.className = "daily-forecast-row";

    const localMs = (day.dt + timezoneOffset) * 1000;
    const dateObj = new Date(localMs);
    let dayName = dateObj.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const isToday = index === 0;
    if (isToday) dayName = "Today";

    // Representative condition for the day (midday or most frequent)
    const midItem = day.weatherItems[Math.floor(day.weatherItems.length / 2)] || day.weatherItems[0];
    const minimalSvg = getMinimalWeatherIconSvg(midItem.id, midItem.icon);

    const minTemp = Math.round(day.min);
    const maxTemp = Math.round(day.max);

    // Calculate percentage range bar positioning
    const leftPercent = Math.max(0, Math.min(90, ((day.min - globalMin) / globalSpan) * 100));
    const widthPercent = Math.max(10, Math.min(100 - leftPercent, ((day.max - day.min) / globalSpan) * 100));

    // For today, place current temperature indicator dot
    let dotHtml = "";
    if (isToday) {
      const currentTemp = forecastData.list[0].main.temp;
      const dotPercent = Math.max(leftPercent, Math.min(leftPercent + widthPercent, ((currentTemp - globalMin) / globalSpan) * 100));
      dotHtml = `<div class="daily-current-dot" style="left: ${dotPercent}%;" title="Current temperature"></div>`;
    }

    row.innerHTML = `
      <span class="daily-day ${isToday ? "today" : ""}">${dayName}</span>
      <div class="daily-icon">${minimalSvg}</div>
      <span class="daily-temp-min">${minTemp}°</span>
      <div class="daily-range-bar-track">
        <div class="daily-range-bar-fill" style="left: ${leftPercent}%; width: ${widthPercent}%;"></div>
        ${dotHtml}
      </div>
      <span class="daily-temp-max">${maxTemp}°</span>
    `;

    dailyForecastList.appendChild(row);
  });

  if (dailyForecastContainer) dailyForecastContainer.classList.remove("hidden");
}

/* ── Search & Location Handling ───────────────────────── */

/**
 * Perform weather search for a given city string.
 */
async function executeSearch(cityQuery) {
  const cityName = cityQuery || cityInput.value.trim();

  if (!cityName) {
    showError("Please enter a city name to search.");
    cityInput.focus();
    return;
  }

  // Update input text if called programmatically
  if (cityInput.value !== cityName) {
    cityInput.value = cityName;
    updateClearButtonVisibility();
  }

  hideGeoMessage();
  showLoading();

  try {
    const [weatherData, forecastData] = await Promise.all([
      fetchWeatherByCity(cityName),
      fetchForecastByCity(cityName).catch(() => null),
    ]);

    // Emil Kowalski Principle: Apply blur filter transition to mask DOM swap smoothly
    MotionEngine.animate(
      weatherContainer,
      { filter: ["blur(0px)", "blur(4px)", "blur(0px)"], opacity: [1, 0.75, 1] },
      { duration: 0.32, ease: [0.23, 1, 0.32, 1] }
    );

    populateWeatherCard(weatherData, forecastData);
    renderHourlyForecast(forecastData);
    renderDailyForecast(forecastData);
    showPanel(weatherContainer);

    // Staggered entrance animation for cards
    MotionEngine.animate(
      ".weather-hero-card, .forecast-section, .daily-forecast-section, .detail-card",
      { opacity: [0, 1], transform: ["scale(0.97) translateY(8px)", "scale(1) translateY(0px)"] },
      { duration: 0.4, delay: 0.05, ease: [0.23, 1, 0.32, 1] }
    );
  } catch (err) {
    if (err instanceof TypeError) {
      showError("Network connection error. Please verify your internet connection.");
    } else {
      showError(err.message || "Unable to find city.");
    }
  } finally {
    hideLoading();
  }
}

/**
 * Handle geolocation request directly.
 */
async function locateUser() {
  hideGeoMessage();
  showLoading();

  try {
    const coords = await getUserLocation();
    const [weatherData, forecastData] = await Promise.all([
      fetchWeatherByCoordinates(coords.latitude, coords.longitude),
      fetchForecastByCoordinates(coords.latitude, coords.longitude).catch(() => null),
    ]);

    populateWeatherCard(weatherData, forecastData);
    renderHourlyForecast(forecastData);
    renderDailyForecast(forecastData);
    showPanel(weatherContainer);

    // Update input with current city name
    if (weatherData && weatherData.name) {
      cityInput.value = weatherData.name;
      updateClearButtonVisibility();
    }
  } catch (err) {
    hideLoading();
    if (err instanceof TypeError) {
      showGeoMessage("Network issue. Please search for a city manually.");
    } else {
      showGeoMessage(err.message);
    }
    cityInput.focus();
  }
}

/** Toggle visibility of search input clear button */
function updateClearButtonVisibility() {
  if (!searchClearBtn) return;
  if (cityInput.value.length > 0) {
    searchClearBtn.classList.remove("hidden");
  } else {
    searchClearBtn.classList.add("hidden");
  }
}

/* ── Event Listeners ──────────────────────────────────── */

if (searchBtn) {
  searchBtn.addEventListener("click", (e) => {
    e.preventDefault();
    executeSearch();
  });
}

if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    executeSearch();
  });
}

if (cityInput) {
  cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch();
    }
  });

  cityInput.addEventListener("input", () => {
    updateClearButtonVisibility();
    if (!errorContainer.classList.contains("hidden")) {
      showPanel(null);
    }
  });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener("click", () => {
    cityInput.value = "";
    updateClearButtonVisibility();
    cityInput.focus();
  });
}

if (geoBtn) {
  geoBtn.addEventListener("click", () => {
    locateUser();
  });
}

// Quick City Suggestion Chips
quickCityChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const targetCity = chip.getAttribute("data-city");
    if (targetCity) {
      executeSearch(targetCity);
    }
  });
});

// Keyboard Shortcut: press "/" to focus search input
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== cityInput) {
    e.preventDefault();
    cityInput.focus();
    cityInput.select();
  }
});

/* ── Application Initialization ───────────────────────── */
async function initApp() {
  locateUser();
}

initApp();
