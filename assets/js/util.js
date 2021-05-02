/**Inicijalna deklaracija vrijednosti koje se korite u stranici*/

/**Setovanje centra mape */
let center = ol.proj.transform([19.26, 42.443], "EPSG:4326", "EPSG:3857");
let zoom = 8;

let view = new ol.View({
  center: center,
  zoom: zoom,
});

/** Prikaz razmjernika na mapi*/
const razmjera = new ol.control.ScaleLine({
  target: document.querySelector("#razmjera"),
  units: "metric",
  bar: true,
  steps: 4,
  text: true,
  minWidth: 100,
});

/** Vraća well known tekst reprezentaciju geometrije za predati feature */
function wktGeometrije(feature) {
  let format = new ol.format.WKT();
  return format.writeGeometry(feature.getGeometry(), {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });
}

/**Kreiranje vektorskih lejera za crtanje i kreiranje nove geometrije ili edit postojeće (point, linestring, polygon, new i edit) */
function kreirajVektorLejerZaCrtanje(olCollection) {
  return new ol.layer.Vector({
    source: new ol.source.Vector({
      features: olCollection,
    }),
    style: vectorStyle,
  });
}
/**Kreiranje vektorskih lejera za tekst na mapi */
function kreirajVektorLejerZaText(olCollection) {
  return new ol.layer.Vector({
    source: new ol.source.Vector({
      features: olCollection,
    }),
    style: vectorTextStyle,
  });
}
/**Definisanje vektor lejera za crtanje figura i kreiranje i izmjenu tekuće geometrije */
let featuresPoint = new ol.Collection(),
  featuresLine = new ol.Collection(),
  featuresPolygon = new ol.Collection(),
  featuresText = new ol.Collection(),
  featuresTekuci = new ol.Collection();
let featurePointOverlay = kreirajVektorLejerZaCrtanje(featuresPoint),
  featureLineOverlay = kreirajVektorLejerZaCrtanje(featuresLine),
  featurePolygonOverlay = kreirajVektorLejerZaCrtanje(featuresPolygon),
  featureTextOverlay = kreirajVektorLejerZaText(featuresText),
  featureTekuciOverlay = kreirajVektorLejerZaCrtanje(featuresTekuci);
featureLineOverlay.getSource().on("addfeature", (evt) => linesArray.push(wktGeometrije(evt.feature)));
featurePointOverlay.getSource().on("addfeature", (evt) => pointsArray.push(wktGeometrije(evt.feature)));
featurePolygonOverlay.getSource().on("addfeature", (evt) => polygonsArray.push(wktGeometrije(evt.feature)));
featureTextOverlay.getSource().on("addfeature", (evt) => mapLabelsArray.push(wktGeometrije(evt.feature)));

/**Metoda koja ažurira stil za vektorske podatke*/
function dodajTekstMapa() {
  let tekst = document.querySelector("#txtTekstMapa").value;
  let boja = document.querySelector("#bojaTekstMapa").value;
  let velicina = document.querySelector("#velicinaTekstMapa").value;
  let font = document.querySelector("#ddlFontTekstMapa").value;
  if (tekst === "" || velicina === "" || isNaN(velicina)) {
    poruka("Upozorenje", "Potrebno je popuniti sva polja sa forme.");
    return false;
  } else {
    vectorColor = boja;
    vectorColorRgb = hexToRgb(boja);
    vectorRadiusSize = velicina;
    vektorFont = font;
    vectorTextValue = tekst;
    selectedMenuItem = textOnMap;
    setujAktivnu("#tekstMapa");
    closeDiv("#tekstMapaDiv");
    azurirajVektorStilove(vectorColor, vectorColorRgb, vectorRadiusSize, vectorFont, vectorTextValue);
  }
}

function crtajTacku() {
  selectedMenuItem = point;
  setujAktivnu("#marker");
}

function crtajLiniju() {
  selectedMenuItem = lineString;
  setujAktivnu("#linija");
}

function crtajPoligon() {
  selectedMenuItem = polygon;
  setujAktivnu("#poligon");
}

