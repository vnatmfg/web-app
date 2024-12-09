// https://svgconverter.com/pdf-to-svg
// step 1: split the full calendar into 4 qtr
// step 2: save the XLSX to PDF format
// step 3: convert the PDF version to SVG using above url

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
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  
  messaging.getToken({ vapidKey: 'BGm3UwhwxQVG3yewULYAE2xmBYAPE3ERzaYvqCGLE98PINBtyMB9hevJ7BqAD6d57tMVmATpXqq1pkdoPDxec1A' }).then((currentToken) => {
    if (currentToken) {
        console.log(currentToken);
    } else {
      // Show permission request UI
      console.log('No registration token available. Request permission to generate one.');
    }
  }).catch((err) => {
    console.log('An error occurred while retrieving token. ', err);
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