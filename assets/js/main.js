/**Inicijalna deklaracija promjenljivih koje su vezane za konkretan lejer */
const layername = "antenski_stub_v",
  layerworkspace = "ekip:",
  fulllayername = layerworkspace + layername,
  layertitle = "Antenski stubovi";
const tipGeometrije = point;
let opisSlike = "";
let obradaKlika = false,
  blnFreeHandDraw = false;
let idSelektovanihOpstina = [],
  idSelektovanihNaselja = [],
  geometrijeSelektovanihOpstina = [],
  geometrijeSelektovanihNaselja = [];
let geometrijaZahvataPlana = "";
let grafikonBrzinaData, grafikonTehnologijaData, grafikonDodatniPodaci;
let idSelektovaneVrste = 0,
  slojTabele = "";

let idCijeviZaProracunKapaciteta = "",
  presjekCijeviZaProracun = 0;

/**Vraća jedan objekat čiji se id predaje i čija geometrija se prikazuje */
function wfsZaPrikazIzAccordiona(lejer, id) {
  let puniNazivLejera = "ekip:" + lejer;
  if (id === "") {
    return false;
  }
  $.ajax({
    method: "POST",
    url: wfsUrl,
    data: {
      service: "WFS",
      request: "GetFeature",
      typename: puniNazivLejera,
      outputFormat: "application/json",
      srsname: "EPSG:3857",
      //"maxFeatures": 50,
      CQL_FILTER: "id=" + id.toString(),
    },
    success: function (response) {
      let features = new ol.format.GeoJSON().readFeatures(response);
      vectorSelectedObject.getSource().clear(); //Ispraznimo prethodne zapise da bi imali samo jedan koji ćemo editovati
      vectorSelectedObject.getSource().addFeatures(features);
    },
    fail: function (jqXHR, textStatus) {
      console.log("Request failed: " + textStatus);
    },
  });
}

function selektujObjekat(objedinjeniId) {
  let razdvojeno = objedinjeniId.split(".");
  wfsZaPrikazIzAccordiona(razdvojeno[0], razdvojeno[1]);
}

/**Popunjavanje komponenti u divu za prikaz atributa, nakon pročitanog odgovora za WMS objekat */
function popuniKontrole(odgovor) {
  //let atributi = odgovor.features[0]["properties"];
  for (let i = 0; i < odgovor.features.length; i++) {
    let metapodaci = odgovor.features[i]["properties"];
    let element_id = odgovor.features[i]["id"];
    let objekat = element_id.split(".");
    let collapse_name = preimenujNazivLejeraZaAtributJavneStrane(objekat[0]) + " - " + metapodaci["id"];
    let collapse_id = objekat[0] + "." + metapodaci["id"];
    let promjenljivaZaPoziv = "'" + collapse_id + "'";
    if (!document.querySelector("#accordion").innerHTML.includes('id="' + collapse_id + '"')) {
      let div_heder =
        '<div class="collapse" id="' +
        collapse_id +
        '" onclick="selektujObjekat(' +
        promjenljivaZaPoziv +
        ')"><a href="#' +
        collapse_id +
        '">' +
        collapse_name +
        '</a><div class="content"><div class="inner-content">';
      let div_sadrzaj = "";
      for (let key in metapodaci) {
        if (
          key !== "active" &&
          key !== "version" &&
          key !== "username" &&
          key !== "validiran" &&
          key !== "date_created" &&
          key !== "last_updated"
        ) {
          let naziv_atributa = formatAttributeName(key);
          let vrijednost_atributa = metapodaci[key];
          vrijednost_atributa === "null" && (vrijednost_atributa = "");
          vrijednost_atributa === true && (vrijednost_atributa = "Da");
          vrijednost_atributa === false && (vrijednost_atributa = "Ne");
          div_sadrzaj +=
            '<div class="d-flex-sb mb-8 pb-8 border-bottom-w"><div><strong>' +
            naziv_atributa +
            '</strong></div><div class="attr-value"><span>' +
            vrijednost_atributa +
            "</span></div></div>";
        }
      }
      document.querySelector("#accordion").innerHTML += div_heder + div_sadrzaj + "</div></div></div>";
    }
  }
}

/** Sve podešava na početne vrijednosti*/
function restartovanje() {
  objectId = 0;
  isprazniGeometrije();
}

/** Prazni sve promjenljive vezane za crtanje i edit geometrije*/
function isprazniGeometrije() {
  featureTekuciOverlay.getSource().clear();
  isDrawn = false;
  isModified = false;
}