/**Funkcija koja prolazi kroz nizove tačaka, linija i polgiona i kreira CQL uslov u zavisnosti od odabranih opcija */
function kreiranjeCqlFilteraProstorno() {
  let retVal = "";
  let pretragaTacka = document.querySelector("#pretragaTacke").checked;
  let pretragaTackaUdaljenost = document.querySelector("#pretragaTackeUdaljenost").value;
  let pretragaLinije = document.querySelector("#pretragaLinije").checked;
  let pretragaPoligonObuhvata = document.querySelector("#pretragaPoligonObuhvata").checked;
  let pretragaPoligonPresijeca = document.querySelector("#pretragaPoligonPresijeca").checked;
  if (pretragaTacka && pretragaTackaUdaljenost === "") {
    poruka(
      "Upozorenje",
      "Potrebno je unijeti udaljenost od iscrtanih tačaka na kojoj će se prikazivati objekti iz sloja koji se pretražuje."
    );
    return false;
  }
  if (pretragaTacka && pointsArray.length === 0) {
    poruka("Upozorenje", "Potrebno je nacrtati bar jednu tačku za pretragu objekata po udaljenosti.");
    return false;
  }
  if (pretragaLinije && linesArray.length === 0) {
    poruka("Upozorenje", "Potrebno je nacrtati bar jednu liiju za pretragu objekata koje linija presijeca.");
    return false;
  }
  if ((pretragaPoligonPresijeca || pretragaPoligonObuhvata) && polygonsArray.length === 0) {
    poruka(
      "Upozorenje",
      "Potrebno je nacrtati bar jedan poligon za pretragu objekata koje poligon presijeca ili obuhvata."
    );
    return false;
  }

  pretragaTacka &&
    pointsArray.forEach((item) => {
      if (retVal === "") {
        retVal = "DWITHIN(geom," + item + "," + pretragaTackaUdaljenost + ",meters) ";
      } else {
        retVal += " OR DWITHIN(geom," + item + "," + pretragaTackaUdaljenost + ",meters) ";
      }
    });

  pretragaLinije &&
    linesArray.forEach((item) => {
      if (retVal === "") {
        retVal = "INTERSECTS(geom," + item + ") ";
      } else {
        retVal += " OR INTERSECTS(geom," + item + ") ";
      }
    });

  (pretragaPoligonObuhvata || pretragaPoligonPresijeca) &&
    polygonsArray.forEach((item) => {
      if (retVal === "") {
        if (pretragaPoligonPresijeca) {
          retVal = "INTERSECTS(geom," + item + ") ";
        } else {
          retVal = "WITHIN(geom," + item + ") ";
        }
      } else {
        if (pretragaPoligonPresijeca) {
          retVal += " OR INTERSECTS(geom," + item + ") ";
        } else {
          retVal += " OR WITHIN(geom," + item + ") ";
        }
      }
    });

  //console.log("cqlFilter", retVal);
  return retVal;
}

/**Prikaz toast poruke. Od naslova zavisi boja, tj klasa koja se dodjeljuje */
function poruka(naslov, tekst) {
  let klasa = naslov.toLowerCase().trim();
  klasa !== "uspjeh" && klasa !== "upozorenje" && klasa !== "greska" && (klasa = "obavjestenje");
  document.querySelector("#toast").innerHTML = tekst;
  document.querySelector("#toast").className = klasa;
  setTimeout(function () {
    document.querySelector("#toast").className = "";
    document.querySelector("#toast").innerHTML = "";
  }, 10000);
}

/** Akcija promjene ikonice u navbaru */
function setujAktivnu(element) {
  if (isDrawn || isModified) {
    poruka("Upozorenje", "Nije moguće promijeniti aktivnost u toku iscrtavanja.");
    return false;
  }
  let els = document.querySelectorAll(".active");
  for (let i = 0; i < els.length; i++) {
    els[i].classList.remove("active");
  }
  document.querySelector(element).classList.add("active");
  closeDiv("#atributiDiv");
  closeDiv("#pretragaDiv");
  closeDiv("#lejeriDiv");
  if (element === "#lejeri") {
    showDiv("#lejeriDiv");
  }
  if (element === "#pretraga") {
    showDiv("#pretragaDiv");
  }
  if (element === "#atributi") {
    showDiv("#atributiDiv");
  }
  if (element === "#izvjestaj") {
    showDiv("#izvjestajDiv");
  }
  podesiInterakciju();
  closeHamburger();
}

