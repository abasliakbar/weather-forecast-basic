/**
 * WeatherNow — app.js
 * OpenWeatherMap Current Weather Data + Forecast API integration
 * Features: Geolocation, hourly forecast, dynamic weather backgrounds
 */

'use strict';

/* ── Config ───────────────────────────────────────────── */
const API_KEY      = 'dd3a03503ba8c55ee624e430e89a3304';
const BASE_URL     = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

/* ── DOM References ───────────────────────────────────── */
const cityInput          = document.getElementById('city-input');
const searchBtn          = document.getElementById('search-btn');

const loader             = document.getElementById('loader');
const errorContainer     = document.getElementById('error-container');
const errorMessage       = document.getElementById('error-message');
const weatherContainer   = document.getElementById('weather-container');

const cityNameEl         = document.getElementById('city-name');
const weatherDateEl      = document.getElementById('weather-date');
const weatherIconEl      = document.getElementById('weather-icon');
const temperatureEl      = document.getElementById('temperature');
const weatherDescEl      = document.getElementById('weather-description');
const humidityEl         = document.getElementById('humidity');
const windSpeedEl        = document.getElementById('wind-speed');
const feelsLikeEl        = document.getElementById('feels-like');
const visibilityEl       = document.getElementById('visibility');

const forecastContainer  = document.getElementById('forecast-container');
const forecastScroll     = document.getElementById('forecast-scroll');
const bgGradient         = document.getElementById('bg-gradient');
const geoStatus          = document.getElementById('geo-status');
const geoMessageEl       = document.getElementById('geo-message');

/* ── State Helpers ────────────────────────────────────── */

/** Show only the specified panel; hide the others. */
function showPanel(panel) {
  loader.classList.add('hidden');
  errorContainer.classList.add('hidden');
  weatherContainer.classList.add('hidden');

  if (panel) {
    panel.classList.remove('hidden');
  }
}

/** Display a user-facing error message. */
function showError(message) {
  errorMessage.textContent = message;
  // Re-trigger animation by removing and re-adding class
  errorContainer.classList.remove('hidden');
  void errorContainer.offsetWidth; // force reflow
  showPanel(errorContainer);
}

/** Display a geolocation status message (non-blocking). */
function showGeoMessage(message) {
  geoMessageEl.textContent = message;
  geoStatus.classList.remove('hidden');
}

/** Hide the geolocation status message. */
function hideGeoMessage() {
  geoStatus.classList.add('hidden');
}

/** Show the loading skeleton. */
function showLoading() {
  showPanel(loader);
  searchBtn.disabled = true;
}

/** Hide the loading skeleton. */
function hideLoading() {
  loader.classList.add('hidden');
  searchBtn.disabled = false;
}

/* ── Formatting Helpers ───────────────────────────────── */

/** Format a UNIX timestamp + timezone offset into a readable date string. */
function formatDate(unixTimestamp, timezoneOffsetSeconds) {
  const localMs = (unixTimestamp + timezoneOffsetSeconds) * 1000;
  const d = new Date(localMs);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    timeZone: 'UTC',
  });
}

/** Round a number to one decimal, returning a string like "14.3". */
function toOneDecimal(n) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** Convert metres to kilometres, formatted to one decimal place. */
function formatVisibility(metres) {
  if (metres >= 1000) {
    return `${toOneDecimal(metres / 1000)} km`;
  }
  return `${metres} m`;
}

