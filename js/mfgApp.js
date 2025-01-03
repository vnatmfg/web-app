// https://svgconverter.com/pdf-to-svg
// step 1: split the full calendar into 4 qtr
// step 2: save the XLSX to PDF format
// step 3: convert the PDF version to SVG using above url
let serviceWorkerRegistration;
let inactivityTimeout;
const INACTIVITY_PERIOD = 1000000; // 24 hours
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
    databaseURL: "https://mfgcalendar-ff2ff-default-rtdb.asia-southeast1.firebasedatabase.app",
};
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
const database = firebase.database();
const auth = firebase.auth();

// Initialize the Microsoft provider
const provider = new firebase.auth.OAuthProvider('microsoft.com');

// Set custom parameters if needed
provider.setCustomParameters({
  prompt: 'consent',
  login_hint: 'user@firstadd.onmicrosoft.com',
  tenant: '46c98d88-e344-4ed4-8496-4ed7712e255d' // Replace with your tenant ID
});


const getToken = (registration) => {
    messaging
        .getToken({
            vapidKey: DEFAULT_VAPID_KEY,
            serviceWorkerRegistration: registration,
        })
        .then((currentToken) => {
            if (currentToken) {
                // Check if the token already exists in the database
                database.ref("fcmTokens/" + currentToken).once('value')
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            console.log("Token already exists in the database.");
                        } else {
                            // Store the token to the database
                            database.ref("fcmTokens/" + currentToken)
                                .set({ token: currentToken, timestamp: Date.now(), })
                                .then(() => { console.log("Token stored successfully."); })
                                .catch((error) => { console.error("Error storing token: ", error); });
                        }
                    })
                    .catch((error) => { console.error("Error checking token existence: ", error); });
            } else {
                showMessage('No registration token available. Please grant notification permissions.', true);
            }
        })
        .catch((err) => {
            showMessage("An error occurred while retrieving token: " + err, true);
        });
};
const unsubscribeNotifications = function () {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            const messaging = firebase.messaging();
            messaging.getToken({
                vapidKey: DEFAULT_VAPID_KEY,
                serviceWorkerRegistration: registration,
            }).then((currentToken) => {
                if (currentToken) {
                    messaging.deleteToken(currentToken).then(() => {
                        console.log("Token deleted successfully.");
                        // Optionally, remove the token from your database
                        firebase.database().ref("fcmTokens/" + currentToken).remove().then(() => {
                            console.log("Token removed from database successfully.");
                            alert("You have been unsubscribed from notifications.");
                        }).catch((error) => {
                            console.error("Error removing token from database: ", error);
                        });
                    }).catch((error) => {
                        console.error("Error deleting token: ", error);
                    });
                } else {
                    console.log("No registration token available to delete.");
                }
            }).catch((err) => {
                console.log("An error occurred while retrieving token: ", err);
            });
        });
    } else {
        console.log("Service workers are not supported in this browser.");
    }
}
const unregisterServiceWorker = () => {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
                registration.unregister()
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
function showMessage(message, showAllowButton = false) {
    const messageContainer = document.createElement('div');
    messageContainer.style.position = 'fixed';
    messageContainer.style.top = '50%';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translate(-50%, -50%)';
    messageContainer.style.padding = '10px 20px';
    messageContainer.style.backgroundColor = 'rgb(225 225 225 / 80%)';
    messageContainer.style.color = '#007bff';
    messageContainer.style.zIndex = '1000';
    messageContainer.style.borderRadius = '8px';
    messageContainer.style.boxShadow = 'rgb(0 0 0 / 50%) 0px 2px 10px';
    messageContainer.style.textAlign = 'center';
    messageContainer.style.fontSize = '16px';
    messageContainer.style.backdropFilter = 'blur(10px)';
    messageContainer.innerText = message;

    if (showAllowButton) {
        const allowButton = document.createElement('button');
        allowButton.innerText = 'Allow';
        allowButton.style.marginTop = '10px';
        allowButton.style.padding = '5px 10px';
        allowButton.style.backgroundColor = '#007bff';
        allowButton.style.color = '#fff';
        allowButton.style.border = 'none';
        allowButton.style.borderRadius = '5px';
        allowButton.style.cursor = 'pointer';
        allowButton.addEventListener('click', () => {
            requestNotificationPermission();
            document.body.removeChild(messageContainer);
        });
        messageContainer.appendChild(allowButton);
    }

    document.body.appendChild(messageContainer);

    setTimeout(() => {
        if (document.body.contains(messageContainer)) {
            document.body.removeChild(messageContainer);
        }
    }, 5000); // Remove the message after 5 seconds
}
function requestNotificationPermission() {
    if ('Notification' in window) {
        const requestPermission = async () => {
            Notification.requestPermission().then(permission => {
                console.log(`Notifications are ${permission === 'granted' ? 'enabled' : 'not enabled. Asking for permission again on next load.'}`);
            });
        };
        if (Notification.permission === 'granted') {
            console.log('Notifications are enabled.');
        } else {
            requestPermission();
            window.addEventListener('load', requestPermission);
        }
    } else {
        showMessage('This browser does not support notifications.');
    }
}
function clearBadgeCount() {
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch((error) => {
            console.error("Error clearing app badge: ", error);
        });
    }
}
if (('serviceWorker' in navigator) &&
    ('PushManager' in window) &&
    ('Notification' in window)) {
    navigator.serviceWorker
        .register(DEFAULT_SW_PATH, { scope: DEFAULT_SW_SCOPE })
        .then((registration) => {
            console.log("Registration successful, scope is:", registration.scope);
            getToken(registration);

            // Add event listeners for beforeunload and unload events
            window.addEventListener('beforeunload', () => {
                unsubscribeNotifications();
            });
            window.addEventListener('unload', () => {
                unsubscribeNotifications();
            });
        })
        .catch((err) => {
            console.error("Service worker registration failed: ", err);
        });
}
messaging.onMessage((payload) => {
    // console.log("[firebase-messaging-sw.js] Received foreground message ", payload);
    try {
        if ('Notification' in window && Notification.permission === "granted") {
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: payload.notification.icon,
            };
            const notification = new Notification(notificationTitle, notificationOptions);

            // Set the badge count
            if ('setAppBadge' in navigator) {
                navigator.setAppBadge(1).catch((error) => {
                    console.error("Error setting app badge: ", error);
                });
            }

            // Clear the badge count when the notification is clicked
            notification.onclick = () => {
                clearBadgeCount();
                // Optionally, focus the window or navigate to a specific page
                window.focus();
            };
        } else { showMessage("Notifications are not supported or permission is not granted."); }
    } catch (error) { showMessage("Error displaying notification: ", error); }
});

window.addEventListener('load', () => {
    clearBadgeCount();
});

document.getElementById('unsubscribe-link').addEventListener('click', (event) => {
    event.preventDefault();
    unsubscribeNotifications();
});

// Function to handle sign-in with redirect
firebase.auth().signInWithRedirect(provider);
firebase.auth().getRedirectResult()
    .then((result) => {
      var credential = result.credential;
      var accessToken = credential.accessToken;
      var idToken = credential.idToken;
      console.log('Access Token:', accessToken);
      console.log('ID Token:', idToken);
    })
    .catch((error) => {
      console.error('Error during redirect sign-in:', error);
    });