/**Overview*/
let overviewMapControl = new ol.control.OverviewMap({
  // see in overviewmap-custom.html to see the custom CSS used
  className: "ol-overviewmap ol-custom-overviewmap",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
  ],
  collapseLabel: "\u00BB",
  label: "\u00AB",
  collapsed: true,
});

/**Smještanje mape u div sa id-jem "map" */
let map = new ol.Map({
  controls: ol.control.defaults().extend([overviewMapControl]),
  target: "map",
  //interactions: ol.interaction.defaults().extend([new ol.interaction.PinchZoom(), new ol.interaction.DragPan()]),
  layers: [osmBaseMap], //, tkkCijev, antenskiStub
  view: view,
});

//Ovaj dio riješio problem centriranja mape nad Bosnom, na mobilnim uređajima
$(document).ready(function () {
  map.updateSize();
});

map.addControl(razmjera);
map.addLayer(vectorSelectedObject);
vectorSelectedObject.setZIndex(1001);

/** Dodavanje vektorskih lejera za crtanje i edit geometrije na mapu */
featureLineOverlay.setMap(map);
featurePointOverlay.setMap(map);
featurePolygonOverlay.setMap(map);
featureTextOverlay.setMap(map);
featureTekuciOverlay.setMap(map);

setVectorStyles(vectorColor, vectorColorRgb, vectorRadiusSize, vectorFont, vectorTextValue);
/**Podešava kada da se omogući crtanje i izmjena i na kojim lejerima */
function podesiInterakciju() {
  //uklanja draw i modify
  map.removeInteraction(draw);
  map.removeInteraction(modify);
  //console.log("interakcija free hand", blnFreeHandDraw);
  if (selectedMenuItem === point) {
    draw = new ol.interaction.Draw({
      features: featuresPoint,
      type: selectedMenuItem,
    });
    modify = new ol.interaction.Modify({
      features: featuresPoint,
      deleteCondition: function (event) {
        return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event);
      },
    });
    map.addInteraction(draw);
    map.addInteraction(modify);
  }
  if (selectedMenuItem === textOnMap) {
    draw = new ol.interaction.Draw({
      features: featuresText,
      type: point,
    });
    map.addInteraction(draw);
  }
  if (selectedMenuItem === lineString) {
    draw = new ol.interaction.Draw({
      features: featuresLine,
      type: lineString,
      freehand: blnFreeHandDraw,
    });
    modify = new ol.interaction.Modify({
      features: featuresLine,
      deleteCondition: function (event) {
        return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event);
      },
    });
    map.addInteraction(draw);
    map.addInteraction(modify);
  }
  if (selectedMenuItem === polygon) {
    draw = new ol.interaction.Draw({
      features: featuresPolygon,
      type: polygon,
      freehand: blnFreeHandDraw,
    });
    modify = new ol.interaction.Modify({
      features: featuresPolygon,
      deleteCondition: function (event) {
        return ol.events.condition.shiftKeyOnly(event) && ol.events.condition.singleClick(event);
      },
    });
    map.addInteraction(draw);
    map.addInteraction(modify);
  }
}

map.on("pointermove", onMouseMove);

function onMouseMove(evt) {
  let position = ol.proj.transform(evt.coordinate, "EPSG:3857", "EPSG:4326");
  document.querySelector("#koordinate").innerHTML =
    "X:" + parseFloat(position[0]).toFixed(6) + " Y:" + parseFloat(position[1]).toFixed(6);
  if (evt.dragging) {
    return;
  }
  map.getTargetElement().style.cursor = "";
  let pixel = map.getEventPixel(evt.originalEvent);
}

/**Omogućava dodavanje novog vektor lejera drag-drop metodom */
let vektorSource = new ol.source.Vector();
let dragAndDrop = new ol.interaction.DragAndDrop({
  formatConstructors: [ol.format.GPX, ol.format.GeoJSON, ol.format.IGC, ol.format.KML, ol.format.TopoJSON],
});
dragAndDrop.on("addfeatures", function (event) {
  //console.log("feature", wktGeometrije(event.features[0]));
  geometrijaZahvataPlana = wktGeometrije(event.features[0]);
  let vectorSource = new ol.source.Vector({
    features: event.features,
    projection: event.projection,
  });
  map.getLayers().push(
    new ol.layer.Vector({
      source: vectorSource,
      style: vectorStyle,
    })
  );
  view.fit(vectorSource.getExtent(), map.getSize());
});
map.addInteraction(dragAndDrop);

//Klik na feature
map.on("click", onMouseClick);

