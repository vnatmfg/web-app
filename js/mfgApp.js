// https://svgconverter.com/pdf-to-svg
// step 1: split the full calendar into 4 qtr
// step 2: save the XLSX to PDF format
// step 3: convert the PDF version to SVG using above url

const DEFAULT_SW_PATH = "./firebase-messaging-sw.js";
const DEFAULT_SW_SCOPE = "./";
const ENDPOINT = "https://fcmregistrations.googleapis.com/v1";
const DEFAULT_VAPID_KEY =
    "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";


// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAJvkno-Q4aeH3wkYFxcoJSF8U_2uqpaS8",
    authDomain: "mfgcalendar-ff2ff.firebaseapp.com",
    projectId: "mfgcalendar-ff2ff",
    storageBucket: "mfgcalendar-ff2ff.firebasestorage.app",
    messagingSenderId: "424979372254",
    appId: "1:424979372254:web:247f955d5a027065be4a4f",
    measurementId: "G-TYNJNC3EKQ",
    databaseURL: "https://mfgcalendar-ff2ff-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const database = firebase.database();

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register(DEFAULT_SW_PATH, { scope: DEFAULT_SW_SCOPE })
        .then((registration) => {
            console.log("Registration successful, scope is:", registration.scope);
            getToken(registration);
        })
        .catch((err) => {
            console.log("Service worker registration failed, error:", err);
        });
}
const getToken = (registration) => {
    const messaging = firebase.messaging();
    messaging
        .getToken({
            vapidKey: DEFAULT_VAPID_KEY,
            serviceWorkerRegistration: registration,
        })
        .then((currentToken) => {
            if (currentToken) {
                // Store the token to the database
                firebase.database().ref('fcmTokens/' + currentToken).set({
                    token: currentToken,
                    timestamp: Date.now()
                }).then(() => {
                    console.log("Token stored successfully.");
                }).catch((error) => {
                    console.error("Error storing token: ", error);
                });
            } else {
                console.log("No registration token available. Request permission to generate one.");
            }
        })
        .catch((err) => {
            console.log("An error occurred while retrieving token. ", err);
        });
};
messaging.onMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received foreground message ", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon,
    };

    if (Notification.permission === "granted") {
        new Notification(notificationTitle, notificationOptions);
    }
});
