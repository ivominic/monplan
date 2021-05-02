let antenskiStub = createNewImageWmsLayer("Antenski stub", "antenski_stub_v", "ekip:antenski_stub_v", "");

map.addLayer(antenskiStub);

document.querySelector("#chkDLU").addEventListener("change", function () {
  if (this.checked) {
    map.addLayer(antenskiStub);
  } else {
    map.removeLayer(antenskiStub);
  }
});

document.querySelector("#chkAllLayers").addEventListener("change", function () {
  if (this.checked) {
    //Čekiraj
    document.querySelector("#chkDLU").checked === false && map.addLayer(antenskiStub);
    document.querySelector("#chkDLU").checked === false && (document.querySelector("#chkDLU").checked = true);
  } else {
    //Raščekiraj
    document.querySelector("#chkDLU").checked === true && map.removeLayer(antenskiStub);
    document.querySelector("#chkDLU").checked === true && (document.querySelector("#chkDLU").checked = false);
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

/***** PRETRAGA LEJERA */
document.querySelector("#ddlLejerPretraga").addEventListener("change", function () {
  prikaziDivPretraga(this.value);
});

function prikaziDivPretraga(ddlValue) {
  sakrijSveDivPretrage();
  if (ddlValue === "antenskiStub") {
    document.querySelector("#chkAntenskiStub").checked === false && map.addLayer(antenskiStub);
    document.querySelector("#divAntenskiStub").style.display = "block";
    document.querySelector("#chkAntenskiStub").checked = true;
  }
}

function sakrijSveDivPretrage() {
  document.querySelector("#divAntenskiStub").style.display = "none";
}

/*** FILTRIRANJE */

/**Povezivanje kontrola koje zavise od lejera sa akcijama */
document.querySelector("#btnFilter").addEventListener("click", filtriranje);
/**Download shp i kml fajlova - vidljivo agenciji i administratorima*/
document.querySelector("#btnShpDownload").addEventListener("click", downloadJavniShp);
document.querySelector("#btnKmlDownload").addEventListener("click", downloadJavniKml);
document.querySelector("#btnExcelDownload").addEventListener("click", downloadJavniExcel);
function downloadJavniShp() {
  downloadShpExcel("SHAPE-ZIP");
}
function downloadJavniKml() {
  downloadShpExcel("KML");
}
function downloadJavniExcel() {
  downloadShpExcel("excel2007");
}

function filtriranje() {
  let ddlValue = document.querySelector("#ddlLejerPretraga").value,
    prostorniFilter = "",
    atributniFilter = "";
  prostorniFilter = kreiranjeCqlFilteraProstorno();
  //Atributi se pretražuju samo ako je odabran lejer. Za sve lejere se radi samo prostorna selekcija
  ddlValue !== "" && (atributniFilter = kreiranjeCqlFilteraAtributiZaJavnuStranicu(ddlValue));
  if (prostorniFilter !== "" && atributniFilter !== "") {
    cqlFilter = "(" + prostorniFilter + ") AND " + atributniFilter;
  } else {
    cqlFilter = prostorniFilter + atributniFilter;
  }
  if (cqlFilter === "") {
    return false;
  }

  if (ddlValue === "") {
    map.getLayers().forEach(function (layer) {
      if (layer instanceof ol.layer.Image) {
        if (layer.get("visible")) {
          let params = layer.getSource().getParams();
          params.CQL_FILTER = cqlFilter;
          layer.getSource().updateParams(params);
        }
      }
    });
  } else {
    if (ddlValue === "antenskiStub") {
      let params = antenskiStub.getSource().getParams();
      params.CQL_FILTER = cqlFilter;
      antenskiStub.getSource().updateParams(params);
      wfsFilter("ekip:antenski_stub_v");
    }
  }
}

function wfsDownloadLejeraJavni(format, fulllayername, filterCql) {
  let dodajCqlFilter = "";
  filterCql !== "" && filterCql !== undefined && (dodajCqlFilter = "&cql_filter=" + encodeURIComponent(filterCql));
  window.open(
    wfsUrl +
      "?version=1.0.0&request=GetFeature&typeName=" +
      fulllayername +
      "&format_options=CHARSET:UTF-8&outputformat=" +
      format +
      dodajCqlFilter,
    "_blank"
  );
  return false;
}

function downloadShpExcel(format) {
  let ddlValue = document.querySelector("#ddlLejerPretraga").value;

  if (ddlValue === "") {
    poruka("Upozorenje", "Potrebno je odabrati lejer koji želite da preuzmete");
    return false;
  }

  if (ddlValue === "antenskiStub") {
    let params = antenskiStub.getSource().getParams();
    wfsDownloadLejeraJavni(format, "ekip:antenski_stub_v", params.CQL_FILTER);
  }
}

/** Filtriranje po atributima */
function kreiranjeCqlFilteraAtributiZaJavnuStranicu(ddlValue) {
  let retVal = "";

  if (ddlValue === "antenskiStub") {
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
