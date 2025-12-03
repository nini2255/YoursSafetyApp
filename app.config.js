import 'dotenv/config';

export default {
  expo: {
    name: "Yours-app",
    slug: "Yours-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rafox2500.Yoursapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // These strings are required by Apple for location access
        NSMicrophoneUsageDescription: "Allow $(PRODUCT_NAME) to access your microphone to record audio journals.",
        NSLocationWhenInUseUsageDescription: "This app needs access to your location to track your journeys and geofences.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app needs background location access to monitor geofences even when the app is closed."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.rafox2500.Yoursapp",
      // 👇 CRITICAL: This permissions section fixes your specific error
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "ACCESS_MEDIA_LOCATION",
        "ACCESS_NOTIFICATION_POLICY",
        "FOREGROUND_SERVICE",           // <--- REQUIRED for background tasks
        "FOREGROUND_SERVICE_LOCATION",  // <--- REQUIRED for Android 14+ specific location tracking
        "RECORD_AUDIO" // <--- Add this line for Android
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    // 👇 Recommended: Explicitly configure the location plugin
    plugins: [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Yours-app to use your location to track journeys and safety zones."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "4454e141-2909-4013-ae2d-51a4623c7a0f"
      }
    }
  }
};