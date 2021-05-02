/** Global methods and variables. Can be used in all modules */

const domainUrl = location.origin;
//const domainUrl = "http://localhost:8088";
//const domainUrl = "http://167.172.171.249";
const wmsUrl = domainUrl + "/geoserver/ekip/wms";
const wfsUrl = domainUrl + "/geoserver/ekip/wfs";
const imageUrl = domainUrl + "/ekipDocs/";
const wmsCadastrialUrl = domainUrl + "/geoserver/winsoft/wms";
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

let vectorSelectedObject = new ol.layer.Vector({
  source: new ol.source.Vector({
    //features: features
  }),
});

/**Basemaps */
let osmBaseMap = new ol.layer.Tile({
  title: "Open Street Maps",
  source: new ol.source.OSM(),
});
let satteliteBaseMap = new ol.layer.Tile({
  title: "Satelitski snimak",
  source: new ol.source.XYZ({
    url: "http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}",
    maxZoom: 23,
  }),
});
let topoBaseMap = new ol.layer.Tile({
  title: "Open Topo Maps",
  type: "base",
  visible: true,
  source: new ol.source.XYZ({
    url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
  }),
});
let hikerBaseMap = new ol.layer.Tile({
  title: "Pješačka mapa",
  type: "base",
  visible: true,
  source: new ol.source.XYZ({
    url: "https://tiles.wmflabs.org/hikebike/{z}/{x}/{y}.png",
  }),
});

var cadastrialBaseMap = new ol.layer.Tile({
  title: "Katastar",
  name: "uzn",
  source: new ol.source.TileWMS({
    url: wmsCadastrialUrl,
    params: {
      LAYERS: "winsoft:uzn",
    },
    ratio: 1,
    serverType: "geoserver",
  }),
});

/********************** METHODS **************************/

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

/**
 * For input color in hesadecimal representation returns rgb color representation with 0.3 opacity
 * This could be avoided if we provide opacity as 4th group of values in hexadecimal
 * @param {Hexadecimal color representation} hexColor
 * @returns
 */
function hexToRgb(hexColor) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
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

/**
 * Sets styles for all vector layers (overlays) displayed on the map
 * @param {Fill color without opacity} vectorColor
 * @param {Transparent fill color} vectorColorRgb
 * @param {Size of point. Also scale of text label} vectorRadiusSize
 * @param {Selected font for map label} vectorFont
 * @param {Lable value - text that is going to be shown on the map} vectorTextValue
 */
function setVectorStyles(vectorColor, vectorColorRgb, vectorRadiusSize, vectorFont, vectorTextValue) {
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
  featureTextOverlay.setStyle(vectorTextStyle);
  featurePointOverlay.setStyle(vectorStyle);
  featureLineOverlay.setStyle(vectorStyle);
  featurePolygonOverlay.setStyle(vectorStyle);
}
