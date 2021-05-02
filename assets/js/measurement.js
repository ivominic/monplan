let measureSource = new ol.source.Vector();

let measureVector = new ol.layer.Vector({
  source: measureSource,
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: "rgba(100, 80, 20, 0.2)",
    }),
    stroke: new ol.style.Stroke({
      color: "#ffcc33",
      width: 2,
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: "#ffcc33",
      }),
    }),
  }),
});

map.addLayer(measureVector);

let sketch;
let helpTooltipElement;
let helpTooltip;
let measureTooltipElement;
let measureTooltip;
let continuePolygonMsg = "Kliknite za nastavak crtanja poligona";
let continueLineMsg = "Kliknite za nastavak crtanja linije";
let crtanje = false;

let pointerMoveHandler = function (evt) {
  if (evt.dragging || !crtanje) {
    return;
  }
  let helpMsg = "Kliknite da započnete mjerenje";

  if (sketch) {
    let geom = sketch.getGeometry();
    if (geom instanceof ol.geom.Polygon) {
      helpMsg = continuePolygonMsg;
    } else if (geom instanceof ol.geom.LineString) {
      helpMsg = continueLineMsg;
    }
  }

  helpTooltipElement.innerHTML = helpMsg;
  helpTooltip.setPosition(evt.coordinate);

  helpTooltipElement.classList.remove("hidden");
};

map.on("pointermove", pointerMoveHandler);

map.getViewport().addEventListener("mouseout", function () {
  if (crtanje) {
    helpTooltipElement.classList.add("hidden");
  }
});

let typeSelect = document.getElementById("type");

let drawMeasure; // global so we can remove it later
let formatLength = function (line) {
  let length = ol.sphere.getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + " " + "km";
  } else {
    output = Math.round(length * 100) / 100 + " " + "m";
  }
  return output;
};

let formatArea = function (polygon) {
  let area = ol.sphere.getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + " " + "km<sup>2</sup>";
  } else {
    output = Math.round(area * 100) / 100 + " " + "m<sup>2</sup>";
  }
  return output;
};

function addInteraction(type, blnFreeHandDraw) {
  crtanje = true;
  drawMeasure = new ol.interaction.Draw({
    source: measureSource,
    type: type,
    freehand: blnFreeHandDraw,
    style: new ol.style.Style({
      fill: new ol.style.Fill({
        color: "rgba(255, 255, 255, 0.2)",
      }),
      stroke: new ol.style.Stroke({
        color: "rgba(0, 0, 0, 0.5)",
        lineDash: [10, 10],
        width: 2,
      }),
      image: new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({
          color: "rgba(0, 0, 0, 0.7)",
        }),
        fill: new ol.style.Fill({
          color: "rgba(255, 255, 255, 0.2)",
        }),
      }),
    }),
  });
  map.addInteraction(drawMeasure);

  createMeasureTooltip();
  createHelpTooltip();

  let listener;
  drawMeasure.on("drawstart", function (evt) {
    // set sketch
    sketch = evt.feature;
    let tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on("change", function (evt) {
      let geom = evt.target;
      let output;
      if (geom instanceof ol.geom.Polygon) {
        output = formatArea(geom);
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof ol.geom.LineString) {
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
      }
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });
  });

  drawMeasure.on("drawend", function () {
    measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
    measureTooltip.setOffset([0, -7]);
    measureSource.addFeatures(sketch);
    sketch = null;
    measureTooltipElement = null;
    createMeasureTooltip();
    ol.Observable.unByKey(listener);
    krajMjerenja();
  });
}

function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement("div");
  helpTooltipElement.className = "ol-tooltip hidden";
  helpTooltip = new ol.Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: "center-left",
  });
  map.addOverlay(helpTooltip);
}

function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement("div");
  measureTooltipElement.className = "ol-tooltip ol-tooltip-measure";
  measureTooltip = new ol.Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: "bottom-center",
  });
  map.addOverlay(measureTooltip);
}

document.querySelector("#mjeraLinija").addEventListener("click", mjerenjeLinije);
document.querySelector("#mjeraPoligon").addEventListener("click", mjerenjePoligona);
document.querySelector("#mjeraLinijaSlobodno").addEventListener("click", mjerenjeLinijeFreehand);
document.querySelector("#mjeraPoligonSlobodno").addEventListener("click", mjerenjePoligonaFreehand);
document.querySelector("#stampanje").addEventListener("click", stampaMape);

