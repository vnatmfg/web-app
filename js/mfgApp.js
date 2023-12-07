if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker
        .register("/serviceWorker.js")
        .then(res => console.log("service worker registered"))
        .catch(err => console.log("service worker not registered", err))
    })
  }


  // https://svgconverter.com/pdf-to-svg
  // step 1: split the full calendar into 4 qtr
  // step 2: save the XLSX to PDF format
  // step 3: convert the PDF version to SVG using above url