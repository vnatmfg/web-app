// https://svgconverter.com/pdf-to-svg
// step 1: split the full calendar into 4 qtr
// step 2: save the XLSX to PDF format
// step 3: convert the PDF version to SVG using above url

let inactivityTimeout;
const INACTIVITY_PERIOD = 86400000; // 24 hours
const DEFAULT_SW_PATH = "./sw.js";
const DEFAULT_SW_SCOPE = "./";
const ENDPOINT = "https://fcmregistrations.googleapis.com/v1";
const DEFAULT_VAPID_KEY =
    "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";
const firebaseConfig = {
    apiKey: "AIzaSyAJvkno-Q4aeH3wkYFxcoJSF8U_2uqpaS8",
    authDomain: "mfgcalendar-ff2ff.firebaseapp.com",
    projectId: "mfgcalendar-ff2ff",
    storageBucket: "mfgcalendar-ff2ff.firebasestorage.app",
    messagingSenderId: "424979372254",
    appId: "1:424979372254:web:247f955d5a027065be4a4f",
    measurementId: "G-TYNJNC3EKQ",
    databaseURL:
        "https://mfgcalendar-ff2ff-default-rtdb.asia-southeast1.firebasedatabase.app",
};
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const database = firebase.database();

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
                firebase
                    .database()
                    .ref("fcmTokens/" + currentToken)
                    .set({
                        token: currentToken,
                        timestamp: Date.now(),
                    })
                    .then(() => {
                        console.log("Token stored successfully.");
                    })
                    .catch((error) => {
                        console.error("Error storing token: ", error);
                    });
            } else {
                console.log(
                    "No registration token available. Request permission to generate one."
                );
            }
        })
        .catch((err) => {
            console.log(err);
        });
};
const unsubscribeToken = (registration) => {
    const messaging = firebase.messaging();
    messaging
        .getToken({
            vapidKey: DEFAULT_VAPID_KEY,
            serviceWorkerRegistration: registration,
        })
        .then((currentToken) => {
            if (currentToken) {
                messaging
                    .deleteToken(currentToken)
                    .then(() => {
                        console.log("Token deleted successfully.");
                        // Optionally, remove the token from your database
                        firebase
                            .database()
                            .ref("fcmTokens/" + currentToken)
                            .remove()
                            .then(() => {
                                console.log("Token removed from database successfully.");
                            })
                            .catch((error) => {
                                console.error("Error removing token from database: ", error);
                            });
                    })
                    .catch((error) => {
                        console.error("Error deleting token: ", error);
                    });
            } else {
                console.log("No registration token available to delete.");
            }
        })
        .catch((err) => {
            console.log("An error occurred while retrieving token. ", err);
        });
};
const unregisterServiceWorker = () => {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
                registration
                    .unregister()
                    .then((boolean) => {
                        console.log("Service worker unregistered: ", boolean);
                    })
                    .catch((error) => {
                        console.error("Error unregistering service worker: ", error);
                    });
            }
        });
    }
};
const handleUserExit = (registration) => {
    unsubscribeToken(registration);
    unregisterServiceWorker();
};
const resetInactivityTimer = (registration) => {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        handleUserExit(registration);
    }, INACTIVITY_PERIOD);
};
if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register(DEFAULT_SW_PATH, { scope: DEFAULT_SW_SCOPE })
        .then((registration) => {
            console.log("Registration successful, scope is:", registration.scope);
            getToken(registration);
            resetInactivityTimer(registration); // Set up inactivity timer

            // Reset inactivity timer on user interaction
            ["click", "mousemove", "keypress", "scroll"].forEach((event) => {
                window.addEventListener(event, () =>
                    resetInactivityTimer(registration)
                );
            });
            // Request notification permission
            requestNotificationPermission();
        })
        .catch((err) => {
            console.log(err);
        });
}
messaging.onMessage((payload) => {
    console.log(
        "[firebase-messaging-sw.js] Received foreground message ",
        payload
    );
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon,
    };

    if (Notification.permission === "granted") {
        new Notification(notificationTitle, notificationOptions);
    }
});
function showMessage(message) {
    const messageContainer = document.createElement('div');
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '50%';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translate(-50%, -50%)';
    messageContainer.style.padding = '20px 20px';
    messageContainer.style.backgroundColor = 'rgb(225 225 225 / 75%)';
    messageContainer.style.color = '#007bff';
    messageContainer.style.zIndex = '1000';
    messageContainer.style.borderRadius = '8px';
    messageContainer.style.boxShadow = 'rgb(0 0 0 / 50%) 0px 2px 10px';
    messageContainer.style.textAlign = 'center';
    messageContainer.style.fontSize = '16px';
    messageContainer.style.backdropFilter = 'blur(10px)';
    messageContainer.innerText = message;
    document.body.appendChild(messageContainer);

    setTimeout(() => {
        document.body.removeChild(messageContainer);
    }, 5000); // Remove the message after 5 seconds
}
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                showMessage('Notification permission granted.');
            } else {
                showMessage('Notification permission denied.\nPlease grant notification permissions.');
            }
        }).catch((error) => {
            showMessage('An error occurred while requesting notification permission.');
            console.error('Notification permission error:', error);
        });
    } else {
        showMessage('This browser does not support notifications.');
    }
}