/** Format a UNIX timestamp to HH:00 style for forecast cards. */
function formatForecastTime(unixTimestamp, timezoneOffsetSeconds) {
  const localMs = (unixTimestamp + timezoneOffsetSeconds) * 1000;
  const d = new Date(localMs);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

/* ── Weather Category Mapping ─────────────────────────── */

/**
 * Map an OpenWeatherMap weather condition ID to a category string.
 * Used for dynamic background and rain detection.
 * See: https://openweathermap.org/weather-conditions
 */
function getWeatherCategory(weatherId) {
  if (weatherId >= 200 && weatherId < 300) return 'storm';
  if (weatherId >= 300 && weatherId < 400) return 'drizzle';
  if (weatherId >= 500 && weatherId < 600) return 'rain';
  if (weatherId >= 600 && weatherId < 700) return 'snow';
  if (weatherId >= 700 && weatherId < 800) return 'mist';
  if (weatherId === 800) return 'clear';
  if (weatherId > 800) return 'clouds';
  return 'default';
}

/**
 * Set the dynamic background gradient based on current weather.
 * @param {number} weatherId — OWM condition code
 */
function setWeatherBackground(weatherId) {
  const category = getWeatherCategory(weatherId);
  const classes = bgGradient.className.split(' ').filter(c => !c.startsWith('weather-bg-'));
  classes.push(`weather-bg-${category}`);
  bgGradient.className = classes.join(' ');
}

/* ── API Functions ────────────────────────────────────── */

/**
 * Handle API error responses with user-friendly messages.
 * @param {Response} response
 * @throws {Error}
 */
async function handleApiError(response) {
  if (response.status === 404) {
    throw new Error('City not found. Please check the spelling and try again.');
  }
  if (response.status === 401) {
    throw new Error('Unable to access weather data. Please check the API configuration.');
  }
  if (response.status === 429) {
    throw new Error('Too many requests. Please wait a moment and try again.');
  }
  throw new Error('Something went wrong. Please try again later.');
}

/**
 * Fetch current weather by city name.
 * @param {string} cityName
 * @returns {Promise<Object>} OpenWeatherMap response JSON
 */
async function fetchWeatherByCity(cityName) {
  const url = `${BASE_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

/**
 * Fetch current weather by coordinates.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>}
 */
async function fetchWeatherByCoordinates(lat, lon) {
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

/**
 * Fetch 5-day / 3-hour forecast by city name.
 * @param {string} cityName
 * @returns {Promise<Object>}
 */
async function fetchForecastByCity(cityName) {
  const url = `${FORECAST_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

/**
 * Fetch 5-day / 3-hour forecast by coordinates.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>}
 */
async function fetchForecastByCoordinates(lat, lon) {
  const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`;
  const response = await fetch(url);
  if (!response.ok) await handleApiError(response);
  return response.json();
}

/* ── Geolocation ──────────────────────────────────────── */

/**
 * Get the user's current position via the Geolocation API.
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser. Search for a city to get started.'));
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
            reject(new Error('Location access was denied. Search for a city to get started.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location services are unavailable. Search for a city to get started.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Search for a city to get started.'));
            break;
          default:
            reject(new Error('Unable to determine your location. Search for a city to get started.'));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/* ── UI Rendering ─────────────────────────────────────── */

/** Populate the weather card with data returned from the API. */
function populateWeatherCard(data) {
  const { name, sys, weather, main, wind, visibility, timezone, dt } = data;

  // City & country
  cityNameEl.textContent = `${name}, ${sys.country}`;

  // Date (local to the city's timezone)
  weatherDateEl.textContent = formatDate(dt, timezone);

  // Icon (use @2x for crisp display on retina screens)
  const iconCode = weather[0].icon;
  weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  weatherIconEl.alt = weather[0].description;

  // Temperature
  temperatureEl.textContent = Math.round(main.temp);

  // Description
  weatherDescEl.textContent = weather[0].description;

  // Detail cards
  humidityEl.textContent   = `${main.humidity}%`;
  windSpeedEl.textContent  = `${toOneDecimal(wind.speed)} m/s`;
  feelsLikeEl.textContent  = `${Math.round(main.feels_like)}°C`;
  visibilityEl.textContent = visibility ? formatVisibility(visibility) : 'N/A';

  // Dynamic background
  setWeatherBackground(weather[0].id);
}

/**
 * Render the hourly forecast cards.
 * Takes the first 8 entries from the 3-hour forecast (~24 hours).
 * @param {Object} forecastData — response from /data/2.5/forecast
 */
function renderForecast(forecastData) {
  if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
    forecastContainer.classList.add('hidden');
    return;
  }

  const timezoneOffset = forecastData.city.timezone;
  // Take up to 8 entries = ~24 hours of 3-hour intervals
  const entries = forecastData.list.slice(0, 8);

  forecastScroll.innerHTML = '';

  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'forecast-card';

    const weatherId = entry.weather[0].id;
    const pop = entry.pop || 0; // probability of precipitation (0–1)
    const isRainy = pop > 0.3 || (weatherId >= 200 && weatherId < 600);

    if (isRainy) {
      card.classList.add('rain-highlight');
    }

    const time = formatForecastTime(entry.dt, timezoneOffset);
    const iconCode = entry.weather[0].icon;
    const temp = Math.round(entry.main.temp);
    const popPercent = Math.round(pop * 100);

    card.innerHTML = `
      <span class="forecast-time">${time}</span>
      <img class="forecast-icon" src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${entry.weather[0].description}" loading="lazy" />
      <span class="forecast-temp">${temp}°</span>
      <span class="forecast-pop"><span class="rain-drop">💧</span> ${popPercent}%</span>
    `;

    forecastScroll.appendChild(card);
  });

  forecastContainer.classList.remove('hidden');
}

/* ── Main Handlers ────────────────────────────────────── */

/** Handle manual city search. */
async function handleSearch() {
  const cityName = cityInput.value.trim();

  // Validate input
  if (!cityName) {
    showError('Please enter a city name.');
    cityInput.focus();
    return;
  }

  // Hide geo message on new search
  hideGeoMessage();

  // Show loader
  showLoading();

  try {
    // Fetch weather and forecast in parallel
    const [weatherData, forecastData] = await Promise.all([
      fetchWeatherByCity(cityName),
      fetchForecastByCity(cityName).catch(() => null), // forecast failure is non-critical
    ]);

    populateWeatherCard(weatherData);
    renderForecast(forecastData);
    showPanel(weatherContainer);
  } catch (err) {
    // Network errors (fetch rejects) vs. API errors (thrown above)
    if (err instanceof TypeError) {
      showError('Network error. Please check your internet connection.');
    } else {
      showError(err.message);
    }
  } finally {
    hideLoading();
  }
}

/**
 * Initialize the app: attempt geolocation, then load weather.
 * Falls back to manual search if geolocation fails.
 */
async function initApp() {
  showLoading();

  try {
    const coords = await getUserLocation();

    // Fetch weather and forecast in parallel using coordinates
    const [weatherData, forecastData] = await Promise.all([
      fetchWeatherByCoordinates(coords.latitude, coords.longitude),
      fetchForecastByCoordinates(coords.latitude, coords.longitude).catch(() => null),
    ]);

    populateWeatherCard(weatherData);
    renderForecast(forecastData);
    showPanel(weatherContainer);
  } catch (err) {
    // Geolocation failed or weather fetch by coords failed
    hideLoading();

    if (err instanceof TypeError) {
      // Network error during weather fetch
      showGeoMessage('Network error. Please check your connection and search for a city.');
    } else {
      showGeoMessage(err.message);
    }

    cityInput.focus();
  }
}

/* ── Event Listeners ──────────────────────────────────── */

searchBtn.addEventListener('click', handleSearch);

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

// Clear error when user starts typing again
cityInput.addEventListener('input', () => {
  if (!errorContainer.classList.contains('hidden')) {
    showPanel(null);
  }
});

/* ── Init ─────────────────────────────────────────────── */
initApp();
