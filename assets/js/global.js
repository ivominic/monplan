/** Global methods and variables. Can be used in all modules */

const domainUrl = location.origin;
//const domainUrl = "http://localhost:8088";
//const domainUrl = "http://167.172.171.249";
const wmsUrl = domainUrl + "/geoserver/ekip/wms";
const wfsUrl = domainUrl + "/geoserver/ekip/wfs";
const imageUrl = domainUrl + "/ekipDocs/";
const wmsKatastarUrl = domainUrl + "/geoserver/winsoft/wms";
const point = "Point",
  lineString = "LineString",
  polygon = "Polygon",
  textOnMap = "textOnMap";
let pointsArray = [],
  linesArray = [],
  polygonsArray = [],
  mapLabelsArray = [];
let draw,
  modify,
  cqlFilter = "",
  objectId = 0,
  selectedMenuItem = "pan";

let isDrawn = false,
  isModified = false;

let vectorColor = "#ff0000",
  vectorColorRgb = "rgba(255,0,0,0.3)",
  vectorRadiusSize = 7,
  vectorFont = "Arial",
  vectorTextValue = "";

/**Creating vector styles */
let fill = new ol.style.Fill({
  color: vectorColorRgb,
});
let stroke = new ol.style.Stroke({
  color: vectorColor,
  width: 2,
});
let circle = new ol.style.Circle({
  radius: vectorRadiusSize,
  fill: fill,
  stroke: stroke,
});
let vectorStyle = new ol.style.Style({
  fill: fill,
  stroke: stroke,
  image: circle,
});

/**Creating map text style */
let fillText = new ol.style.Fill({
  color: vectorColor,
});
let textText = new ol.style.Text({
  text: vectorTextValue,
  font: "12px " + vectorFont,
  scale: vectorRadiusSize,
  fill: fillText,
  //stroke: strokeText,
});
let vectorTextStyle = new ol.style.Style({
  text: textText,
});

/**Stilizacija vektora zelenom bojom*/
let fillSelect = new ol.style.Fill({
  color: "rgba(76,175,80,0.7)",
});
let strokeSelect = new ol.style.Stroke({
  color: "#4caf50",
  width: 6,
});
let circleSelect = new ol.style.Circle({
  radius: 7,
  fill: fillSelect,
  stroke: strokeSelect,
});
var vectorStyleSelect = new ol.style.Style({
  fill: fillSelect,
  stroke: strokeSelect,
  image: circleSelect,
});

//vektor prikaz za izvještaj
let vectorIzvjestaj = new ol.layer.Vector({
  source: new ol.source.Vector({
    //features: features
  }),
  style: vectorStyle,
});

let vectorSelektovaniObjekat = new ol.layer.Vector({
  source: new ol.source.Vector({
    //features: features
  }),
  style: vectorStyleSelect,
});
/**Definisanje podloga */
let osmBaseMap = new ol.layer.Tile({
  title: "Open Street Maps",
  source: new ol.source.OSM(),
});
let satelitBaseMap = new ol.layer.Tile({
  title: "Satelitski snimak",
  source: new ol.source.XYZ({
    url: "http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
    maxZoom: 23,
  }),
});
let topoMap = new ol.layer.Tile({
  title: "Open Topo Maps",
  type: "base",
  visible: true,
  source: new ol.source.XYZ({
    url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
  }),
});
let hikerMap = new ol.layer.Tile({
  title: "Pješačka mapa",
  type: "base",
  visible: true,
  source: new ol.source.XYZ({
    url: "https://tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png",
  }),
});

var katastarBaseMap = new ol.layer.Tile({
  title: "Katastar",
  name: "uzn",
  source: new ol.source.TileWMS({
    url: wmsKatastarUrl,
    params: {
      LAYERS: "winsoft:uzn",
    },
    ratio: 1,
    serverType: "geoserver",
  }),
});

/********************** METHODS */

/**
 * Methode that creates new wms layer from passed params
 * @param {Layer title} title
 * @param {Layer name} name
 * @param {Full layer name - name of workspace + name of layer} fullName
 * @param {Names of the columns/attributes that can be shown to user} propertyName
 * @returns
 */
function createNewImageWmsLayer(title, name, fullName, propertyName) {
  if (propertyName) {
    return new ol.layer.Image({
      title: title,
      name: name,
      source: new ol.source.ImageWMS({
        url: wmsUrl,
        params: {
          LAYERS: fullName,
          propertyName: propertyName,
          feature_count: "5",
        },
        ratio: 1,
        serverType: "geoserver",
      }),
    });
  } else {
    return new ol.layer.Image({
      title: title,
      name: name,
      source: new ol.source.ImageWMS({
        url: wmsUrl,
        params: {
          LAYERS: fullName,
          feature_count: "5",
        },
        ratio: 1,
        serverType: "geoserver",
      }),
    });
  }
}

/**
 * Method that formates attribute names returned from Geoserver/column names
 * @param {*name of attribute returned from Geoserver - name of table column, that needs to be formated} attribute
 * @returns
 */
