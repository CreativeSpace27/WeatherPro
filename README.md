<div align="center">
  <img src="https://img.shields.io/badge/WeatherPro-Advanced%20Weather%20App-blue?style=for-the-badge&logo=cloud&logoColor=white" alt="WeatherPro Badge">
  <br>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/API-WeatherAPI.com-green?style=for-the-badge&logo=api&logoColor=white" alt="API">
  <img src="https://img.shields.io/badge/Map-Leaflet-brightgreen?style=for-the-badge&logo=map&logoColor=white" alt="Leaflet">
  <br>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Version-2.0-blue?style=for-the-badge" alt="Version">
</div>

---

<div align="center">
  <h1>🌤️ WeatherPro</h1>
  <p><strong>Your Professional Weather Assistant</strong></p>
  <p>Advanced weather application with real-time data, interactive maps, and beautiful neumorphic UI</p>
  
  <div style="display: flex; justify-content: center; gap: 20px; margin: 30px 0;">
    <a href="#features" style="text-decoration: none;">
      <button style="background: linear-gradient(135deg, #00c6ff, #0072ff); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: bold; transition: transform 0.3s ease;">🚀 Features</button>
    </a>
    <a href="#demo" style="text-decoration: none;">
      <button style="background: linear-gradient(135deg, #f09819, #edde5d); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: bold; transition: transform 0.3s ease;">🎮 Live Demo</button>
    </a>
    <a href="#installation" style="text-decoration: none;">
      <button style="background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; border: none; padding: 12px 24px; border-radius: 25px; cursor: pointer; font-weight: bold; transition: transform 0.3s ease;">⚡ Quick Start</button>
    </a>
  </div>
</div>

---

## ✨ Features Overview

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0;">

### 🌡️ **Real-Time Weather Data**
- **Current Conditions**: Temperature, humidity, wind speed, UV index
- **Air Quality**: Real-time AQI monitoring with detailed breakdown
- **Pressure Trends**: Rising/falling pressure indicators
- **Dew Point**: Calculated comfort metrics
- **Moon Phase**: Lunar information with emoji representation

### 📊 **Advanced Forecasting**
- **Hourly Forecast**: 24-hour detailed predictions with sparkline charts
- **Daily Forecast**: 7-day extended weather outlook
- **Weather History**: 7-day historical data with interactive charts
- **City Comparison**: Multi-city weather comparison feature
- **Export Options**: CSV data export and image sharing

### 🗺️ **Interactive Weather Map**
- **Multiple Layers**: Radar, clouds, temperature overlays
- **Real-time Updates**: Live weather data integration
- **Search Functionality**: Location search on map
- **Opacity Controls**: Adjustable layer transparency
- **Responsive Design**: Works on all device sizes

### 🎨 **Beautiful Neumorphic UI**
- **Glass Morphism**: Modern glass-like interface elements
- **Weather Animations**: Dynamic weather condition animations
- **Theme Adaptation**: Automatic theme changes based on weather
- **Accessibility**: Full ARIA support and keyboard navigation
- **Responsive**: Mobile-first design approach

### 🏃‍♂️ **Lifestyle Features**
- **Activity Ratings**: Weather-based activity recommendations
- **Allergy Alerts**: Pollen and air quality warnings
- **Smart Suggestions**: Personalized weather advice
- **Comfort Metrics**: Temperature and wind comfort indicators

### ⚙️ **Advanced Settings**
- **Unit Conversion**: Celsius/Fahrenheit toggle
- **Language Support**: Multi-language interface
- **Motion Reduction**: Accessibility-friendly animations
- **Notifications**: Rain and UV alerts
- **Preferences**: Customizable comfort thresholds

</div>

---

## 🎮 Live Demo

<div align="center" style="margin: 40px 0;">
  <div style="background: linear-gradient(135deg, #0f2027, #203a43, #2c5364); padding: 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
    <h3 style="color: #00c6ff; margin-bottom: 20px;">🚀 Try WeatherPro Now!</h3>
    <p style="color: #f0f2f5; margin-bottom: 25px;">Experience the power of professional weather forecasting</p>
    <a href="https://your-demo-link.com" target="_blank" style="text-decoration: none;">
      <button style="background: linear-gradient(135deg, #00c6ff, #0072ff); color: white; border: none; padding: 15px 30px; border-radius: 30px; cursor: pointer; font-weight: bold; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(0,198,255,0.3);">
        🌟 Launch WeatherPro
      </button>
    </a>
  </div>
</div>

---

## 🛠️ Installation & Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for API calls
- WeatherAPI.com account (free tier available)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/WeatherPro.git
   cd WeatherPro
   ```

2. **Get API Keys**
   - Sign up at [WeatherAPI.com](https://www.weatherapi.com/) (free tier)
   - Get your API key from the dashboard
   - Update the API key in `script.js`:
   ```javascript
   const API_KEY = "your-api-key-here";
   ```

3. **Open the application**
   ```bash
   # Using Python (if installed)
   python -m http.server 8000
   
   # Using Node.js (if installed)
   npx serve .
   
   # Or simply open index.html in your browser
   ```

4. **Access the app**
   - Open your browser and navigate to `http://localhost:8000`
   - Or double-click `index.html` to open directly

