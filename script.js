// Wait for the entire HTML document to be ready before running the script
document.addEventListener('DOMContentLoaded', () => {

  // --- API KEYS & CONFIGURATION ---
  // WeatherAPI.com Key for weather data
  const API_KEY = "314f1390e38048d3ba1182817250808";
  const BASE_URL = "https://api.weatherapi.com/v1";
  // OpenWeather Maps API key (tiles)
  const OPENWEATHER_MAP_KEY = "0ec27aacec1774f2c8a3385c3f1bb395";

  const RESPONSE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const AUTO_REFRESH_MS = 12 * 60 * 1000; // 12 minutes
  const AUTOCOMPLETE_DEBOUNCE_MS = 250; // fast debounce

  // --- DOM ELEMENTS ---
  const cityInput = document.getElementById("cityInput");
  const searchBtn = document.getElementById("searchBtn");
  const locBtn = document.getElementById("locBtn");
  const loader = document.getElementById("loader");
  const weatherDisplay = document.getElementById("current");
  const hourlyContainer = document.getElementById("hourlyContainer");
  const hourlyTabs = document.getElementById("hourlyTabs");
  const hourlySparklineCanvas = document.getElementById("hourlySparkline");
  const forecastDisplay = document.getElementById("forecast");
  const savedLocationsContainer = document.getElementById("savedLocations");
  const unitToggle = document.getElementById("unitToggle");
  const mapControls = document.querySelector('.map-controls');
  const layerOpacity = document.getElementById('layerOpacity');
  const mapLegend = document.getElementById('mapLegend');
  const mapSearchInput = document.getElementById('mapSearchInput');
  const mapSearchBtn = document.getElementById('mapSearchBtn');
  const alertsBanner = document.getElementById('alertsBanner');
  const autocompleteList = document.getElementById('autocompleteList');
  const moreDaysBtn = document.getElementById('moreDaysBtn');
  const compareToggleBtn = document.getElementById('compareToggleBtn');
  const comparePanel = document.getElementById('comparePanel');
  const compareCitiesList = document.getElementById('compareCitiesList');
  const applyCompareBtn = document.getElementById('applyCompareBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const shareImageBtn = document.getElementById('shareImageBtn');
  const shareLinkBtn = document.getElementById('shareLinkBtn');
  const staleBadge = document.getElementById('staleBadge');
  const suggestionsList = document.getElementById('suggestionsList');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const reduceMotionToggle = document.getElementById('reduceMotionToggle');
  const langSelect = document.getElementById('langSelect');
  const prefTempMin = document.getElementById('prefTempMin');
  const prefTempMax = document.getElementById('prefTempMax');
  const prefMaxWind = document.getElementById('prefMaxWind');
  const notifyRainToggle = document.getElementById('notifyRainToggle');
  const notifyUvToggle = document.getElementById('notifyUvToggle');

  // --- APP STATE ---
  let currentUnit = localStorage.getItem("unit") || "metric";
  let savedCities = JSON.parse(localStorage.getItem("savedCities")) || [];
  let lastSearchedCity = localStorage.getItem("lastSearchedCity") || "Pune";
  let currentWeatherData = null;
  let historyCache = new Map(); // key: city name (lowercased), value: history data
  let historyChart = null;
  let hourlySparkline = null;
  let currentDaysRequested = 5;
  let autoRefreshTimer = null;
  let autocompleteTimer = null;
  let selectedHourlyDayIndex = 0;
  let reduceMotion = JSON.parse(localStorage.getItem('reduceMotion') || 'false');
  let currentLang = localStorage.getItem('lang') || 'en';
  let userPrefs = JSON.parse(localStorage.getItem('activityPrefs') || '{"tempMin":10,"tempMax":30,"maxWind":25}');
  let notificationsPrefs = JSON.parse(localStorage.getItem('notifyPrefs') || '{"rain":false,"uv":false}');

  // --- MAP STATE ---
  let currentLayer = 'rain';
  let lastLat = null;
  let lastLon = null;
  let leafletMap = null;
  let osmBaseLayer = null;
  let owmOverlayLayer = null;
  let mapMarker = null;

  // --- CORE DATA FETCHING ---
  async function fetchWeatherData(query, options = {}) {
      if (!query) {
          displayError("Please provide a city name or location.");
          return;
      }
      const days = options.days || currentDaysRequested || 5;
      const lang = currentLang || 'en';
      const cacheKey = `weatherCache:${query}:${currentUnit}:${lang}:${days}`;
      const now = Date.now();
      const cached = localStorage.getItem(cacheKey);
      let usedCache = false;
      setLoading(true);
      const url = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=${days}&aqi=yes&alerts=yes&lang=${encodeURIComponent(lang)}`;
      try {
          // Try cache first
          if (cached) {
              try {
                  const cachedObj = JSON.parse(cached);
                  if (cachedObj && (now - cachedObj.ts) < RESPONSE_TTL_MS) {
                      currentWeatherData = cachedObj.data;
                      lastSearchedCity = cachedObj.data.location.name;
                      localStorage.setItem("lastSearchedCity", lastSearchedCity);
                      saveCity(cachedObj.data.location.name);
                      updateAllDisplays();
                      lastLat = cachedObj.data.location.lat;
                      lastLon = cachedObj.data.location.lon;
                      ensureLeafletMap(lastLat, lastLon);
                      setOWMOverlay(currentLayer);
                      await loadAndRenderHistory(cachedObj.data.location);
                      usedCache = true;
                  }
              } catch {}
          }

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
          // cache it
          try { localStorage.setItem(cacheKey, JSON.stringify({ ts: now, data })); } catch {}

          updateAllDisplays();
          lastLat = data.location.lat;
          lastLon = data.location.lon;
          ensureLeafletMap(lastLat, lastLon);
          setOWMOverlay(currentLayer);

          // Fetch and render 7-day history for the selected city
          await loadAndRenderHistory(data.location);
          maybeNotify(data);

      } catch (err) {
          console.error("Error fetching weather data:", err);
          displayError(err.message);
          currentWeatherData = null;
      } finally {
          setLoading(false);
          // stale indicator
          if (staleBadge) staleBadge.style.display = usedCache ? 'inline-block' : 'none';
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

      // set opacity slider value
      if (layerOpacity) {
          const op = layer === 'clouds' ? 0.45 : (layer === 'temp' ? 0.6 : 0.7);
          layerOpacity.value = String(op);
      }

      // update legend
      if (mapLegend) {
          if (layer === 'temp') mapLegend.textContent = 'Temperature overlay (hot → red, cold → blue)';
          else if (layer === 'clouds') mapLegend.textContent = 'Cloud cover intensity';
          else mapLegend.textContent = 'Radar reflectivity (precipitation)';
      }
  }

  // --- DISPLAY FUNCTIONS ---
  function updateAllDisplays() {
      if (!currentWeatherData) return;
      displayCurrent(currentWeatherData);
      buildHourlyTabs(currentWeatherData);
      displayHourlyForecast(currentWeatherData, selectedHourlyDayIndex);
      displayDailyForecast(currentWeatherData);
      displayActivities(currentWeatherData);
      displayAllergies(currentWeatherData);
      displayAlerts(currentWeatherData);
      renderSuggestions(currentWeatherData);
      if (shareLinkBtn) shareLinkBtn.disabled = false;
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
      const dewPointC = computeDewPointC(current.temp_c, current.humidity);
      const dewPoint = isMetric ? dewPointC : Math.round((dewPointC * 9/5 + 32) * 10) / 10;
      const vis = isMetric ? `${current.vis_km} km` : `${current.vis_miles} mi`;
      const pressure = `${current.pressure_mb} hPa`;
      const pTrend = getPressureTrend(data);
      const moon = data.forecast.forecastday[0].astro.moon_phase;

      weatherDisplay.innerHTML = `
          <p class="city-name">${location.name}, ${location.country}</p>
          <img class="weather-icon" src="https:${current.condition.icon}" alt="${current.condition.text}">
          <p class="temp">${Math.round(temp)}${tempUnit}</p>
          <p class="description">${current.condition.text}</p>
          <div class="weather-details">
              <div class="detail-item"><strong>Feels Like</strong> ${Math.round(feelsLike)}${tempUnit}</div>
              <div class="detail-item"><strong>Humidity</strong> ${current.humidity}%</div>
              <div class="detail-item"><strong>Wind</strong> ${windSpeed} ${speedUnit} ${current.wind_dir} (gusts ${isMetric ? current.gust_kph : current.gust_mph} ${speedUnit})</div>
              <div class="detail-item"><strong>UV Index</strong> <span class="rating-${uviInfo.class}">${uviInfo.level}</span></div>
              <div class="detail-item"><strong>AQI</strong> <span class="rating-${aqiInfo.class}">${aqiInfo.level}</span></div>
              <div class="detail-item"><strong>Sunrise</strong> ${data.forecast.forecastday[0].astro.sunrise}</div>
              <div class="detail-item"><strong>Sunset</strong> ${data.forecast.forecastday[0].astro.sunset}</div>
              <div class="detail-item"><strong>Dew Point</strong> ${dewPoint}${tempUnit}</div>
              <div class="detail-item"><strong>Visibility</strong> ${vis}</div>
              <div class="detail-item"><strong>Pressure</strong> ${pressure} <span title="${pTrend.label}">${pTrend.symbol}</span></div>
              <div class="detail-item"><strong>Moon</strong> ${moon}</div>
          </div>
          <div class="aqi-breakdown">${renderAqiBreakdown(current.air_quality)}</div>
      `;

      // Trigger weather animations based on condition
      if (!reduceMotion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        applyWeatherAnimation(current.condition.code, current.condition.text);
      } else {
        clearAnimations();
      }
      applyWeatherTheme(current);
  }

  function renderAqiBreakdown(aq) {
      if (!aq) return '';
      const parts = [];
      if (aq.pm2_5 != null) parts.push(`<span>PM2.5: ${aq.pm2_5.toFixed(1)}</span>`);
      if (aq.pm10 != null) parts.push(`<span>PM10: ${aq.pm10.toFixed(1)}</span>`);
      if (aq.no2 != null) parts.push(`<span>NO₂: ${aq.no2.toFixed(1)}</span>`);
      if (aq.o3 != null) parts.push(`<span>O₃: ${aq.o3.toFixed(1)}</span>`);
      if (aq.so2 != null) parts.push(`<span>SO₂: ${aq.so2.toFixed(1)}</span>`);
      return parts.length ? `<div class="aq-parts">${parts.join(' • ')}</div>` : '';
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

      // reduce motion class if enabled
      if (reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          body.classList.add('reduce-motion');
      } else {
          body.classList.remove('reduce-motion');
      }
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

  function renderHistoryChartMulti(seriesList) {
      const canvas = document.getElementById('historyChart');
      if (!canvas || !Array.isArray(seriesList) || !seriesList.length) return;
      const isMetric = currentUnit === 'metric';
      const labels = [];
      // Build labels from first series
      const first = seriesList[0].history;
      for (let i = first.length - 1; i >= 0; i -= 1) {
          const day = first[i].forecast.forecastday[0];
          labels.push(day.date);
      }
      const palette = ['#00c6ff','#2ecc71','#f1c40f','#e74c3c'];
      const datasets = seriesList.map((s, idx) => {
          const temps = [];
          for (let i = s.history.length - 1; i >= 0; i -= 1) {
              const day = s.history[i].forecast.forecastday[0];
              temps.push(isMetric ? day.day.avgtemp_c : day.day.avgtemp_f);
          }
          return {
              label: `${s.name} (${isMetric ? '°C' : '°F'})`,
              data: temps,
              borderColor: palette[idx % palette.length],
              backgroundColor: 'transparent',
              borderWidth: 2,
              tension: 0.3,
              yAxisID: 'y1',
              pointRadius: 2,
              pointHoverRadius: 4,
          };
      });
      if (historyChart) historyChart.destroy();
      historyChart = new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: { labels, datasets },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: { y1: { type:'linear', position:'left', title:{ display:true, text:`Temp (${isMetric ? '°C' : '°F'})`, color:'#fff' }, grid:{ color:'rgba(255,255,255,0.08)' }, ticks:{ color:'#fff' } }, x:{ ticks:{ color:'#fff' }, grid:{ color:'rgba(255,255,255,0.08)' } } },
              plugins: { legend: { labels: { color:'#fff' } } },
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

  function buildHourlyTabs(data) {
      if (!hourlyTabs) return;
      hourlyTabs.innerHTML = '';
      const days = data.forecast.forecastday.slice(0, Math.min(3, data.forecast.forecastday.length));
      days.forEach((d, idx) => {
          const btn = document.createElement('button');
          btn.className = `map-btn ${idx === selectedHourlyDayIndex ? 'active' : ''}`;
          btn.role = 'tab';
          btn.textContent = formatDay(d.date_epoch);
          btn.addEventListener('click', () => {
              selectedHourlyDayIndex = idx;
              buildHourlyTabs(data);
              displayHourlyForecast(data, idx);
          });
          hourlyTabs.appendChild(btn);
      });
  }

  function displayHourlyForecast(data, dayIndex = 0) {
      hourlyContainer.innerHTML = "";
      const hours = data.forecast.forecastday[dayIndex].hour;
      const currentEpoch = Math.floor(Date.now() / 1000);
      const isMetric = currentUnit === "metric";
      const tempUnit = isMetric ? "°C" : "°F";
      const visibleHours = dayIndex === 0 ? hours.filter(h => h.time_epoch > currentEpoch).slice(0, 24) : hours.slice(0, 24);

      const popData = [];

      const prefs = userPrefs || { tempMin: 10, tempMax: 30, maxWind: 25 };
      visibleHours.forEach(hour => {
          const item = document.createElement("div");
          item.className = "hourly-item neumorphic";
          const temp = isMetric ? hour.temp_c : hour.temp_f;
          const pop = Math.max(hour.chance_of_rain || 0, hour.chance_of_snow || 0);
          const cloud = hour.cloud != null ? `${hour.cloud}%` : '';
          const isGood = (hour.temp_c >= prefs.tempMin && hour.temp_c <= prefs.tempMax && hour.wind_kph <= prefs.maxWind && pop < 30);
          if (isGood) item.classList.add('good-hour');
          item.innerHTML = `
              <div>${hour.time.split(" ")[1]}</div>
              <img class="hourly-icon" src="https:${hour.condition.icon}" alt="${hour.condition.text}">
              <div class="hourly-temp">${Math.round(temp)}${tempUnit}</div>
              <div class="hourly-extra">PoP ${pop}% • Cloud ${cloud}</div>
          `;
          hourlyContainer.appendChild(item);
          popData.push(pop);
      });

      renderHourlySparkline(popData);
  }

  function renderHourlySparkline(popData) {
      if (!hourlySparklineCanvas) return;
      const ctx = hourlySparklineCanvas.getContext('2d');
      if (hourlySparkline) hourlySparkline.destroy();
      hourlySparkline = new Chart(ctx, {
          type: 'line',
          data: { labels: popData.map((_, i) => String(i + 1)), datasets: [{ label: 'PoP %', data: popData, borderColor: '#34ace0', backgroundColor: 'rgba(52,172,224,0.2)', borderWidth: 2, tension: 0.3, pointRadius: 0 }] },
          options: { responsive: true, maintainAspectRatio: false, scales: { y: { suggestedMin: 0, suggestedMax: 100, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.08)' } }, x: { display: false } }, plugins: { legend: { display: false } } }
      });
  }

  function displayDailyForecast(data) {
      forecastDisplay.innerHTML = "";
      const isMetric = currentUnit === "metric";
      const tempUnit = isMetric ? "°C" : "°F";
      data.forecast.forecastday.slice(0, currentDaysRequested).forEach(day => {
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
  function formatDay(unix) { const date = new Date(unix * 1000); const locale = currentLang || 'en'; return date.toLocaleDateString(locale, { weekday: "short" }); }
  function getUviInfo(uvi) { if (uvi <= 2) return { level: "Low", class: "good" }; if (uvi <= 7) return { level: "Moderate", class: "fair" }; return { level: "High", class: "bad" }; }
  function getAqiInfo(aqi) { switch (aqi) { case 1: case 2: return { level: "Good", class: "good" }; case 3: return { level: "Moderate", class: "fair" }; default: return { level: "Poor", class: "bad" }; } }
  function getActivityRating(weatherData) { const { temp_c, precip_mm, uv } = weatherData.current; if (precip_mm > 0.1 || temp_c > 35 || temp_c < 5) return { level: 'Bad', class: 'rating-bad' }; if (uv > 7 || temp_c > 30) return { level: 'Fair', class: 'rating-fair' }; return { level: 'Good', class: 'rating-good' }; }
  function getAllergyRating(weatherData) { const aqi = weatherData.current.air_quality['us-epa-index']; if (aqi >= 3 && aqi <= 4) return { level: 'Moderate', class: 'rating-fair' }; if (aqi > 4) return { level: 'High', class: 'rating-bad' }; return { level: 'Low', class: 'rating-good' }; }
  function computeDewPointC(tempC, humidityPct) { const a=17.62,b=243.12; const gamma=(a*tempC)/(b+tempC)+Math.log(humidityPct/100); const dew=(b*gamma)/(a-gamma); return Math.round(dew*10)/10; }
  function getPressureTrend(data) { try { const hours=data.forecast.forecastday[0].hour; const now=Math.floor(Date.now()/1000); let closestIdx=0,minDiff=Infinity; for (let i=0;i<hours.length;i+=1){ const diff=Math.abs(hours[i].time_epoch-now); if (diff<minDiff){minDiff=diff; closestIdx=i;} } const curr=hours[closestIdx].pressure_mb||0; const prevIdx=Math.max(0,closestIdx-3); const prev=hours[prevIdx].pressure_mb||0; const delta=Math.round((curr-prev)*10)/10; if (delta>0.5) return {label:`Rising ${delta} mb`, symbol:'↗'}; if (delta<-0.5) return {label:`Falling ${Math.abs(delta)} mb`, symbol:'↘'}; return {label:'Steady', symbol:'→'}; } catch { return {label:'', symbol:''}; } }

  function displayAlerts(data) {
      if (!alertsBanner) return;
      const alerts = (data && data.alerts && data.alerts.alert) || [];
      if (!alerts.length) { alertsBanner.style.display = 'none'; alertsBanner.innerHTML = ''; return; }
      alertsBanner.style.display = 'block';
      alertsBanner.innerHTML = alerts.map((a, idx) => `
        <div class="alert-item">
          <span class="alert-title">${a.event || 'Alert'}</span>
          <span class="alert-area">${a.areas || ''}</span>
          <button class="alert-dismiss" data-idx="${idx}" aria-label="Dismiss alert">&times;</button>
        </div>`).join('');
      alertsBanner.addEventListener('click', (e) => {
        if (e.target.classList.contains('alert-dismiss')) {
          const parent = e.target.closest('.alert-item');
          if (parent) parent.remove();
          if (!alertsBanner.querySelector('.alert-item')) alertsBanner.style.display = 'none';
        }
      }, { once: true });
  }

  function renderSuggestions(data) {
      if (!suggestionsList) return;
      const suggestions = [];
      const nowEpoch = Math.floor(Date.now() / 1000);
      const nextHours = data.forecast.forecastday[0].hour.filter(h => h.time_epoch > nowEpoch).slice(0, 3);
      const willRain = nextHours.some(h => (h.will_it_rain || 0) === 1 || (h.chance_of_rain || 0) >= 50);
      if (willRain) suggestions.push('Carry an umbrella (rain expected soon).');
      if (data.current.uv >= 7) suggestions.push('High UV — use sunscreen and wear a hat.');
      if (data.current.temp_c <= 10) suggestions.push('It’s cold — wear a jacket.');
      // Activity windows based on preferences
      const p = userPrefs;
      const goodHours = data.forecast.forecastday[0].hour.filter(h => h.temp_c >= p.tempMin && h.temp_c <= p.tempMax && h.wind_kph <= p.maxWind && (h.chance_of_rain || 0) < 30).slice(0, 3);
      if (goodHours.length) {
          const times = goodHours.map(h => h.time.split(' ')[1]).join(', ');
          suggestions.push(`Good hours for outdoor activities: ${times}`);
      }
      suggestionsList.innerHTML = suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('') || '<div class="suggestion-item">No special suggestions.</div>';
  }

  // --- UNIT & LOCATION MANAGEMENT ---
  function setUnit(isImperial) { currentUnit = isImperial ? "imperial" : "metric"; unitToggle.checked = isImperial; localStorage.setItem("unit", currentUnit); if (currentWeatherData) { updateAllDisplays(); const loc = currentWeatherData.location; loadAndRenderHistory({ lat: loc.lat, lon: loc.lon, name: loc.name }); } updateShareLinkState(); }
  function renderSavedCities() {
      savedLocationsContainer.innerHTML = "";
      if (savedCities.length > 0) { const title = document.createElement('strong'); title.textContent = 'Saved Locations:'; savedLocationsContainer.appendChild(title); }
      savedCities.forEach((city, idx) => {
          const btn = document.createElement("button");
          btn.className = "saved-city-btn neumorphic";
          btn.textContent = city;
          btn.draggable = true;
          btn.dataset.index = String(idx);
          btn.onclick = () => fetchWeatherData(city);
          const removeBtn = document.createElement("button");
          removeBtn.className = "remove-city-btn";
          removeBtn.innerHTML = "&times;";
          removeBtn.title = `Remove ${city}`;
          removeBtn.onclick = (e) => { e.stopPropagation(); removeCity(city); };
          btn.appendChild(removeBtn);
          savedLocationsContainer.appendChild(btn);
      });
      enableSavedCitiesDnD();
      buildCompareCitiesList();
  }
  function enableSavedCitiesDnD() {
      let dragIdx = null;
      savedLocationsContainer.addEventListener('dragstart', (e) => {
          const t = e.target;
          if (t && t.classList && t.classList.contains('saved-city-btn')) {
              dragIdx = Number(t.dataset.index);
          }
      });
      savedLocationsContainer.addEventListener('dragover', (e) => { e.preventDefault(); });
      savedLocationsContainer.addEventListener('drop', (e) => {
          e.preventDefault();
          const t = e.target.closest('.saved-city-btn');
          if (!t) return;
          const dropIdx = Number(t.dataset.index);
          if (dragIdx === null || isNaN(dropIdx)) return;
          const moved = savedCities.splice(dragIdx, 1)[0];
          savedCities.splice(dropIdx, 0, moved);
          localStorage.setItem("savedCities", JSON.stringify(savedCities));
          renderSavedCities();
      });
  }
  function saveCity(city) { const standardizedCity = city.trim(); if (!savedCities.some(c => c.toLowerCase() === standardizedCity.toLowerCase())) { savedCities.push(standardizedCity); localStorage.setItem("savedCities", JSON.stringify(savedCities)); renderSavedCities(); } }
  function removeCity(city) { savedCities = savedCities.filter(c => c.toLowerCase() !== city.toLowerCase()); localStorage.setItem("savedCities", JSON.stringify(savedCities)); renderSavedCities(); }

  // --- INITIALIZATION & EVENT LISTENERS ---
  function initializeApp() {
      // URL params
      const params = new URLSearchParams(location.search);
      const qParam = params.get('q');
      const unitParam = params.get('unit');
      const langParam = params.get('lang');
      if (unitParam === 'imperial' || unitParam === 'metric') { currentUnit = unitParam; localStorage.setItem('unit', currentUnit); }
      if (langParam) { currentLang = langParam; localStorage.setItem('lang', currentLang); }

      // Settings
      unitToggle.checked = currentUnit === "imperial";
      reduceMotionToggle.checked = reduceMotion;
      langSelect.value = currentLang;
      prefTempMin.value = userPrefs.tempMin;
      prefTempMax.value = userPrefs.tempMax;
      prefMaxWind.value = userPrefs.maxWind;
      notifyRainToggle.checked = !!notificationsPrefs.rain;
      notifyUvToggle.checked = !!notificationsPrefs.uv;

      renderSavedCities();
      const toFetch = qParam || lastSearchedCity;
      fetchWeatherData(toFetch);
      setupAutoRefresh();
      updateShareLinkState();
  }

  searchBtn.addEventListener("click", () => fetchWeatherData(cityInput.value.trim()));
  cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") fetchWeatherData(cityInput.value.trim()); });
  cityInput.addEventListener('input', () => {
      const q = cityInput.value.trim();
      if (!q) { autocompleteList.style.display = 'none'; autocompleteList.innerHTML = ''; return; }
      clearTimeout(autocompleteTimer);
      autocompleteTimer = setTimeout(async () => {
          try {
              const res = await fetch(`${BASE_URL}/search.json?key=${API_KEY}&q=${encodeURIComponent(q)}`);
              const json = await res.json();
              renderAutocomplete(json || []);
          } catch {
              autocompleteList.style.display = 'none';
          }
      }, AUTOCOMPLETE_DEBOUNCE_MS);
  });
  function renderAutocomplete(items) {
      if (!items.length) { autocompleteList.style.display = 'none'; autocompleteList.innerHTML = ''; return; }
      autocompleteList.innerHTML = items.slice(0, 6).map(it => `<div class="ac-item" role="option" data-q="${it.lat},${it.lon}">${it.name}, ${it.country}</div>`).join('');
      autocompleteList.style.display = 'block';
  }
  autocompleteList.addEventListener('click', (e) => {
      const item = e.target.closest('.ac-item');
      if (!item) return;
      const q = item.dataset.q;
      cityInput.value = item.textContent;
      autocompleteList.style.display = 'none';
      fetchWeatherData(q);
  });
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
  if (layerOpacity) {
      layerOpacity.addEventListener('input', () => { if (owmOverlayLayer) owmOverlayLayer.setOpacity(parseFloat(layerOpacity.value)); });
  }
  if (mapSearchBtn) {
      mapSearchBtn.addEventListener('click', async () => {
          const q = mapSearchInput.value.trim();
          if (!q) return;
          try {
              const res = await fetch(`${BASE_URL}/search.json?key=${API_KEY}&q=${encodeURIComponent(q)}`);
              const arr = await res.json();
              if (arr && arr.length) {
                  const loc = arr[0];
                  ensureLeafletMap(loc.lat, loc.lon);
                  if (mapMarker) { leafletMap.removeLayer(mapMarker); }
                  mapMarker = L.marker([loc.lat, loc.lon]).addTo(leafletMap);
                  leafletMap.setView([loc.lat, loc.lon], 9);
                  fetchWeatherData(`${loc.lat},${loc.lon}`);
              }
          } catch {}
      });
  }
  if (moreDaysBtn) {
      moreDaysBtn.addEventListener('click', async () => {
          const expand = currentDaysRequested <= 5;
          currentDaysRequested = expand ? 10 : 5;
          moreDaysBtn.textContent = expand ? 'Less days' : 'More days';
          if (currentWeatherData) await fetchWeatherData(`${currentWeatherData.location.lat},${currentWeatherData.location.lon}`, { days: currentDaysRequested });
      });
  }
  if (compareToggleBtn) {
      compareToggleBtn.addEventListener('click', () => {
          const open = comparePanel.style.display !== 'none';
          comparePanel.style.display = open ? 'none' : 'block';
          compareToggleBtn.setAttribute('aria-expanded', String(!open));
      });
  }
  function buildCompareCitiesList() {
      if (!compareCitiesList) return;
      compareCitiesList.innerHTML = savedCities.map(c => `<label class="switch-label"><input type="checkbox" value="${c}"> ${c}</label>`).join('');
  }
  if (applyCompareBtn) {
      applyCompareBtn.addEventListener('click', async () => {
          const checks = compareCitiesList.querySelectorAll('input[type="checkbox"]:checked');
          const cities = Array.from(checks).map(ch => ch.value).slice(0, 3);
          if (!cities.length) { await loadAndRenderHistory(currentWeatherData.location); return; }
          const seriesList = [];
          // include current city first
          seriesList.push({ name: currentWeatherData.location.name, history: await ensureHistoryForLocation(currentWeatherData.location) });
          for (const city of cities) {
              try {
                  const sres = await fetch(`${BASE_URL}/search.json?key=${API_KEY}&q=${encodeURIComponent(city)}`);
                  const sarr = await sres.json();
                  if (Array.isArray(sarr) && sarr[0]) {
                      const loc = { lat: sarr[0].lat, lon: sarr[0].lon, name: sarr[0].name };
                      const hist = await ensureHistoryForLocation(loc);
                      seriesList.push({ name: loc.name, history: hist });
                  }
              } catch {}
          }
          renderHistoryChartMulti(seriesList);
      });
  }
  async function ensureHistoryForLocation(location) {
      const key = (location.name || `${location.lat},${location.lon}`).toLowerCase();
      let history = historyCache.get(key);
      if (!history) {
          history = await fetchLast7DaysHistory(location.lat, location.lon);
          historyCache.set(key, history);
      }
      return history;
  }
  if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
          if (!historyChart) return;
          // For simplicity, export current primary city history
          const key = (currentWeatherData.location.name || `${lastLat},${lastLon}`).toLowerCase();
          const history = historyCache.get(key);
          if (!history) return;
          const rows = [ ['Date','AvgTempC','AvgTempF','AvgHumidity','TotalPrecipMM','AvgPressureMB'] ];
          for (let i = history.length - 1; i >= 0; i -= 1) {
              const day = history[i].forecast.forecastday[0];
              const d = day.date;
              const avgTempC = day.day.avgtemp_c;
              const avgTempF = day.day.avgtemp_f;
              const avgHumidity = day.day.avghumidity;
              const totalPrecipMM = day.day.totalprecip_mm;
              const hours = day.hour || [];
              const avgPressure = hours.length ? Math.round((hours.reduce((a,h)=>a+(h.pressure_mb||0),0)/hours.length)*10)/10 : '';
              rows.push([d, avgTempC, avgTempF, avgHumidity, totalPrecipMM, avgPressure]);
          }
          const csv = rows.map(r => r.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'weather-history.csv'; a.click();
          URL.revokeObjectURL(url);
      });
  }
  if (shareImageBtn) {
      shareImageBtn.addEventListener('click', async () => {
          const target = document.querySelector('#current');
          if (!target) return;
          const canvas = await html2canvas(target, { backgroundColor: null });
          canvas.toBlob((blob) => {
              if (!blob) return;
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'weather-share.png'; a.click();
              URL.revokeObjectURL(url);
          });
      });
  }
  if (shareLinkBtn) {
      shareLinkBtn.addEventListener('click', () => {
          const url = buildShareUrl();
          navigator.clipboard.writeText(url).catch(()=>{});
          shareLinkBtn.textContent = 'Copied!';
          setTimeout(() => { shareLinkBtn.innerHTML = '<i class="fas fa-link"></i>'; }, 1200);
      });
  }
  function buildShareUrl() {
      const params = new URLSearchParams();
      const q = currentWeatherData ? currentWeatherData.location.name : lastSearchedCity;
      params.set('q', q);
      params.set('unit', currentUnit);
      params.set('lang', currentLang);
      return `${location.origin}${location.pathname}?${params.toString()}`;
  }
  function updateShareLinkState() {
      const url = buildShareUrl();
      history.replaceState(null, '', url);
  }

  // Settings modal
  if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => { settingsModal.style.display = 'block'; });
      closeSettingsBtn.addEventListener('click', () => { settingsModal.style.display = 'none'; });
      saveSettingsBtn.addEventListener('click', async () => {
          reduceMotion = !!reduceMotionToggle.checked; localStorage.setItem('reduceMotion', JSON.stringify(reduceMotion));
          currentLang = langSelect.value || 'en'; localStorage.setItem('lang', currentLang);
          userPrefs = { tempMin: Number(prefTempMin.value), tempMax: Number(prefTempMax.value), maxWind: Number(prefMaxWind.value) };
          localStorage.setItem('activityPrefs', JSON.stringify(userPrefs));
          notificationsPrefs = { rain: !!notifyRainToggle.checked, uv: !!notifyUvToggle.checked };
          localStorage.setItem('notifyPrefs', JSON.stringify(notificationsPrefs));
          if ((notificationsPrefs.rain || notificationsPrefs.uv) && 'Notification' in window && Notification.permission === 'default') {
              try { await Notification.requestPermission(); } catch {}
          }
          settingsModal.style.display = 'none';
          if (currentWeatherData) await fetchWeatherData(`${currentWeatherData.location.lat},${currentWeatherData.location.lon}`);
      });
  }

  // Auto refresh management
  function setupAutoRefresh() {
      if (autoRefreshTimer) clearInterval(autoRefreshTimer);
      autoRefreshTimer = setInterval(() => {
          if (document.hidden) return;
          if (currentWeatherData) fetchWeatherData(`${currentWeatherData.location.lat},${currentWeatherData.location.lon}`);
      }, AUTO_REFRESH_MS);
  }

  // Notifications on thresholds
  function maybeNotify(data) {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      const nowEpoch = Math.floor(Date.now() / 1000);
      const next2 = data.forecast.forecastday[0].hour.filter(h => h.time_epoch > nowEpoch).slice(0, 2);
      if (notificationsPrefs.rain) {
          const rainSoon = next2.some(h => (h.will_it_rain || 0) === 1 || (h.chance_of_rain || 0) >= 60);
          if (rainSoon) new Notification('Rain expected soon', { body: `Rain likely in ${data.location.name} within ~2 hours.` });
      }
      if (notificationsPrefs.uv && data.current.uv >= 7) {
          new Notification('High UV index', { body: `UV is high (${data.current.uv}) in ${data.location.name}.` });
      }
  }

  // Initialize the application
  initializeApp();

});