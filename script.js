// Wait for the entire HTML document to be ready before running the script
document.addEventListener('DOMContentLoaded', () => {

  // --- API KEYS & CONFIGURATION ---
  // WeatherAPI.com Key for weather data
  const API_KEY = "314f1390e38048d3ba1182817250808";
  const BASE_URL = "https://api.weatherapi.com/v1";
  // OpenWeather Maps API key (tiles)
  const OPENWEATHER_MAP_KEY = "0ec27aacec1774f2c8a3385c3f1bb395";

  // --- DOM ELEMENTS ---
  const cityInput = document.getElementById("cityInput");
  const searchBtn = document.getElementById("searchBtn");
  const locBtn = document.getElementById("locBtn");
  const loader = document.getElementById("loader");
  const weatherDisplay = document.getElementById("current");
  const hourlyContainer = document.getElementById("hourlyContainer");
  const forecastDisplay = document.getElementById("forecast");
  const savedLocationsContainer = document.getElementById("savedLocations");
  const unitToggle = document.getElementById("unitToggle");
  const mapControls = document.querySelector('.map-controls');

  // --- APP STATE ---
  let currentUnit = localStorage.getItem("unit") || "metric";
  let savedCities = JSON.parse(localStorage.getItem("savedCities")) || [];
  let lastSearchedCity = localStorage.getItem("lastSearchedCity") || "Pune";
  let currentWeatherData = null;
  let historyCache = new Map(); // key: city name (lowercased), value: history data
  let historyChart = null;

  // --- MAP STATE ---
  let currentLayer = 'rain';
  let lastLat = null;
  let lastLon = null;
  let leafletMap = null;
  let osmBaseLayer = null;
  let owmOverlayLayer = null;

  // --- CORE DATA FETCHING ---
  async function fetchWeatherData(query) {
      if (!query) {
          displayError("Please provide a city name or location.");
          return;
      }
      setLoading(true);
      const url = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=5&aqi=yes&alerts=no`;
      try {
          const response = await fetch(url);
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error((errorData.error && errorData.error.message) || `HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          currentWeatherData = data;
          lastSearchedCity = data.location.name;
          localStorage.setItem("lastSearchedCity", lastSearchedCity);
          saveCity(data.location.name);

          updateAllDisplays();
          lastLat = data.location.lat;
          lastLon = data.location.lon;
          ensureLeafletMap(lastLat, lastLon);
          setOWMOverlay(currentLayer);

          // Fetch and render 7-day history for the selected city
          await loadAndRenderHistory(data.location);

      } catch (err) {
          console.error("Error fetching weather data:", err);
          displayError(err.message);
          currentWeatherData = null;
      } finally {
          setLoading(false);
      }
  }

  // --- Leaflet + OpenWeather tiles ---
  function ensureLeafletMap(lat, lon) {
      const mapDiv = document.getElementById('windy-map');
      if (!mapDiv) return;
      if (!leafletMap) {
          leafletMap = L.map('windy-map');
          osmBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
          });
          osmBaseLayer.addTo(leafletMap);
          leafletMap.setView([lat, lon], 7);
      } else {
          leafletMap.setView([lat, lon], leafletMap.getZoom() || 7);
      }
  }

  function owmLayerNameFromCurrentLayer(layer) {
      if (layer === 'temp') return 'temp_new';
      if (layer === 'clouds') return 'clouds';
      return 'precipitation';
  }

  function setOWMOverlay(layer) {
      if (!leafletMap) return;
      if (owmOverlayLayer) {
          leafletMap.removeLayer(owmOverlayLayer);
          owmOverlayLayer = null;
      }
      const owmLayerName = owmLayerNameFromCurrentLayer(layer);
      const url = `https://tile.openweathermap.org/map/${owmLayerName}/{z}/{x}/{y}.png?appid=${OPENWEATHER_MAP_KEY}`;
      const className = `owm-tiles owm-${layer}`;
      const defaultOpacity = layer === 'clouds' ? 0.45 : (layer === 'temp' ? 0.6 : 0.7);
      owmOverlayLayer = L.tileLayer(url, {
          opacity: defaultOpacity,
          tileSize: 256,
          updateWhenIdle: true,
          className
      });
      owmOverlayLayer.on('tileerror', (e) => {
          console.error('OpenWeather map tile error (possibly invalid API key):', e);
      });
      owmOverlayLayer.addTo(leafletMap);

      // Reflect current layer on container for CSS-based tuning
      const mapDiv = document.getElementById('windy-map');
      if (mapDiv) {
          mapDiv.classList.remove('owm-layer-clouds', 'owm-layer-temp', 'owm-layer-radar');
          if (layer === 'clouds') mapDiv.classList.add('owm-layer-clouds');
          else if (layer === 'temp') mapDiv.classList.add('owm-layer-temp');
          else mapDiv.classList.add('owm-layer-radar');
      }
  }

  // --- DISPLAY FUNCTIONS ---
  function updateAllDisplays() {
      if (!currentWeatherData) return;
      displayCurrent(currentWeatherData);
      displayHourlyForecast(currentWeatherData);
      displayDailyForecast(currentWeatherData);
      displayActivities(currentWeatherData);
      displayAllergies(currentWeatherData);
  }

  function displayError(message) {
      weatherDisplay.innerHTML = `<p style="color:var(--danger); font-weight:bold;">${message}</p>`;
      hourlyContainer.innerHTML = "";
      const lifestyleSection = document.getElementById('lifestyle-section');
      const mapSection = document.getElementById('map-section');
      if (lifestyleSection) lifestyleSection.style.display = 'none';
      if (mapSection) mapSection.style.display = 'block';
      forecastDisplay.innerHTML = `<h2>Daily Forecast</h2>`;
      currentWeatherData = null;
  }

  function displayCurrent(data) {
      const { location, current } = data;
      const lifestyleSection = document.getElementById('lifestyle-section');
      const mapSection = document.getElementById('map-section');
      if (lifestyleSection) lifestyleSection.style.display = 'grid';
      if (mapSection) mapSection.style.display = 'block';

      const isMetric = currentUnit === "metric";
      const tempUnit = isMetric ? "°C" : "°F";
      const speedUnit = isMetric ? "kph" : "mph";
      const temp = isMetric ? current.temp_c : current.temp_f;
      const feelsLike = isMetric ? current.feelslike_c : current.feelslike_f;
      const windSpeed = isMetric ? current.wind_kph : current.wind_mph;
      const aqiInfo = getAqiInfo(current.air_quality["us-epa-index"]);
      const uviInfo = getUviInfo(current.uv);

      weatherDisplay.innerHTML = `
          <p class="city-name">${location.name}, ${location.country}</p>
          <img class="weather-icon" src="https:${current.condition.icon}" alt="${current.condition.text}">
          <p class="temp">${Math.round(temp)}${tempUnit}</p>
          <p class="description">${current.condition.text}</p>
          <div class="weather-details">
              <div class="detail-item"><strong>Feels Like</strong> ${Math.round(feelsLike)}${tempUnit}</div>
              <div class="detail-item"><strong>Humidity</strong> ${current.humidity}%</div>
              <div class="detail-item"><strong>Wind</strong> ${windSpeed} ${speedUnit}</div>
              <div class="detail-item"><strong>UV Index</strong> <span class="rating-${uviInfo.class}">${uviInfo.level}</span></div>
              <div class="detail-item"><strong>AQI</strong> <span class="rating-${aqiInfo.class}">${aqiInfo.level}</span></div>
              <div class="detail-item"><strong>Sunrise</strong> ${data.forecast.forecastday[0].astro.sunrise}</div>
          </div>
      `;

      // Trigger weather animations based on condition
      applyWeatherAnimation(current.condition.code, current.condition.text);
      applyWeatherTheme(current);
  }

  // --- WEATHER THEMING ---
  function applyWeatherTheme(current) {
      const body = document.body;
      const text = (current.condition && current.condition.text || '').toLowerCase();
      const isNight = current.is_day === 0;

      // Reset theme classes
      body.classList.remove(
          'theme-clear', 'theme-rain', 'theme-snow', 'theme-thunder', 'theme-clouds', 'theme-fog', 'theme-wind', 'theme-night'
      );

      // Assign theme based on condition text
      if (text.includes('thunder')) body.classList.add('theme-thunder');
      else if (text.includes('snow') || text.includes('blizzard')) body.classList.add('theme-snow');
      else if (text.includes('rain') || text.includes('shower') || text.includes('drizzle')) body.classList.add('theme-rain');
      else if (text.includes('fog') || text.includes('mist') || text.includes('haze') || text.includes('smoke')) body.classList.add('theme-fog');
      else if (text.includes('cloud')) body.classList.add('theme-clouds');
      else if (current.wind_kph >= 35 || text.includes('wind')) body.classList.add('theme-wind');
      else body.classList.add('theme-clear');

      if (isNight) body.classList.add('theme-night');
  }

  // --- HISTORY (7 days) ---
  async function loadAndRenderHistory(location) {
      try {
          const key = (location.name || `${location.lat},${location.lon}`).toLowerCase();
          let history = historyCache.get(key);
          if (!history) {
              history = await fetchLast7DaysHistory(location.lat, location.lon);
              historyCache.set(key, history);
          }
          renderHistoryChart(history);
          document.getElementById('historyError').style.display = 'none';
      } catch (e) {
          console.error('History fetch error:', e);
          const errEl = document.getElementById('historyError');
          if (errEl) {
              errEl.textContent = 'Unable to load history.';
              errEl.style.display = 'block';
          }
      }
  }

  async function fetchLast7DaysHistory(lat, lon) {
      // WeatherAPI history is per day; call 7 times, from yesterday back 6 more days
      const days = [];
      const now = new Date();
      for (let i = 1; i <= 7; i += 1) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          const url = `${BASE_URL}/history.json?key=${API_KEY}&q=${encodeURIComponent(lat + ',' + lon)}&dt=${dateStr}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`History error ${res.status}`);
          const json = await res.json();
          days.push(json);
      }
      return days;
  }

  function renderHistoryChart(historyDays) {
      const canvas = document.getElementById('historyChart');
      if (!canvas || !Array.isArray(historyDays) || historyDays.length === 0) return;
      const isMetric = currentUnit === 'metric';

      const labels = [];
      const avgTemps = [];
      const avgHumidity = [];
      const avgPressure = [];
      const precips = [];
      // Build from oldest to newest
      for (let i = historyDays.length - 1; i >= 0; i -= 1) {
          const day = historyDays[i];
          const dateLabel = day.forecast && day.forecast.forecastday && day.forecast.forecastday[0]
              ? day.forecast.forecastday[0].date
              : '';
          labels.push(dateLabel);
          const dayData = day.forecast.forecastday[0].day;
          avgTemps.push(isMetric ? dayData.avgtemp_c : dayData.avgtemp_f);
          avgHumidity.push(dayData.avghumidity);
          precips.push(dayData.totalprecip_mm);
          const hours = day.forecast.forecastday[0].hour || [];
          if (hours.length) {
              const sum = hours.reduce((acc, h) => acc + (h.pressure_mb || 0), 0);
              avgPressure.push(Math.round((sum / hours.length) * 10) / 10);
          } else {
              avgPressure.push(null);
          }
      }

      if (historyChart) {
          historyChart.destroy();
      }

      const tempLabel = `Temp (${isMetric ? '°C' : '°F'})`;
      const humidityLabel = 'Humidity (%)';
      const pressureLabel = 'Pressure (hPa)';
      const precipLabel = 'Precip (mm)';

      historyChart = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
              labels,
              datasets: [
                  {
                      label: tempLabel,
                      data: avgTemps,
                      borderColor: '#00c6ff',
                      backgroundColor: 'rgba(0, 198, 255, 0.12)',
                      borderWidth: 2,
                      tension: 0.3,
                      yAxisID: 'y1',
                      pointRadius: 2,
                      pointHoverRadius: 4,
                  },
                  {
                      label: humidityLabel,
                      data: avgHumidity,
                      borderColor: 'rgba(46, 204, 113, 1)',
                      backgroundColor: 'rgba(46, 204, 113, 0.12)',
                      borderWidth: 2,
                      tension: 0.3,
                      yAxisID: 'y2',
                      pointRadius: 2,
                      pointHoverRadius: 4,
                  },
                  {
                      label: pressureLabel,
                      data: avgPressure,
                      borderColor: 'rgba(241, 196, 15, 1)',
                      backgroundColor: 'rgba(241, 196, 15, 0.12)',
                      borderWidth: 2,
                      tension: 0.3,
                      yAxisID: 'y3',
                      pointRadius: 2,
                      pointHoverRadius: 4,
                  },
                  {
                      type: 'bar',
                      label: precipLabel,
                      data: precips,
                      backgroundColor: 'rgba(52, 152, 219, 0.35)',
                      borderColor: 'rgba(52, 152, 219, 0.9)',
                      borderWidth: 1,
                      yAxisID: 'y4',
                  }
              ]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                  y1: {
                      type: 'linear',
                      position: 'left',
                      title: { display: true, text: tempLabel, color: '#fff' },
                      grid: { color: 'rgba(255,255,255,0.08)' },
                      ticks: { color: '#fff' },
                  },
                  y2: {
                      type: 'linear',
                      position: 'right',
                      title: { display: true, text: humidityLabel, color: '#fff' },
                      grid: { drawOnChartArea: false },
                      ticks: { color: '#fff' },
                  },
                  y3: {
                      type: 'linear',
                      position: 'left',
                      title: { display: true, text: pressureLabel, color: '#fff' },
                      grid: { drawOnChartArea: false },
                      ticks: { color: '#fff' },
                      offset: true,
                  },
                  y4: {
                      type: 'linear',
                      position: 'right',
                      title: { display: true, text: precipLabel, color: '#fff' },
                      grid: { drawOnChartArea: false },
                      ticks: { color: '#fff' },
                      offset: true,
                  },
                  x: {
                      ticks: { color: '#fff' },
                      grid: { color: 'rgba(255,255,255,0.08)' },
                  }
              },
              plugins: {
                  legend: {
                      labels: { color: '#fff' }
                  },
                  tooltip: {
                      mode: 'index',
                      intersect: false,
                  }
              },
              elements: { line: { spanGaps: true } },
              interaction: { mode: 'nearest', intersect: false },
          }
      });
  }

  // --- WEATHER ANIMATIONS ---
  function clearAnimations() {
      const container = document.getElementById('weather-anim');
      if (!container) return;
      container.innerHTML = '';
  }

  function applyWeatherAnimation(conditionCode, conditionText) {
      const container = document.getElementById('weather-anim');
      if (!container) return;
      clearAnimations();
      const text = (conditionText || '').toLowerCase();

      if (text.includes('thunder')) {
          // Lightning flashes
          const flash = document.createElement('div');
          flash.className = 'lightning';
          container.appendChild(flash);
          return;
      }

      if (text.includes('snow') || text.includes('blizzard')) {
          spawnSnow(container);
          return;
      }

      if (text.includes('rain') || text.includes('drizzle') || text.includes('shower')) {
          spawnRain(container);
          return;
      }

      if (text.includes('sun') || text.includes('clear')) {
          spawnSunny(container);
          return;
      }
  }

  function spawnRain(container) {
      const drops = 120; // balanced for perf
      const frag = document.createDocumentFragment();
      for (let i = 0; i < drops; i += 1) {
          const d = document.createElement('div');
          d.className = 'rain-drop';
          d.style.setProperty('--x', `${Math.random() * 100}vw`);
          d.style.setProperty('--dur', `${0.9 + Math.random() * 1.4}s`);
          d.style.left = `${Math.random() * 100}vw`;
          d.style.top = `${-20 - Math.random() * 120}px`;
          frag.appendChild(d);
      }
      container.appendChild(frag);
  }

  function spawnSnow(container) {
      const flakes = 80;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < flakes; i += 1) {
          const f = document.createElement('div');
          f.className = 'snow-flake';
          f.style.setProperty('--x', `${Math.random() * 100}vw`);
          f.style.setProperty('--dur', `${4 + Math.random() * 5}s`);
          f.style.left = `${Math.random() * 100}vw`;
          f.style.top = `${-20 - Math.random() * 120}px`;
          frag.appendChild(f);
      }
      container.appendChild(frag);
  }

  function spawnSunny(container) {
      const sun = document.createElement('div');
      sun.className = 'sun';
      container.appendChild(sun);

      // moving clouds
      for (let i = 0; i < 3; i += 1) {
          const cl = document.createElement('div');
          cl.className = 'cloud';
          cl.style.top = `${10 + Math.random() * 25}vh`;
          cl.style.animationDuration = `${24 + Math.random() * 16}s`;
          cl.style.opacity = `${0.6 + Math.random() * 0.3}`;
          container.appendChild(cl);
      }
  }

  function displayHourlyForecast(data) {
      hourlyContainer.innerHTML = "";
      const hours = data.forecast.forecastday[0].hour;
      const currentEpoch = Math.floor(Date.now() / 1000);
      const isMetric = currentUnit === "metric";
      const tempUnit = isMetric ? "°C" : "°F";

      hours.filter(hour => hour.time_epoch > currentEpoch).slice(0, 24).forEach(hour => {
          const item = document.createElement("div");
          item.className = "hourly-item neumorphic";
          const temp = isMetric ? hour.temp_c : hour.temp_f;
          item.innerHTML = `
              <div>${hour.time.split(" ")[1]}</div>
              <img class="hourly-icon" src="https:${hour.condition.icon}" alt="${hour.condition.text}">
              <div class="hourly-temp">${Math.round(temp)}${tempUnit}</div>
          `;
          hourlyContainer.appendChild(item);
      });
  }

  function displayDailyForecast(data) {
      forecastDisplay.innerHTML = "";
      const isMetric = currentUnit === "metric";
      const tempUnit = isMetric ? "°C" : "°F";
      data.forecast.forecastday.slice(0, 5).forEach(day => {
          const card = document.createElement("div");
          card.className = "forecast-card neumorphic";
          const maxTemp = isMetric ? day.day.maxtemp_c : day.day.maxtemp_f;
          const minTemp = isMetric ? day.day.mintemp_c : day.day.mintemp_f;
          card.innerHTML = `
              <div class="forecast-day">${formatDay(day.date_epoch)}</div>
              <img class="forecast-icon" src="https:${day.day.condition.icon}" alt="${day.day.condition.text}">
              <div class="forecast-temp">
                  <strong>${Math.round(maxTemp)}${tempUnit}</strong> / ${Math.round(minTemp)}${tempUnit}
              </div>
              <div class="forecast-condition">${day.day.condition.text}</div>
          `;
          forecastDisplay.appendChild(card);
      });
  }

  function displayActivities(data) {
      const container = document.querySelector('.activities-grid');
      if (!container) return;
      const rating = getActivityRating(data);
      container.innerHTML = `<div class="activity-item neumorphic"><i class="fas fa-person-running"></i><span class="item-title">Running</span><span class="${rating.class}">${rating.level}</span></div><div class="activity-item neumorphic"><i class="fas fa-person-hiking"></i><span class="item-title">Hiking</span><span class="${rating.class}">${rating.level}</span></div><div class="activity-item neumorphic"><i class="fas fa-person-biking"></i><span class="item-title">Biking</span><span class="${rating.class}">${rating.level}</span></div><div class="activity-item neumorphic"><i class="fas fa-tree"></i><span class="item-title">Outdoor</span><span class="${rating.class}">${rating.level}</span></div>`;
  }

  function displayAllergies(data) {
      const container = document.querySelector('.allergies-grid');
      if (!container) return;
      const rating = getAllergyRating(data);
      container.innerHTML = `<div class="allergy-item neumorphic"><i class="fas fa-wind"></i><span class="item-title">Airborne Pollutants</span><span class="${rating.class}">${rating.level}</span></div>`;
  }

  // --- UTILITY & HELPER FUNCTIONS ---
  function setLoading(isLoading) { loader.style.display = isLoading ? "block" : "none"; searchBtn.disabled = isLoading; locBtn.disabled = isLoading; cityInput.disabled = isLoading; }
  function formatDay(unix) { const date = new Date(unix * 1000); return date.toLocaleDateString("en-US", { weekday: "short" }); }
  function getUviInfo(uvi) { if (uvi <= 2) return { level: "Low", class: "good" }; if (uvi <= 7) return { level: "Moderate", class: "fair" }; return { level: "High", class: "bad" }; }
  function getAqiInfo(aqi) { switch (aqi) { case 1: case 2: return { level: "Good", class: "good" }; case 3: return { level: "Moderate", class: "fair" }; default: return { level: "Poor", class: "bad" }; } }
  function getActivityRating(weatherData) { const { temp_c, precip_mm, uv } = weatherData.current; if (precip_mm > 0.1 || temp_c > 35 || temp_c < 5) return { level: 'Bad', class: 'rating-bad' }; if (uv > 7 || temp_c > 30) return { level: 'Fair', class: 'rating-fair' }; return { level: 'Good', class: 'rating-good' }; }
  function getAllergyRating(weatherData) { const aqi = weatherData.current.air_quality['us-epa-index']; if (aqi >= 3 && aqi <= 4) return { level: 'Moderate', class: 'rating-fair' }; if (aqi > 4) return { level: 'High', class: 'rating-bad' }; return { level: 'Low', class: 'rating-good' }; }

  // --- UNIT & LOCATION MANAGEMENT ---
  function setUnit(isImperial) { currentUnit = isImperial ? "imperial" : "metric"; unitToggle.checked = isImperial; localStorage.setItem("unit", currentUnit); if (currentWeatherData) { updateAllDisplays(); const loc = currentWeatherData.location; loadAndRenderHistory({ lat: loc.lat, lon: loc.lon, name: loc.name }); } }
  function renderSavedCities() { savedLocationsContainer.innerHTML = ""; if (savedCities.length > 0) { const title = document.createElement('strong'); title.textContent = 'Saved Locations:'; savedLocationsContainer.appendChild(title); } savedCities.forEach(city => { const btn = document.createElement("button"); btn.className = "saved-city-btn neumorphic"; btn.textContent = city; btn.onclick = () => fetchWeatherData(city); const removeBtn = document.createElement("button"); removeBtn.className = "remove-city-btn"; removeBtn.innerHTML = "&times;"; removeBtn.title = `Remove ${city}`; removeBtn.onclick = (e) => { e.stopPropagation(); removeCity(city); }; btn.appendChild(removeBtn); savedLocationsContainer.appendChild(btn); }); }
  function saveCity(city) { const standardizedCity = city.trim(); if (!savedCities.some(c => c.toLowerCase() === standardizedCity.toLowerCase())) { savedCities.push(standardizedCity); localStorage.setItem("savedCities", JSON.stringify(savedCities)); renderSavedCities(); } }
  function removeCity(city) { savedCities = savedCities.filter(c => c.toLowerCase() !== city.toLowerCase()); localStorage.setItem("savedCities", JSON.stringify(savedCities)); renderSavedCities(); }

  // --- INITIALIZATION & EVENT LISTENERS ---
  function initializeApp() {
      unitToggle.checked = currentUnit === "imperial";
      renderSavedCities();
      fetchWeatherData(lastSearchedCity);
  }

  searchBtn.addEventListener("click", () => fetchWeatherData(cityInput.value.trim()));
  cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") fetchWeatherData(cityInput.value.trim()); });
  locBtn.addEventListener("click", () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  const { latitude, longitude } = position.coords;
                  fetchWeatherData(`${latitude},${longitude}`);
              },
              (error) => {
                  console.error("Geolocation error:", error);
                  displayError("Could not get your location.");
              }
          );
      } else {
          displayError("Geolocation is not supported by your browser.");
      }
  });
  unitToggle.addEventListener("change", () => setUnit(unitToggle.checked));
  mapControls.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
          mapControls.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
          e.target.classList.add('active');
          const layer = e.target.dataset.layer;
          currentLayer = layer;
          ensureLeafletMap(lastLat, lastLon);
          setOWMOverlay(layer);
      }
  });

  // Initialize the application
  initializeApp();

});