function mjerenjeLinije() {
  mjerenjeDuzine(false);
}
function mjerenjeLinijeFreehand() {
  mjerenjeDuzine(true);
}
function mjerenjePoligona() {
  mjerenjePovrsine(false);
}
function mjerenjePoligonaFreehand() {
  mjerenjePovrsine(true);
}

function mjerenjeDuzine(blnFreeHandDraw) {
  map.removeInteraction(draw);
  map.removeInteraction(modify);
  map.removeInteraction(drawMeasure);
  addInteraction("LineString", blnFreeHandDraw);
}

function mjerenjePovrsine(blnFreeHandDraw) {
  map.removeInteraction(draw);
  map.removeInteraction(modify);
  map.removeInteraction(drawMeasure);
  addInteraction("Polygon", blnFreeHandDraw);
}

function krajMjerenja() {
  map.removeInteraction(drawMeasure);
  crtanje = false;
}

function brisanjeMjerenja() {
  crtanje = false;
  map.removeInteraction(drawMeasure);
  measureSource.clear();
  let x = document.querySelectorAll(".ol-tooltip-static");
  for (let i = 0; i < x.length; i++) {
    x[i].parentNode.removeChild(x[i]);
  }
  map.removeOverlay(measureTooltip);
  map.removeOverlay(helpTooltip);
}

function stampaMape() {
  closeHamburger();
  map.once("rendercomplete", function () {
    let mapCanvas = document.createElement("canvas");
    let size = map.getSize();
    mapCanvas.width = size[0];
    mapCanvas.height = size[1];
    let mapContext = mapCanvas.getContext("2d");
    Array.prototype.forEach.call(document.querySelectorAll(".ol-layer canvas"), function (canvas) {
      if (canvas.width > 0) {
        let opacity = canvas.parentNode.style.opacity;
        mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
        let transform = canvas.style.transform;
        // Get the transform parameters from the style's transform matrix
        let matrix = transform
          .match(/^matrix\(([^\(]*)\)$/)[1]
          .split(",")
          .map(Number);
        // Apply the transform to the export map context
        CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
        mapContext.drawImage(canvas, 0, 0);
      }
    });
    let naslov = "Agencija za elektronske komunikacije i poštansku djelatnost";
    let napomena = "Napomena: Operatori su odgovorni za preciznost podataka, a podaci se ažuriraju na kvartalnom nivou.";
    let tekstRazmjera = razmjera.renderedHTML_;
    let n = tekstRazmjera.search(">1 :");
    tekstRazmjera = tekstRazmjera.substr(n + 1, n + 15);
    tekstRazmjera = tekstRazmjera.substr(0, tekstRazmjera.indexOf("<"));
    tekstRazmjera = "Razmjera " + tekstRazmjera;

    mapContext.font = "30px Arial";
    mapContext.fillStyle = "white";
    mapContext.fillRect(0, 0, mapContext.measureText(naslov).width + 20, 50);
    mapContext.fillRect(0, 50, mapContext.measureText(naslov).width + 20, 30);
    mapContext.fillRect(0, 80, mapContext.measureText(razmjera).width + 20, 30);
    mapContext.fillStyle = "black";
    mapContext.fillText(naslov, 10, 30);
    //mapContext.fillRect(0, 50, mapContext.measureText(naslov).width + 20, 30);
    mapContext.font = "15px Arial";
    mapContext.fillText(napomena, 10, 70);
    mapContext.fillText(tekstRazmjera, 10, 100);
    //const width = mapContext.measureText(napomena).width;
    //mapContext.fillText(napomena, mapCanvas.width - width, mapCanvas.height - 30);
    //const widthRazmjera = mapContext.measureText(tekstRazmjera).width;
    //mapContext.fillText(tekstRazmjera,mapCanvas.width - widthRazmjera - 10, mapCanvas.height - 50);

    if (navigator.msSaveBlob) {
      // link download attribuute does not work on MS browsers
      navigator.msSaveBlob(mapCanvas.msToBlob(), "mapa.png");
    } else {
      let link = document.getElementById("image-download");
      link.href = mapCanvas.toDataURL();
      link.click();
    }
  });
  map.renderSync();
}