/** Closes menu, on mobile devices, after choosing next action. */
function closeHamburger() {
  let x = document.querySelector("#topNav");
  if (x.className === "topnav") {
    x.className += " responsive";
  } else {
    x.className = "topnav";
  }
}

function closeDiv(nazivDiva) {
  document.querySelector(nazivDiva).style.width = "0";
}

function hideDiv(nazivDiva) {
  document.querySelector(nazivDiva).style.display = "none";
}

function showDiv(nazivDiva) {
  if (screen.width < 700) {
    document.querySelector(nazivDiva).style.width = "340px";
  } else {
    document.querySelector(nazivDiva).style.width = "500px";
  }
}

/**Tri funkcije koje rade sa konfirm modalom - za potvrdu akcija/brisanja */
function confirmModal(naslov, text, funkcija) {
  document.querySelector("#modalConfirmHeader").innerHTML = naslov;
  document.querySelector("#modalConfirmText").innerHTML = text;
  document.querySelector("#modalConfirm").style.display = "block";
}

function confirmPotvrdi(funkcija) {
  document.querySelector("#modalConfirm").style.display = "none";
  brisanje();
}

function confirmOdustani() {
  document.querySelector("#modalConfirm").style.display = "none";
}

function openModalSpinner() {
  document.querySelector("#modalSpinner").style.display = "block";
  document.querySelector("#fadeSpinner").style.display = "block";
}

function closeModalSpinner() {
  document.querySelector("#modalSpinner").style.display = "none";
  document.querySelector("#fadeSpinner").style.display = "none";
}

/**Funkcije za download WFS-a */
function shpDownload() {
  zatvoriHamburger();
  wfsDownload("SHAPE-ZIP");
}

function kmlDownload() {
  zatvoriHamburger();
  wfsDownload("KML");
}

function excelDownload() {
  zatvoriHamburger();
  wfsDownload("excel2007");
}

/** Funkcije za rad sa navigacionim barom*/
function pan() {
  selectedMenuItem = "pan";
  setujAktivnu("#pan");
}

function lejeri() {
  selectedMenuItem = "lejeri";
  setujAktivnu("#lejeri");
}

function atributi() {
  selectedMenuItem = "atributi";
  setujAktivnu("#atributi");
}

function pretraga() {
  selectedMenuItem = "pretraga";
  setujAktivnu("#pretraga");
}

function brisanje() {
  vectorIzvjestaj.getSource().clear();
  vectorSelektovaniObjekat.getSource().clear();
  polygonsArray.length = 0;
  linesArray.length = 0;
  pointsArray.length = 0;
  mapLabelsArray.length = 0;
  brisanjeMjerenja();
  featureLineOverlay.getSource().clear();
  featurePointOverlay.getSource().clear();
  featurePolygonOverlay.getSource().clear();
  featureTextOverlay.getSource().clear();
  idSelektovanihOpstina.length = 0;
  idSelektovanihNaselja.length = 0;
  geometrijeSelektovanihOpstina.length = 0;
  geometrijeSelektovanihNaselja.length = 0;
  closeHamburger();
}

function restart() {
  location.reload(true);
}

/**Povezivanje kontrola sa akcijama */
document.querySelector("#pan").addEventListener("click", pan);
document.querySelector("#atributi").addEventListener("click", atributi);
document.querySelector("#lejeri").addEventListener("click", lejeri);
document.querySelector("#marker").addEventListener("click", crtajTacku);
document.querySelector("#linija").addEventListener("click", crtajLiniju);
document.querySelector("#poligon").addEventListener("click", crtajPoligon);
document.querySelector("#pretraga").addEventListener("click", pretraga);
document.querySelector("#restart").addEventListener("click", restart);
document.querySelector("#brisanje").addEventListener("click", brisanje);

document.querySelector("#confirmPotvrdi").addEventListener("click", confirmPotvrdi);
document.querySelector("#confirmOdustani").addEventListener("click", confirmOdustani);