---

## 🎯 Key Features Deep Dive

### 🌪️ **Weather Animations**
Experience dynamic weather animations that respond to current conditions:

<div align="center">

| 🌧️ **Rain Effect** | ❄️ **Snow Effect** | ⚡ **Lightning** |
|:---:|:---:|:---:|
| 🌧️🌧️🌧️🌧️🌧️ | ❄️❄️❄️❄️❄️ | ⚡⚡⚡⚡⚡ |
| 🌧️🌧️🌧️🌧️🌧️ | ❄️❄️❄️❄️❄️ | ⚡⚡⚡⚡⚡ |
| 🌧️🌧️🌧️🌧️🌧️ | ❄️❄️❄️❄️❄️ | ⚡⚡⚡⚡⚡ |

*Animated raindrops, rotating snowflakes, and flashing lightning effects*

</div>

**Animation Features:**
- **🌧️ Rain**: Animated blue raindrops falling with varying speeds and opacity
- **❄️ Snow**: Rotating snowflakes with different sizes and drift patterns  
- **⚡ Lightning**: Pulsing lightning bolts with flash effects and scaling
- **☀️ Sunny**: Glowing sun with pulsing animation and heat waves
- **🌪️ Wind**: Animated wind streaks and cloud movement
- **🌫️ Fog**: Drifting fog layers with opacity changes

### 📈 **Interactive Charts**
Powered by Chart.js for beautiful data visualization:

<div align="center" style="margin: 20px 0;">
  <div style="background: rgba(15, 32, 39, 0.8); padding: 30px; border-radius: 20px; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.2); max-width: 600px; margin: 0 auto;">
    <div style="color: #00c6ff; font-size: 24px; margin-bottom: 20px;">📊 Temperature Trend</div>
    
    <!-- Animated Chart Bars -->
    <div style="display: flex; align-items: end; justify-content: center; gap: 8px; height: 120px; margin-bottom: 20px;">
      <div style="width: 30px; background: linear-gradient(to top, #00c6ff, #0072ff); border-radius: 4px 4px 0 0; animation: chartBar1 2s ease-out infinite;"></div>
      <div style="width: 30px; background: linear-gradient(to top, #f09819, #edde5d); border-radius: 4px 4px 0 0; animation: chartBar2 2s ease-out infinite;"></div>
      <div style="width: 30px; background: linear-gradient(to top, #2ecc71, #27ae60); border-radius: 4px 4px 0 0; animation: chartBar3 2s ease-out infinite;"></div>
      <div style="width: 30px; background: linear-gradient(to top, #e74c3c, #c0392b); border-radius: 4px 4px 0 0; animation: chartBar4 2s ease-out infinite;"></div>
      <div style="width: 30px; background: linear-gradient(to top, #9b59b6, #8e44ad); border-radius: 4px 4px 0 0; animation: chartBar5 2s ease-out infinite;"></div>
      <div style="width: 30px; background: linear-gradient(to top, #00c6ff, #0072ff); border-radius: 4px 4px 0 0; animation: chartBar6 2s ease-out infinite;"></div>
      <div style="width: 30px; background: linear-gradient(to top, #f09819, #edde5d); border-radius: 4px 4px 0 0; animation: chartBar7 2s ease-out infinite;"></div>
    </div>
    
    <!-- Chart Labels -->
    <div style="display: flex; justify-content: space-between; color: #a7b4c2; font-size: 12px;">
      <span>Mon</span>
      <span>Tue</span>
      <span>Wed</span>
      <span>Thu</span>
      <span>Fri</span>
      <span>Sat</span>
      <span>Sun</span>
    </div>
    
    <div style="margin-top: 15px; color: #f0f2f5; font-size: 14px;">
      <span style="color: #00c6ff;">●</span> Temperature | 
      <span style="color: #f09819;">●</span> Precipitation | 
      <span style="color: #2ecc71;">●</span> Wind Speed
    </div>
  </div>
</div>

<style>
@keyframes chartBar1 { 0% { height: 0; } 100% { height: 60px; } }
@keyframes chartBar2 { 0% { height: 0; } 100% { height: 80px; } }
@keyframes chartBar3 { 0% { height: 0; } 100% { height: 45px; } }
@keyframes chartBar4 { 0% { height: 0; } 100% { height: 95px; } }
@keyframes chartBar5 { 0% { height: 0; } 100% { height: 70px; } }
@keyframes chartBar6 { 0% { height: 0; } 100% { height: 55px; } }
@keyframes chartBar7 { 0% { height: 0; } 100% { height: 85px; } }
</style>

- **Temperature Trends**: 7-day historical data
- **Precipitation Patterns**: Hourly rainfall predictions  
- **Wind Speed Analysis**: Gust and average wind speeds
- **Multi-city Comparison**: Side-by-side weather analysis

