/**
 * WeatherNow — app.js
 * OpenWeatherMap Current Weather Data API integration
 */

'use strict';

/* ── Config ───────────────────────────────────────────── */
const API_KEY  = 'dd3a03503ba8c55ee624e430e89a3304';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

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

/* ── API Call ─────────────────────────────────────────── */

/**
 * Fetch current weather for a given city.
 * @param {string} cityName
 * @returns {Promise<Object>} OpenWeatherMap response JSON
 * @throws {Error} on network failure or non-OK HTTP status
 */
async function fetchWeather(cityName) {
  const url = `${BASE_URL}?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=metric&lang=en`;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('City not found. Please try again.');
    }
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your configuration.');
    }
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.');
    }
    throw new Error(`Unexpected error (${response.status}). Please try again.`);
  }

  return response.json();
}

/* ── UI Population ────────────────────────────────────── */

/** Populate the weather card with data returned from the API. */
function populateWeatherCard(data) {
  const { name, sys, weather, main, wind, visibility, timezone, dt } = data;

  // City & country
  cityNameEl.textContent = `${name}, ${sys.country}`;

  // Date (local to the city's timezone)
  weatherDateEl.textContent = formatDate(dt, timezone);

  // Icon (use @2x for crisp display on retina screens)
  const iconCode = weather[0].icon;
  weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
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
}

/* ── Main Handler ─────────────────────────────────────── */

async function handleSearch() {
  const cityName = cityInput.value.trim();

  // Validate input
  if (!cityName) {
    showError('Please enter a city name.');
    cityInput.focus();
    return;
  }

  // Show loader
  showPanel(loader);
  searchBtn.disabled = true;

  try {
    const data = await fetchWeather(cityName);
    populateWeatherCard(data);
    showPanel(weatherContainer);
  } catch (err) {
    // Network errors (fetch rejects) vs. API errors (thrown above)
    if (err instanceof TypeError) {
      showError('Network error. Please check your internet connection.');
    } else {
      showError(err.message);
    }
  } finally {
    searchBtn.disabled = false;
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
// Focus the input on page load for immediate interaction
cityInput.focus();