/****PREVOĐENJE NAZIVA LEJERA I POLJA */
function preimenujNazivLejeraZaAtributJavneStrane(nazivLejera) {
  let retVal = nazivLejera;
  switch (nazivLejera) {
    case "antenski_stub_v":
      retVal = "Antenski stub";
      break;
    case "tkk_cijev_v":
      retVal = "TKK cijev";
      break;
    case "tkk_kabl_v":
      retVal = "TKK kabl";
      break;
    case "tkk_nastavak_v":
      retVal = "TKK nastavak";
      break;
    case "tkk_okna_v":
      retVal = "TKK okna";
      break;
    case "tkk_trasa_v":
      retVal = "TKK trasa";
      break;
    case "tkk_zavrsetak_v":
      retVal = "TKK završetak";
      break;
    case "vv_kabl_v":
      retVal = "VV kabl";
      break;
    case "vv_nastavak_v":
      retVal = "VV nastavak";
      break;
    case "vv_stub_v":
      retVal = "VV stub";
      break;
    case "vv_trasa_v":
      retVal = "VV trasa";
      break;
    case "vv_zavrsetak_v":
      retVal = "VV završetak";
      break;
    case "zgrada_v":
      retVal = "Zgrada";
      break;
    default:
  }
  return retVal;
}

function preimenujNazivLejeraZaSlikeJavneStrane(nazivLejera) {
  let retVal = nazivLejera;
  switch (nazivLejera) {
    case "antenski_stub_v":
      retVal = "AntenskiStub";
      break;
    case "tkk_cijev_v":
      retVal = "TkkCijev";
      break;
    case "tkk_kabl_v":
      retVal = "TkkKabl";
      break;
    case "tkk_nastavak_v":
      retVal = "TkkNastavak";
      break;
    case "tkk_okna_v":
      retVal = "TkkOkna";
      break;
    case "tkk_trasa_v":
      retVal = "TkkTrasa";
      break;
    case "tkk_zavrsetak_v":
      retVal = "TkkZavrsetak";
      break;
    case "vv_kabl_v":
      retVal = "VvKabl";
      break;
    case "vv_nastavak_v":
      retVal = "VvNastavak";
      break;
    case "vv_stub_v":
      retVal = "VvStub";
      break;
    case "vv_trasa_v":
      retVal = "VvTrasa";
      break;
    case "vv_zavrsetak_v":
      retVal = "VvZavrsetak";
      break;
    case "zgrada_v":
      retVal = "Zgrada";
      break;
    default:
  }
  return retVal;
}

/**Dropdown checkboxes proba */
var expanded = false;
function showCheckboxes() {
  let checkboxes = document.querySelector("#checkboxes");
  if (!expanded) {
    checkboxes.style.display = "inline-grid";
    expanded = true;
  } else {
    checkboxes.style.display = "none";
    expanded = false;
  }
}

/**Pojavljivanje input fielda na checked checkbox */
function showInput() {
  let checkBox = document.querySelector("#pretragaTacke");
  let field = document.querySelector("#pretragaTackeUdaljenost");
  if (checkBox.checked) {
    field.style.display = "block";
  } else {
    field.style.display = "none";
  }
}

/**Accordian za legendu mape*/
let acc = document.querySelectorAll(".map-legend-accordian");
for (let i = 0; i < acc.length; i++) {
  acc[i].onclick = function () {
    // this.classList.toggle("active");
    this.parentElement.nextElementSibling.classList.toggle("show");
  };
}

/**Prenosivi sidenav */
var windows = document.querySelectorAll(".draggable");
[].forEach.call(windows, function (win) {
  let title = win.querySelector(".titleAndClose");
  title.addEventListener(
    "mousedown",
    function (evt) {
      let real = window.getComputedStyle(win),
        winX = parseFloat(real.left),
        winY = parseFloat(real.top);
      let mX = evt.clientX,
        mY = evt.clientY;
      document.body.addEventListener("mousemove", drag, false);
      document.body.addEventListener(
        "mouseup",
        function () {
          document.body.removeEventListener("mousemove", drag, false);
        },
        false
      );
      function drag(evt) {
        win.style.left = winX + evt.clientX - mX + "px";
        win.style.top = winY + evt.clientY - mY + "px";
        if (winY + evt.clientY - mY < 55) {
          win.style.left = winX + evt.clientX - mX + "px";
          win.style.top = 55 + "px";
        }
      }
    },
    false
  );
});

/**Slider*/
document.querySelector("#sliderProvidnost").oninput = function () {
  //osmBaseMap.setOpacity(this.value/100);
  antenskiStub.setOpacity(this.value / 100);
  tkkCijev.setOpacity(this.value / 100);
};