### 🗺️ **Advanced Mapping**
Integrated Leaflet.js with OpenWeatherMap tiles:

- **Radar Layer**: Real-time precipitation radar
- **Cloud Layer**: Cloud coverage visualization
- **Temperature Layer**: Heat map temperature display
- **Interactive Controls**: Layer switching and opacity adjustment

### 🎨 **Neumorphic Design**
Modern glass morphism with depth and shadows:

<div align="center" style="margin: 20px 0;">
  <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
    <!-- Interactive Neumorphic Card -->
    <div style="background: rgba(15, 32, 39, 0.8); padding: 25px; border-radius: 20px; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1); transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 15px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'">
      <div style="color: #00c6ff; font-size: 28px; margin-bottom: 10px;">🌤️</div>
      <div style="color: #f0f2f5; font-weight: bold; margin-bottom: 5px;">Weather Card</div>
      <div style="color: #a7b4c2; font-size: 14px;">Hover to see effect</div>
    </div>

    <!-- Animated Weather Icon -->
    <div style="background: rgba(15, 32, 39, 0.8); padding: 25px; border-radius: 20px; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1);">
      <div style="color: #f09819; font-size: 32px; margin-bottom: 10px; animation: pulse 2s ease-in-out infinite;">☀️</div>
      <div style="color: #f0f2f5; font-weight: bold; margin-bottom: 5px;">Sunny Day</div>
      <div style="color: #a7b4c2; font-size: 14px;">Pulsing animation</div>
    </div>

    <!-- Glass Effect Demo -->
    <div style="background: rgba(15, 32, 39, 0.8); padding: 25px; border-radius: 20px; backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1); position: relative; overflow: hidden;">
      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent); animation: shimmer 3s ease-in-out infinite;"></div>
      <div style="color: #2ecc71; font-size: 28px; margin-bottom: 10px; position: relative; z-index: 1;">🌱</div>
      <div style="color: #f0f2f5; font-weight: bold; margin-bottom: 5px; position: relative; z-index: 1;">Fresh Air</div>
      <div style="color: #a7b4c2; font-size: 14px; position: relative; z-index: 1;">Shimmer effect</div>
    </div>
  </div>
</div>

<style>
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes shimmer {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}
</style>

---

## 🔧 Configuration

### API Configuration
```javascript
// WeatherAPI.com configuration
const API_KEY = "your-api-key";
const BASE_URL = "https://api.weatherapi.com/v1";

// OpenWeatherMap for map tiles
const OPENWEATHER_MAP_KEY = "your-map-key";
```

### Customization Options
- **Theme Colors**: Modify CSS variables in `style.css`
- **Animation Speed**: Adjust animation durations
- **Default Location**: Set preferred default city
- **Language**: Add new language support
- **Units**: Configure default temperature units

---

## 📱 Responsive Design

WeatherPro is built with a mobile-first approach:

- **Desktop**: Full-featured interface with all controls
- **Tablet**: Optimized layout with touch-friendly controls
- **Mobile**: Streamlined interface with essential features
- **Accessibility**: Full ARIA support and keyboard navigation

---

## 🌍 Internationalization

Currently supports:
- 🇺🇸 English
- 🇪🇸 Español
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇮🇳 हिन्दी

Adding new languages is simple - just extend the language object in the JavaScript code.

---

## 🔒 Privacy & Security

- **No Data Storage**: Weather data is not permanently stored
- **Local Storage**: Only user preferences are saved locally
- **HTTPS Only**: Secure API communications
- **No Tracking**: No analytics or tracking scripts

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Test on multiple browsers
- Ensure accessibility compliance
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **WeatherAPI.com** for reliable weather data
- **OpenWeatherMap** for map tiles
- **Leaflet.js** for interactive mapping
- **Chart.js** for data visualization
- **Font Awesome** for beautiful icons
- **SunCalc** for astronomical calculations

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/WeatherPro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/WeatherPro/discussions)
- **Email**: support@weatherpro.app

---

<div align="center" style="margin: 40px 0;">
  <p style="color: #a7b4c2; font-size: 14px;">
    Made with ❤️ by the WeatherPro Team
  </p>
  <div style="display: flex; justify-content: center; gap: 15px; margin-top: 20px;">
    <a href="#" style="color: #00c6ff; text-decoration: none;">🌐 Website</a>
    <a href="#" style="color: #00c6ff; text-decoration: none;">📧 Contact</a>
    <a href="#" style="color: #00c6ff; text-decoration: none;">🐛 Report Bug</a>
    <a href="#" style="color: #00c6ff; text-decoration: none;">💡 Request Feature</a>
  </div>
</div>

---

<div align="center">
  <img src="https://img.shields.io/github/stars/yourusername/WeatherPro?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/yourusername/WeatherPro?style=social" alt="Forks">
  <img src="https://img.shields.io/github/issues/yourusername/WeatherPro" alt="Issues">
  <img src="https://img.shields.io/github/license/yourusername/WeatherPro" alt="License">
</div>
