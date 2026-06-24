export const firebaseConfig = {
  apiKey: "AIzaSyBSNf851X7n216Q3ymxcYOAo31TPOJrnuw",
  authDomain: "maxymessenger.firebaseapp.com",
  databaseURL: "https://maxymessenger-default-rtdb.firebaseio.com",
  projectId: "maxymessenger",
  storageBucket: "maxymessenger.appspot.com",
  messagingSenderId: "558836386815",
  appId: "1:558836386815:web:f3f935eebb578bf63375ca"
};

export function hasRequiredFirebaseConfig() {
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "databaseURL",
    "projectId",
    "appId"
  ];

  return requiredKeys.every((key) => {
    const value = firebaseConfig[key];
    return value && !String(value).startsWith("PASTE_");
  });
}
