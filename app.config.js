import 'dotenv/config';

export default {
  "expo": {
    "name": "KanjiReaderTest",
    "slug": "KanjiReaderTest",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "edgeToEdgeEnabled": true,
      "package": "com.bizio.KanjiReaderTest"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "googleCloudVisionApiKey": process.env.GOOGLE_CLOUD_VISION_API_KEY,
      "eas": {
        "projectId": "a5e36663-3d04-45f7-8a63-ec9faf49179c"
      }
    },
    "plugins": [
      "expo-sqlite"
    ]
  }
}
