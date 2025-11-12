// https://svgconverter.com/pdf-to-svg
// step 1: split the full calendar into 4 qtr
// step 2: save the XLSX to PDF format
// step 3: convert the PDF version to SVG using above url

let serviceWorkerRegistration;
let inactivityTimeout;
let authUser;
const VERSION = "v1.0.5";
const AUTH_TENANT = "https://login.microsoftonline.com/46c98d88-e344-4ed4-8496-4ed7712e255d";
const CLIENT_ID = "47d059bf-dd89-43bd-862f-db8766ee7f8f";
const INACTIVITY_PERIOD = 1000000; // 24 hours
const DEFAULT_SW_PATH = "./sw.js";
const DEFAULT_SW_SCOPE = "./";
const ENDPOINT = "https://fcmregistrations.googleapis.com/v1";
const DEFAULT_VAPID_KEY = "BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4";
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


//===========================
// MS Graph API Configuration
//===========================
// Config object to be passed to Msal on creation
const hostname = window.location.hostname;
const redirectUri = hostname === "localhost" 
    ? `http://${hostname}:5501/web-app/index.html` 
    : `https://${hostname}/web-app/index.html`;

const msalConfig = {
    auth: {
        clientId: CLIENT_ID,
        authority: AUTH_TENANT,
        redirectUri: redirectUri
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: true, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        allowNativeBroker: false, // Disables WAM Broker
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case msal.LogLevel.Error:
                        console.error(message);
                        return;
                    case msal.LogLevel.Info:
                        // console.info(message);
                        return;
                    case msal.LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case msal.LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            }
        }
    }
};

// Add here scopes for id token to be used at MS Identity Platform endpoints.
const loginRequest = { scopes: ["User.Read"] };

// Add here the endpoints for MS Graph API services you would like to use.
const graphConfig = { graphMeEndpoint: "https://graph.microsoft.com/v1.0/me" };


//===========================
// MS Graph API authentication
//===========================
/*
 * Browser check variables
 * If you support IE, our recommendation is that you sign-in using Redirect APIs
 * If you as a developer are testing using Edge InPrivate mode, please add "isEdge" to the if check
 */
const ua = window.navigator.userAgent;
const msie = ua.indexOf("MSIE ");
const msie11 = ua.indexOf("Trident/");
const msedge = ua.indexOf("Edge/");
const isIE = msie > 0 || msie11 > 0;
const isEdge = msedge > 0;

let signInType;
let accountId = "";

/*
 * Create the main myMSALObj instance
 * configuration parameters are located at authConfig.js
 */
const myMSALObj = new msal.PublicClientApplication(msalConfig);

// Register Callbacks for Redirect flow
myMSALObj.handleRedirectPromise().then(handleResponse).catch((error) => {
    console.log(error);
}).finally(hideSpinner);

function handleResponse(resp) {
    if (resp !== null) {
        accountId = resp.account.homeAccountId;
        seeProfileRedirect();
    } else {
        // need to call getAccount here?
        const currentAccounts = myMSALObj.getAllAccounts();
        if (!currentAccounts || currentAccounts.length < 1) {
            signIn("loginRedirect");
        } else if (currentAccounts.length > 1) {
            // Add choose account code here
        } else if (currentAccounts.length === 1) {
            accountId = currentAccounts[0].homeAccountId;
            seeProfileRedirect();
        }
    }
}
function showSpinner() {
    document.getElementById("spinner").style.display = "block";
}

function hideSpinner() {
    document.getElementById("spinner").style.display = "none";
}

async function signIn(method) {
    showSpinner();
    signInType = isIE ? "loginRedirect" : method;
    if (signInType === "loginPopup") {
        return myMSALObj.loginPopup(loginRequest).then(handleResponse).catch(function (error) {
            console.log(error);
        }).finally(hideSpinner);
    } else if (signInType === "loginRedirect") {
        return myMSALObj.loginRedirect(loginRequest).finally(hideSpinner);
    }
}

// This function can be removed if you do not need to support IE
async function getTokenRedirect(request, account) {
    showSpinner();
    request.account = account;
    return await myMSALObj.acquireTokenSilent(request).catch(async (error) => {
        console.log("silent token acquisition fails.");
        if (error instanceof msal.InteractionRequiredAuthError) {
            console.log("acquiring token using redirect");
            return myMSALObj.acquireTokenRedirect(request);
        } else {
            console.error(error);
        }
    }).finally(hideSpinner);
}
//===========================
// MS Graph API call
//===========================