function formatAttributeName(attribute) {
  let array = {
    id: "Id",
    ekip_id: "Ekip Id",
    EkipId: "Ekip Id",
    id_operato: "Operator",
    idOperato: "Operator",
    tip: "Tip",
    tip_nosaca: "Tip nosača",
    visina: "Visina",
    visina_obj: "Visina objekta",
    vis_stuba: "Visina stuba",
    namena: "Namjena",
    opstina: "Opština",
    naziv_lok: "Lokacija",
    lokacija: "Lokacija",
    id_as: "Id stuba",
    id_vv_stub: "Id stuba",
    trasa: "Naziv",
    mrPris_n: "Pristupna mreža",
    mrPris_p: "Kablovski pravac",
    prenosni_p: "Prenosni put",
    geodSnTr: "Snimak trase",
    duzina: "Dužina (m)",
    IdTrasa: "Id trase",
    cevTip: "Tip",
    cevStatus: "Status",
    korisnik: "Korisnik",
    cevParent: "Kroz cijev",
    popPresek: "Poprečni presjek (mm)",
    IdCev: "Id",
    prohodnost: "Prohodnost",
    oznaka: "Oznaka",
    precnik: "Prečnik",
    polaganje: "Godina polaganja",
    status: "Status",
    IdKbl: "Id kabla",
    IdVlasnik: "Id vlasnika",
    postavljen: "Način postavljanja",
    tipOkn: "Tip",
    oznOkn: "Oznaka",
    kotaPokl: "Kota poklopca",
    kotaDna: "Kota dna",
    kotaVoda: "Kota voda",
    sirinaOkn: "Širina (m)",
    duzinaOkn: "Dužina (m)",
    semaOkn: "Šema",
    idOkn: "Id",
    tipNastav: "Tip nastavka",
    tipSpojn: "Tip spojnice",
    polozaj: "Položaj",
    idVvNas: "Id",
    mestoOpis: "Mjesto",
    tipZavrse: "Tip",
    adresa: "Adresa",
    idZav: "Id",
    tehnologij: "Tehnologija",
    kapacitet: "Kapacitet",
    iskoriscen: "Broj priključaka",
    idVvTras: "Id trase",
    idVvKbl: "Id",
    idvlasnik1: "Vlasnik 1",
    brVlakna1: "Broj vlakana vlasnika 1",
    idvlasnik2: "Vlasnik 2",
    brVlakna2: "Broj vlakana vlasnika 2",
    idvlasnik3: "Vlasnik 3",
    brVlakna3: "Broj vlakana vlasnika 3",
    idvlasnik4: "Vlasnik 4",
    brVlakna4: "Broj vlakana vlasnika 4",
    slika: "Slika",
    idVvStub: "Id",
    tipNosaca: "Tip",
    vlasnik: "Vlasnik",
    idVvZav: "Id",
    brzina: "Brzina (Mbps)",
    nazivAs: "Naziv",
    nazivLok: "Lokacija",
    nadVisina: "Nadmorska visina (m)",
    dimOsnove: "Dimenzije osnove",
    visStuba: "Visina stuba",
    visinaObj: "Visina objekta",
    fotoSever: "Fotografija - sjever",
    fotoIstok: "Fotografija - istok",
    fotoJug: "Fotografija - jug",
    fotoZapad: "Fotografija - zapad",
    idAs: "Id stuba",
    idOprem: "Id opreme",
    namenaDet: "Detalji namjene",
    vlasnikdet: "Vlasnik detalji",
    nazivZgr: "Naziv",
    tipZgr: "Tip",
    ukPovrs: "Površina (m2)",
    tlocrt: "Tlocrt",
    ukSnaga: "Snaga napajanja",
    reSnaga: "Snaga rezervnog napajanja",
    ukPotro: "Potrošnja opreme",
    ukIzna: "Iznajmljeni prostor",
    idZgr: "Id zgrade",
    idKorisn: "Id korisnika",
    IdProst: "Id prostora",
    naziv: "Naziv",
    tel: "Telefon",
    email: "E-mail",
    pib: "PIB",
  };
  let retVal = array[attribute];
  if (retVal === undefined) {
    retVal = attribute;
  }
  retVal = retVal.replace(/_/g, " ");
  return retVal;
}

/**
 * Sets (selects) dropdown element with given id
 * @param {Id of html select element - dropdown list} selectId
 * @param {Value of wanted option element} value
 */
function setSelectItem(selectId, value) {
  for (let i = 0; i < document.querySelector(selectId).length; i++) {
    document.querySelector(selectId).options[i].value === value &&
      (document.querySelector(selectId).options[i].selected = true);
  }
}

function hexToRgb(hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return (
    "rgba(" +
    parseInt(result[1], 16).toString() +
    "," +
    parseInt(result[2], 16).toString() +
    "," +
    parseInt(result[3], 16).toString() +
    ",0.3)"
  );
}

function azurirajVektorStilove(boja, bojaRgb, velicina, font, tekst) {
  let fill1 = new ol.style.Fill({
    color: bojaRgb,
  });
  let stroke1 = new ol.style.Stroke({
    color: boja,
    width: 2,
  });
  let circle1 = new ol.style.Circle({
    radius: velicina,
    fill: fill1,
    stroke: stroke1,
  });
  let vectorStyle1 = new ol.style.Style({
    fill: fill1,
    stroke: stroke1,
    image: circle1,
  });

  /**Stilizacija teksta */
  let fillText1 = new ol.style.Fill({
    color: vectorColor,
  });
  let textText1 = new ol.style.Text({
    text: tekst,
    font: "12px " + font,
    scale: velicina,
    fill: fillText1,
    //stroke: strokeText,
  });
  let vectorTextStyle1 = new ol.style.Style({
    text: textText1,
  });
  featureTextOverlay.setStyle(vectorTextStyle1);
  featurePointOverlay.setStyle(vectorStyle1);
  featureLineOverlay.setStyle(vectorStyle1);
  featurePolygonOverlay.setStyle(vectorStyle1);
}