function onMouseClick(browserEvent) {
  let coordinate = browserEvent.coordinate;
  let pixel = map.getPixelFromCoordinate(coordinate);

  if (selectedMenuItem === "atributi" && !obradaKlika) {
    obradaKlika = true;
    document.querySelector("#accordion").innerHTML = "";

    map.forEachLayerAtPixel(pixel, function (layer) {
      let title = layer.get("title");
      let vidljivost = layer.get("visible");
      if (layer instanceof ol.layer.Image) {
        if (vidljivost) {
          let url = layer
            .getSource()
            .getFeatureInfoUrl(browserEvent.coordinate, map.getView().getResolution(), "EPSG:3857", {
              INFO_FORMAT: "application/json",
            });
          if (url) {
            fetch(url)
              .then(function (response) {
                //restartovanje();
                return response.text();
              })
              .then(function (json) {
                let odgovor = JSON.parse(json);
                if (odgovor.features.length > 0) {
                  //console.log(odgovor);
                  popuniKontrole(odgovor);
                  //showDiv("#atributiDiv");
                }
              });
          }
        }
      }
    });
    obradaKlika = false;
    //Ovo bi trebalo da onemogući klik veći broj puta na isti feature
  }
}

function izbrisi() {
  confirmModal("UKLANJANJE", "Da li ste sigurni da želite da uklonite odabrani objekat?");
}

/**Metoda koja će sve resetovati na početne vrijednosti */
function ponisti() {
  restartovanje();
}

function wfsFilter(fulllayer) {
  $.ajax({
    method: "POST",
    url: wfsUrl,
    data: {
      service: "WFS",
      request: "GetFeature",
      typename: fulllayer,
      outputFormat: "application/json",
      srsname: "EPSG:3857",
      //"maxFeatures": 50,
      CQL_FILTER: cqlFilter,
    },
    success: function (response) {
      //console.log(response);
      let features = new ol.format.GeoJSON().readFeatures(response);
      vektorSource.clear();
      vektorSource.addFeatures(features);
      if (features.length) {
        let vectorIzvjestaj = kreirajVektorLejerZaCrtanje(new ol.Colletction());
        vectorIzvjestaj.setSource(new ol.source.Vector({ features: features }));
        map.getView().fit(vectorIzvjestaj.getSource().getExtent(), { maxZoom: 17 });
      } else {
        poruka("Uspjeh", "Nema zapisa za prikaz.");
      }

      let sloj = document.querySelector("#ddlLejerPretraga").value;
    },
    fail: function (jqXHR, textStatus) {
      console.log("Request failed: " + textStatus);
    },
  });
}

/**Vraća jedan objekat čiji se id predaje i čija geometrija će se mijenjati */
function wfsZaEdit(id) {
  if (id === "") {
    poruka("Upozorenje", "Nije odabran objekat čija geometrija se želi mijenjati.");
    return false;
  }
  $.ajax({
    method: "POST",
    url: wfsUrl,
    data: {
      service: "WFS",
      request: "GetFeature",
      typename: fulllayername,
      outputFormat: "application/json",
      srsname: "EPSG:3857",
      //"maxFeatures": 50,
      CQL_FILTER: "id=" + id.toString(),
    },
    success: function (response) {
      let features = new ol.format.GeoJSON().readFeatures(response);
      featureTekuciOverlay.getSource().clear(); //Ispraznimo prethodne zapise da bi imali samo jedan koji ćemo editovati
      featureTekuciOverlay.getSource().addFeatures(features);
    },
    fail: function (jqXHR, textStatus) {
      console.log("Request failed: " + textStatus);
    },
  });
}

/** Download WFS-a u zavisnosti od predatog formata */
function wfsDownload(format) {
  let dodajCqlFilter = "";
  cqlFilter !== "" && (dodajCqlFilter = "&cql_filter=" + cqlFilter);
  window.open(
    wfsUrl + "?version=1.0.0&request=GetFeature&typeName=" + fulllayername + "&outputformat=" + format + dodajCqlFilter,
    "_blank"
  );
  return false;
}

/**MOVE MAPE - UNDO i REDO**/
map.on("moveend", onMoveEnd);
function onMoveEnd(evt) {
  if (!pomjerajUndoRedo) {
    //Ako je pomjeraj došao preko mape, a ne unod/redo, od tekućeg indexa nizova se nastavlja punjenje (pregazi se sve što je bilo nakon tekuće pozicije)
    //Dodajemo centar i zoom u nizove i pomjeramo index za jedan više, a to je i dužina niza
    //var extent = evt.map.getView().calculateExtent(map.getSize());
    let centar = evt.map.getView().getCenter();
    let nivoZuma = evt.map.getView().getZoom();

    indexUndoRedoNiza++;
    nizKoordinataMove.length = indexUndoRedoNiza;
    nizNivoaZuma.length = indexUndoRedoNiza;
    nizKoordinataMove.push(centar);
    nizNivoaZuma.push(nivoZuma);
  }
  pomjerajUndoRedo = false; //Uvijek resetujemo da očekujemo pomjeraj kroz interakciju mape
}

