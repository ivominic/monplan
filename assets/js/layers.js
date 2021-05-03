let wmsDetailedLandUse = createNewImageWmsLayer("Antenski stub", "antenski_stub_v", "ekip:antenski_stub_v", "");

map.addLayer(wmsDetailedLandUse);

document.querySelector("#chkDetailedLandUse").addEventListener("change", function () {
  if (this.checked) {
    map.addLayer(wmsDetailedLandUse);
  } else {
    map.removeLayer(wmsDetailedLandUse);
  }
});

document.querySelector("#chkAllLayers").addEventListener("change", function () {
  if (this.checked) {
    //Čekiraj
    document.querySelector("#chkDetailedLandUse").checked === false && map.addLayer(wmsDetailedLandUse);
    document.querySelector("#chkDetailedLandUse").checked === false &&
      (document.querySelector("#chkDetailedLandUse").checked = true);
  } else {
    //Raščekiraj
    document.querySelector("#chkDetailedLandUse").checked === true && map.removeLayer(wmsDetailedLandUse);
    document.querySelector("#chkDetailedLandUse").checked === true &&
      (document.querySelector("#chkDetailedLandUse").checked = false);
  }
});

document.querySelector("#radioOsm").addEventListener("change", function () {
  map.getLayers().setAt(0, osmBaseMap);
});
document.querySelector("#radioSattelite").addEventListener("change", function () {
  map.getLayers().setAt(0, satteliteBaseMap);
});
document.querySelector("#radioTopo").addEventListener("change", function () {
  map.getLayers().setAt(0, topoBaseMap);
});
document.querySelector("#radioHiker").addEventListener("change", function () {
  map.getLayers().setAt(0, hikerBaseMap);
});
document.querySelector("#radioCadastrial").addEventListener("change", function () {
  map.getLayers().setAt(0, cadastrialBaseMap);
});

/***** LAYER FILTERING  *************/
document.querySelector("#ddlLayersFilter").addEventListener("change", function () {
  showDivFilter(this.value);
});

/**
 * Hides all divs for filter/search, then shows only div for selected layer
 * @param {Selected layer} ddlValue
 */
function showDivFilter(ddlValue) {
  hideAllDivsFilter();
  if (ddlValue === "dnp") {
    document.querySelector("#chkDetailedLandUse").checked === false && map.addLayer(wmsDetailedLandUse);
    document.querySelector("#divDetailedLandUse").style.display = "block";
    document.querySelector("#chkDetailedLandUse").checked = true;
  }
}

function hideAllDivsFilter() {
  document.querySelector("#divDetailedLandUse").style.display = "none";
}

document.querySelector("#btnFilter").addEventListener("click", filterWms);
document.querySelector("#btnShpDownload").addEventListener("click", downloadShp);
document.querySelector("#btnKmlDownload").addEventListener("click", downloadKml);
document.querySelector("#btnExcelDownload").addEventListener("click", downloadExcel);

function downloadShp() {
  downloadShpExcel("SHAPE-ZIP");
}
function downloadKml() {
  downloadShpExcel("KML");
}
function downloadExcel() {
  downloadShpExcel("excel2007");
}

/**
 * Updates wms layers (filters them) based on cql conditions
 */
function filterWms() {
  let ddlValue = document.querySelector("#ddlLayersFilter").value,
    spatialCqlCondition = "",
    attributeCqlCondition = "";
  spatialCqlCondition = createSpatialCqlCondition();
  //Filter by attribute value allowed only if one layer is selected
  ddlValue !== "" && (attributeCqlCondition = createAttributeCqlCondition(ddlValue));
  if (spatialCqlCondition !== "" && attributeCqlCondition !== "") {
    cqlFilterCondition = "(" + spatialCqlCondition + ") AND " + attributeCqlCondition;
  } else {
    cqlFilterCondition = spatialCqlCondition + attributeCqlCondition;
  }
  if (cqlFilterCondition === "") {
    //TODO: consider to restart filter for all layers in this case
    showToast("Uspjeh", "Nije zadat uslov za filtriranje");
    return false;
  }

  if (ddlValue === "") {
    map.getLayers().forEach(function (layer) {
      if (layer instanceof ol.layer.Image) {
        if (layer.get("visible")) {
          let params = layer.getSource().getParams();
          params.CQL_FILTER = cqlFilterCondition;
          layer.getSource().updateParams(params);
        }
      }
    });
  } else {
    if (ddlValue === "dnp") {
      let params = wmsDetailedLandUse.getSource().getParams();
      params.CQL_FILTER = cqlFilterCondition;
      wmsDetailedLandUse.getSource().updateParams(params);
      wfsFilter("winsoft:dnp");
    }
  }
}

/**
 *
 * @param {Downloaded file format: shp (zip), kml or excel} format
 * @param {Workspace and layer name} fullLayerName
 * @param {CQL_FILTER param - condition for layer filtering} cqlCondition
 * @returns
 */
function downloadWfsLayer(format, fullLayerName, cqlCondition) {
  let cqlParam = "";
  cqlCondition !== "" && cqlCondition !== undefined && (cqlParam = "&cql_filter=" + encodeURIComponent(cqlCondition));
  window.open(
    wfsUrl +
      "?version=1.0.0&request=GetFeature&typeName=" +
      fullLayerName +
      "&format_options=CHARSET:UTF-8&outputformat=" +
      format +
      cqlParam,
    "_blank"
  );
  return false;
}

/**
 *
 * @param {File format for downloaded file: shp, kml or excel} format
 * @returns
 */
function downloadShpExcel(format) {
  let ddlValue = document.querySelector("#ddlLayersFilter").value;

  if (ddlValue === "") {
    showToast("Upozorenje", "Potrebno je odabrati lejer koji želite da preuzmete");
    return false;
  }

  if (ddlValue === "dnp") {
    let params = wmsDetailedLandUse.getSource().getParams();
    downloadWfsLayer(format, "winsoft:dnp", params.CQL_FILTER);
  }
}

/**
 * Making filter subcondition - based on attribute values from input fields
 * @param {Selected layer fol filtering} ddlValue
 * @returns
 */
function createAttributeCqlCondition(ddlValue) {
  let retVal = "";

  if (ddlValue === "dnp") {
    document.querySelector("#pretragaASnazivLok").value !== "" &&
      (retVal += "naziv_lok ILIKE '%" + document.querySelector("#pretragaASnazivLok").value + "%' AND ");
    document.querySelector("#pretragaASopstina").value !== "" &&
      (retVal += "opstina ILIKE '%" + document.querySelector("#pretragaASopstina").value + "%' AND ");
    document.querySelector("#pretragaASnazivAs").value !== "" &&
      (retVal += "naziv_as ILIKE '%" + document.querySelector("#pretragaASnazivAs").value + "%' AND ");
    document.querySelector("#pretragaAStip").value !== "" &&
      (retVal += "tip = '" + document.querySelector("#pretragaAStip").value + "' AND ");
    document.querySelector("#pretragaASidAs").value !== "" &&
      (retVal += "id_as = '" + document.querySelector("#pretragaASidAs").value + "' AND ");
    document.querySelector("#pretragaASidOperato").value !== "" &&
      (retVal += "id_operato = '" + document.querySelector("#pretragaASidOperato").value + "' AND ");
  }

  retVal.length > 5 && (retVal = retVal.substring(0, retVal.length - 5));
  return retVal;
}