// Helper function to call MS Graph API endpoint 
// using authorization bearer token scheme
async function callMSGraph(endpoint, accessToken, method = 'GET', payload = null) {
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);
    if (method === 'POST') {
        headers.append("Content-Type", "application/json");
    }

    const options = {
        method: method,
        headers: headers
    };

    if (method === 'POST' && payload) {
        options.body = JSON.stringify(payload);
    }

    return fetch(endpoint, options)
        .then(response => response.json())
        .then(data => data)
        .catch(error => console.error(error));
}
async function seeProfileRedirect() {
    const currentAcc = myMSALObj.getAccountByHomeId(accountId);

    if (currentAcc) {
        const response = await getTokenRedirect(loginRequest, currentAcc).catch(error => {
            console.log(error);
        });
        if (response) {
            const profileInfo = await callMSGraph(graphConfig.graphMeEndpoint, response.accessToken);
            sessionStorage.setItem("msalUserInfo", JSON.stringify(profileInfo));
            initializeApp();
        }
    }
}
function initializeApp() {
    const versionLink = document.getElementById('version_link');
    if (versionLink) {
        versionLink.innerText = VERSION;
    }
    const msalUserInfo = JSON.parse(sessionStorage.getItem('msalUserInfo'));
    if (msalUserInfo) {
        sessionStorage.setItem('authUser', JSON.stringify(msalUserInfo));

        // Set the displayName to the element with ID 'username-link'
        const usernameLink = document.getElementById('username_link');
        if (usernameLink) {
            usernameLink.innerText = msalUserInfo.displayName;
        }

        // Show the main tab
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.removeAttribute('hidden');
        }

        if (serviceWorkerRegistration) {
            getToken(serviceWorkerRegistration);
        }
    } else {
        console.log('User not authenticated, redirecting...');
        signIn("loginPopup");
    }
}
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
function toggleNotificationContainer() {
    const notificationContainer = document.getElementById("notification-container");
    if (notificationContainer.style.display === "none" || notificationContainer.style.display === "") {
        notificationContainer.style.display = "block";        
        displayStoredNotifications();
    } else {
        notificationContainer.style.display = "none";
    }
}
function storeNotification(notification) {
    let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    notifications.push(notification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateBadgeCount(); // Update the badge count
}
function displayStoredNotifications() {
    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const notificationList = document.getElementById('notification-list');
    notificationList.innerHTML = '';

    notifications.forEach((notification, index) => {
        const listItem = document.createElement('li');
        const title = document.createElement('strong');
        title.textContent = notification.title;
        const body = document.createElement('span');
        body.textContent = `: ${notification.body}`;
        
        listItem.appendChild(title);
        listItem.appendChild(body);
        notificationList.appendChild(listItem);
    });
}
function clearNotifications() {
    localStorage.removeItem('notifications');
    displayStoredNotifications();
    updateBadgeCount(); // Update the badge count
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
function updateBadgeCount() {
    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const count = notifications.length;
    const badge = document.getElementById('notification_badge');

    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }

    if ('setAppBadge' in navigator) {
        navigator.setAppBadge(count).catch((error) => {
            console.error("Error setting app badge: ", error);
        });
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
            serviceWorkerRegistration = registration;

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
    try {
        if ('Notification' in window && Notification.permission === "granted") {
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: payload.notification.icon,
            };
            const notification = new Notification(notificationTitle, notificationOptions);

            // Show the notification message within the app
            showMessage(payload.notification.body);

            // Store the notification in localStorage
            storeNotification(payload.notification);

            // Set the badge count
            updateBadgeCount();

            // Clear the badge count when the notification is clicked
            notification.onclick = () => {
                clearBadgeCount();
                window.focus();
            };
        } else { showMessage("Notifications are not supported or permission is not granted."); }
    } catch (error) { showMessage("Error displaying notification: ", error); }
});
window.addEventListener('load', () => {
    clearBadgeCount();
});
document.addEventListener("DOMContentLoaded", function() {
    displayStoredNotifications();
    updateBadgeCount(); // Update the badge count on page load

    const loadBase64Image = async (imgElementId, txtFilePath) => {
        try {
            const response = await fetch(txtFilePath);
            const base64Data = await response.text();
            const imgElement = document.getElementById(imgElementId);
            imgElement.src = `data:image/svg+xml;base64,${base64Data}`;
        } catch (error) {
            console.error("Error loading base64 image:", error);
        }
    };
    showSpinner();
    Promise.all([
        loadBase64Image("q1-img", "images/ShiftCalendar_2026_Q1.txt"),
        loadBase64Image("q2-img", "images/ShiftCalendar_2026_Q2.txt"),
        loadBase64Image("q3-img", "images/ShiftCalendar_2026_Q3.txt"),
        loadBase64Image("q4-img", "images/ShiftCalendar_2025_Q4.txt")
    ]).then(() => {
        setTimeout(() => {
            // hideSpinner();
        }, 1000);
    }).catch(error => {
        console.error("Error loading images:", error);
        // hideSpinner();
    }); 


    const subscribeLink = document.getElementById("unsubscribe_link");

    // Function to toggle subscription status
    const toggleSubscription = () => {
        if (subscribeLink.textContent === "Unsubscribe Notifications") {
            subscribeLink.textContent = "Subscribe Notifications";
            unsubscribeNotifications();
        } else {
            subscribeLink.textContent = "Unsubscribe Notifications";
            if (serviceWorkerRegistration) {
                getToken(serviceWorkerRegistration);
            }
        }
    };

    // Add event listener to the link
    subscribeLink.addEventListener("click", function(event) {
        event.preventDefault();
        toggleSubscription();
    });
    // Add event listener to the bell icon
    const notificationBell = document.getElementById("notification_bell");
    notificationBell.addEventListener("click", function(event) {
        event.preventDefault();
        toggleNotificationContainer();
    });
    window.addEventListener("click", function(event){
        event.preventDefault();
        const notificationContainer = document.getElementById("notification-container");
        const notificationBell = document.getElementById("notification_bell");
        if (!notificationContainer.contains(event.target) && !notificationBell.contains(event.target)) {
            notificationContainer.style.display = "none";
        }
    })
});