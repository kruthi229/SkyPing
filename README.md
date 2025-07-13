# SkyPing
A smart weather companion with personalized forecasts, location-based alerts, and user-specific notifications.

SkyPing allows users to:

1. Sign up / log in securely via Supabase authentication

2. Save multiple locations with either address or current GPS coordinates

3. Get daily weather forecasts including temperature, rain probability, UV index, and wind speed

4. Receive smart weather alerts like:
   - Rain alerts (carry an umbrella)
   - High UV alerts (sunscreen recommended)
   - Wind alerts (caution for strong winds)

5. Quick weather check by entering any location

6. Rain alerts via daily notifications

Features:

1.User Authentication: Email/password based login & sign-up via Supabase

2.Location Saving: Save favorite locations for weather tracking

3.Weather API Integration: Uses Open-Meteo & Nominatim APIs for weather and geolocation data

4.Daily Rain Alerts: Alerts users if rain probability is high in saved locations

5.Quick Weather Lookup: Instantly check current weather by place name

6.Responsive UI: Clean, simple, and functional design

Tech Stack:

1.Frontend: HTML, CSS, JavaScript

2.Backend/DB: Supabase (Auth & Database)

APIs:

1.Open-Meteo API (weather data)

2.Nominatim API (geocoding addresses)