document.querySelector("#undo").addEventListener("click", undoMoveMap);
document.querySelector("#redo").addEventListener("click", redoMoveMap);
document.querySelector("#pocetniPrikazMape").addEventListener("click", pocetniPrikazMape);
document.querySelector("#prikazOdabiraKoordinata").addEventListener("click", prikazDivKoordinate);
document.querySelector("#crtanjeSlobodnomRukomDugme").addEventListener("click", crtanjeSlobodnomRukom);

let nizKoordinataMove = [],
  nizNivoaZuma = [],
  indexUndoRedoNiza = -1,
  pomjerajUndoRedo = false;

function undoMoveMap() {
  if (indexUndoRedoNiza > 0) {
    //Ako ima prethodnih pozicija, može da radi undo
    indexUndoRedoNiza--;
    pomjerajUndoRedo = true;
    map.getView().setCenter(nizKoordinataMove[indexUndoRedoNiza]);
    map.getView().setZoom(nizNivoaZuma[indexUndoRedoNiza]);
  }
}

function redoMoveMap() {
  if (indexUndoRedoNiza < nizKoordinataMove.length - 1) {
    //Ako ima pozicija nakon tekuće postavljamo mapu na to
    indexUndoRedoNiza++;
    pomjerajUndoRedo = true;
    map.getView().setCenter(nizKoordinataMove[indexUndoRedoNiza]);
    map.getView().setZoom(nizNivoaZuma[indexUndoRedoNiza]);
  }
}

function pocetniPrikazMape() {
  indexUndoRedoNiza = 0;
  pomjerajUndoRedo = true;
  map.getView().setCenter(nizKoordinataMove[indexUndoRedoNiza]);
  map.getView().setZoom(nizNivoaZuma[indexUndoRedoNiza]);
}

/**UNOŠENJE X,Y KOORDINATA IZ RAZLIČITH KOORDINATNIH SISTEMA**/
function prikazDivKoordinate() {
  showDiv("#koordinateDiv");
}
document.querySelector("#btnPrikazKoordinata").addEventListener("click", crtajKoordinatu);
function crtajKoordinatu() {
  let sistem = document.querySelector("#ddlKoordinatniSistem").value;
  let x = document.querySelector("#koorX").value;
  let y = document.querySelector("#koorY").value;
  if (x === "" || y === "") {
    poruka("Upozorenje", "Potrebno je unijeti vrijednosti koordinata u polja x i y");
    return false;
  }
  //sistem = 'EPSG:25832';
  //ol.proj4.defs(sistem, '+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

  map.getView().setCenter(ol.proj.transform([x, y], sistem, "EPSG:3857"));
  map.getView().setZoom(15);

  const feature = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat([x, y])),
  });
  let features = [];
  features.push(feature);
  vectorSelectedObject.getSource().clear();
  vectorSelectedObject.setSource(new ol.source.Vector({ features: features }));
}
/****Crtanje slobodnom rukom**/
function crtanjeSlobodnomRukom() {
  blnFreeHandDraw = !blnFreeHandDraw;
  if (blnFreeHandDraw) {
    document.querySelector("#crtanjeSlobodnomRukomDugme").innerHTML = "Prave linije";
  } else {
    document.querySelector("#crtanjeSlobodnomRukomDugme").innerHTML = "Slobodnom rukom";
  }
  podesiInterakciju();
}

document.querySelector("#oAplikaciji").addEventListener("click", showOaplikaciji);
document.querySelector("#tekstMapa").addEventListener("click", tekstMapa);
document.querySelector("#btnTekstMapa").addEventListener("click", dodajTekstMapa);
document.querySelector("#uputstvo").addEventListener("click", prikaziUputstvo);

function showOaplikaciji() {
  showDiv("#oAplikacijiDiv");
}
function tekstMapa() {
  document.querySelector("#tekstMapaDiv").style.width = "700px";
}

function prikaziUputstvo() {
  window.open(location.origin + "/uputstva/KorisnickoUputstvo.pdf", "_blank");
}

function prevodjenjeSlojevaZaWfs(sloj) {
  let retVal = "";
  if (sloj.toLowerCase().includes("ntensk") && sloj.toLowerCase().includes("stub")) {
    retVal = "antenski_stub_v";
  }

  return retVal;
}
