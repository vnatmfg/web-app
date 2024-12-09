// https://svgconverter.com/pdf-to-svg
// step 1: split the full calendar into 4 qtr
// step 2: save the XLSX to PDF format
// step 3: convert the PDF version to SVG using above url
// function urlBase64ToUint8Array(base64String) {
//   // Add padding if necessary
//   var padding = '='.repeat((4 - base64String.length % 4) % 4);
//   var base64 = (base64String + padding)
//     .replace(/-/g, '+')
//     .replace(/_/g, '/');

//   // Check if the base64 string is valid
//   if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
//     throw new Error('Invalid base64 string');
//   }

//   var rawData = window.atob(base64);
//   var outputArray = new Uint8Array(rawData.length);

//   for (var i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }

// navigator.serviceWorker.ready.then(registration => {
//   if ('PushManager' in window) {
//     registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array('BN6Xd0RKMHxgeP_NLcbJAqx4VltavKk_Fea4j5LnvajiSSPavOPk0D83Re9RlqopMezh1p_OTuA7k_vJxMOil6I')
//     }).then(subscription => {
//       console.log('User is subscribed:', subscription);
//       // Send subscription to your server
//       fetch('/subscribe', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(subscription)
//       });
//     }).catch(err => {
//       console.log('Failed to subscribe the user: ', err);
//     });
//   }
// });


// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAJvkno-Q4aeH3wkYFxcoJSF8U_2uqpaS8",
    authDomain: "mfgcalendar-ff2ff.firebaseapp.com",
    projectId: "mfgcalendar-ff2ff",
    storageBucket: "mfgcalendar-ff2ff.firebasestorage.app",
    messagingSenderId: "424979372254",
    appId: "1:424979372254:web:247f955d5a027065be4a4f",
    measurementId: "G-TYNJNC3EKQ"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
messaging.requestPermission()
    .then(() => {
        console.log('Notification permission granted.');
        return messaging.getToken();
    })
    .then((token) => {
        console.log('FCM Token:', token);
        // Send the token to your server to save it
    })
    .catch((err) => {
        console.log('Unable to get permission to notify.', err);
    });
messaging.onMessage((payload) => {
    console.log('Message received. ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon
    };

    if (Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
    }
});
