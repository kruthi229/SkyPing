// Supabase config
const SUPABASE_URL = "https://rxlvmsoylvatmkbhwhru.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bHZtc295bHZhdG1rYmh3aHJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0ODA5MjIsImV4cCI6MjA2NjA1NjkyMn0.KJ5CICYyl7RbqaDaso13kf5vncLmV1yyuUy8zcYJmaY";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("location-form");
const output = document.getElementById("output");

// AUTH LOGIC
const authMessage = document.getElementById("auth-message");

document.getElementById("sign-up-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabaseClient.auth.signUp({ email, password });

  authMessage.textContent = error ? `❌ ${error.message}` : "✅ Sign-up email sent. Check your inbox!";
});

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  authMessage.textContent = error ? `❌ ${error.message}` : "✅ Logged in!";
  if (!error) {
    document.getElementById("logout-btn").style.display = "block";
    loadLocations(); // Load user’s saved data
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) {
    document.getElementById("logout-btn").style.display = "block";
    loadLocations();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  output.textContent = "⏳ Processing...";

  const sessionData = await supabaseClient.auth.getSession();
  const user = sessionData.data.session?.user;

  if (!user) {
    output.textContent = "❌ You must be logged in.";
    return;
  }

  const location_name = document.getElementById("location_name").value;
  const useCurrentLocation = document.getElementById("use-current-location").checked;

  let lat, lon;

  if (useCurrentLocation) {
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      lat = position.coords.latitude;
      lon = position.coords.longitude;
    } catch (error) {
      output.textContent = "❌ Failed to get current location.";
      return;
    }
  } else {
    const address = document.getElementById("address").value;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await response.json();
      if (data.length === 0) {
        output.textContent = "❌ Could not find that address.";
        return;
      }
      lat = parseFloat(data[0].lat);
      lon = parseFloat(data[0].lon);
    } catch (error) {
      output.textContent = "❌ Error looking up address.";
      return;
    }
  }

  const { error } = await supabaseClient.from("locations").insert([
    { location_name, lat, lon, user_id: user.id }
  ]);

  if (error) {
    output.textContent = "❌ Failed to save location.";
  } else {
    output.textContent = "✅ Location saved successfully!";
    form.reset();
    loadLocations();
  }
});

async function loadLocations() {
  const sessionData = await supabaseClient.auth.getSession();
  const user = sessionData.data.session?.user;
  const list = document.getElementById("location-list");
  list.innerHTML = "";

  if (!user) {
    list.innerHTML = "<li>❌ You must be logged in to see saved locations.</li>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("locations")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("❌ Failed to fetch locations:", error.message);
    return;
  }

  if (data.length === 0) {
    list.innerHTML = "<li>No saved locations yet.</li>";
    return;
  }

  data.forEach(async (loc) => {
    const li = document.createElement("li");
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=precipitation_probability_max,temperature_2m_max,uv_index_max,windspeed_10m_max&timezone=auto`;

    try {
      const response = await fetch(apiUrl);
      const weather = await response.json();
      const today = weather.daily;

      const rain = today.precipitation_probability_max[0];
      const temp = today.temperature_2m_max[0];
      const uv = today.uv_index_max[0];
      const wind = today.windspeed_10m_max[0];

      const alerts = [];
      if (rain >= 40) alerts.push("🌧️ Carry an umbrella!");
      if (uv >= 6) alerts.push("☀️ High UV — sunscreen advised!");
      if (wind >= 30) alerts.push("💨 Strong wind expected.");

      li.innerHTML = `
        <strong>${loc.location_name}</strong><br>
        🌡️ Temp: ${temp}°C<br>
        ☔ Rain: ${rain}%<br>
        🌞 UV: ${uv}<br>
        🌬️ Wind: ${wind} km/h<br>
        <em>${alerts.length ? alerts.join("<br>") : "✅ Weather looks good!"}</em><br>
        <button onclick="deleteLocation('${loc.id}')" style="margin-top: 8px;">❌ Delete</button>
      `;
    } catch (err) {
      li.innerHTML = `<strong>${loc.location_name}</strong><br>⚠️ Couldn't fetch weather.`;
    }

    list.appendChild(li);
  });
}

//delete a location
async function deleteLocation(id) {
  const { error } = await supabaseClient.from("locations").delete().eq("id", id);
  if (error) {
    console.error("❌ Failed to delete location:", error.message);
    return;
  }
  loadLocations();
}
window.deleteLocation = deleteLocation;

document.addEventListener("DOMContentLoaded", () => {
  loadLocations();
});

// Quick Weather Check
const quickForm = document.getElementById("quick-check-form");
const quickOutput = document.getElementById("quick-output");

quickForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const place = document.getElementById("quick-place").value;
  quickOutput.textContent = "🔄 Fetching weather...";

  const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`);
  const geoData = await geoRes.json();

  if (!geoData || geoData.length === 0) {
    quickOutput.textContent = "❌ Could not find that location.";
    return;
  }

  const lat = geoData[0].lat;
  const lon = geoData[0].lon;

  const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m,uv_index&timezone=auto`);
  const weatherData = await weatherRes.json();

  if (!weatherData || !weatherData.current) {
    quickOutput.textContent = "❌ Couldn't get weather data.";
    return;
  }

  const w = weatherData.current;

  quickOutput.innerHTML = `
    <strong>🌍 ${place}</strong><br>
    🌡️ Temp: ${w.temperature_2m}°C<br>
    ☔ Precipitation: ${w.precipitation} mm<br>
    🌬️ Wind: ${w.wind_speed_10m} km/h<br>
    🌞 UV Index: ${w.uv_index}<br>
  `;
});

// Daily Rain Alert
async function checkRainForecast() {
  const sessionData = await supabaseClient.auth.getSession();
  const user = sessionData.data.session?.user;
  const alertOutput = document.getElementById("alert-output");

  if (!user) return;

  const { data: locations, error } = await supabaseClient
    .from("locations")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    alertOutput.textContent = "❌ Could not fetch saved locations.";
    return;
  }

  const alerts = [];

  for (const loc of locations) {
    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=precipitation_probability_max&timezone=auto`
    );
    const forecastData = await forecastRes.json();
    const rainProb = forecastData.daily.precipitation_probability_max[0];

    if (rainProb >= 50) {
      alerts.push(`☔ ${loc.location_name}: ${rainProb}% chance of rain.`);
    }
  }

  if (alerts.length > 0) {
    const message = alerts.join("\n");
    if (Notification.permission === "granted") {
      new Notification("SkyPing Rain Alert ☁️", { body: message });
    } else {
      alertOutput.textContent = message;
    }
  } else {
    alertOutput.textContent = "✅ No rain expected in saved locations today!";
  }
}


//rain alert first time in a day open
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("rain-alert").addEventListener("click", () => {
    checkRainForecast();
  });

  const lastAlertTime = localStorage.getItem("lastRainAlert");
  const now = Date.now();

  if (!lastAlertTime || now - lastAlertTime > 24 * 60 * 60 * 1000) {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        checkRainForecast();
        localStorage.setItem("lastRainAlert", now);
      }
    });
  }
});
