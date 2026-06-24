export const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN",
  databaseURL: "https://maxymessenger-default-rtdb.firebaseio.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

export function hasRequiredFirebaseConfig() {
  const requiredKeys = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
  return requiredKeys.every((key) => {
    const value = firebaseConfig[key];
    return value && !String(value).startsWith("PASTE_");
  });
}
