(function () {
  const dheerajCanvas = document.getElementById("aadiss-stars-dheeraj");
  if (dheerajCanvas) {
    const dheerajCtx = dheerajCanvas.getContext("2d");

    function dheerajDrawStars() {
      const { innerWidth: dheerajW, innerHeight: dheerajH } = window;
      dheerajCanvas.width = dheerajW;
      dheerajCanvas.height = dheerajH;
      dheerajCtx.clearRect(0, 0, dheerajW, dheerajH);

      for (let dheerajI = 0; dheerajI < 80; dheerajI++) {
        dheerajCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.9})`;
        dheerajCtx.beginPath();
        dheerajCtx.arc(
          Math.random() * dheerajW,
          Math.random() * dheerajH,
          Math.random() * 1.2,
          0, 2 * Math.PI
        );
        dheerajCtx.fill();
      }
    }

    dheerajDrawStars();
    window.addEventListener("resize", dheerajDrawStars);
  }

  document.querySelectorAll('.aadiss-nav-btn').forEach(dheerajBtn => {
    dheerajBtn.addEventListener('click', dheerajE => {
      dheerajE.preventDefault();
      document.querySelectorAll('.aadiss-nav-btn').forEach(dheerajB => dheerajB.classList.remove('aadiss-active'));
      dheerajBtn.classList.add('aadiss-active');

      const dheerajTarget = document.querySelector(dheerajBtn.getAttribute('href'));
      if (dheerajTarget) dheerajTarget.scrollIntoView({ behavior: 'smooth' });
    });
  });

  window.addEventListener("DOMContentLoaded", () => {

    const dheerajSvg = d3.select("#aadiss-viz-petals");
    if (dheerajSvg.empty()) return;

    const dheerajContainer = dheerajSvg.node().parentElement;
    const dheerajContainerWidth = dheerajContainer.getBoundingClientRect().width || 900;
    const dheerajContainerHeight = dheerajContainer.getBoundingClientRect().height || 600;
    const dheerajWidth = dheerajContainerWidth;
    const dheerajHeight = dheerajContainerHeight;

    dheerajSvg.attr("width", dheerajWidth).attr("height", dheerajHeight);

    const dheerajTooltip = d3.select("body").append("div")
      .attr("class", "aadiss-tooltip")
      .attr("id", "aadiss-tooltip-dheeraj")
      .style("opacity", 0);

    const dheerajRootG = dheerajSvg.append("g");
    const dheerajProjection = d3.geoNaturalEarth1()
      .translate([dheerajWidth / 2, dheerajHeight / 2])
      .scale(175);

    const dheerajGeoPath = d3.geoPath(dheerajProjection);
    const dheerajImpacts = ["Low", "Medium", "High"];
    const dheerajImpactColor = d3.scaleOrdinal()
      .domain(dheerajImpacts)
      .range(["#ffd54f", "#ff8a65", "#ef5350"]);

    const dheerajArcGen = d3.arc()
      .innerRadius(dheerajD => dheerajD.innerR)
      .outerRadius(dheerajD => dheerajD.outerR)
      .startAngle(dheerajD => dheerajD.startA)
      .endAngle(dheerajD => dheerajD.endA);

    let dheerajUpdateVizCallback = null;

    Promise.all([
      d3.json("countries-110m.json"),
      d3.csv("space_missions.csv")
    ]).then(([dheerajWorldData, dheerajMissions]) => {

      dheerajMissions.forEach(dheerajD => {
        dheerajD.budget = +dheerajD["Budget (in Billion $)"] || 0;
        dheerajD.success = +dheerajD["Success Rate (%)"] || 0;
        dheerajD.impact = dheerajD["Environmental Impact"];
        dheerajD.tech = dheerajD["Technology Used"];
        dheerajD.country = dheerajD["Country"];
      });

      const dheerajWorld = topojson.feature(dheerajWorldData, dheerajWorldData.objects.countries);
      dheerajRootG.selectAll(".aadiss-country")
        .data(dheerajWorld.features)
        .enter()
        .append("path")
        .attr("class", "aadiss-country")
        .attr("d", dheerajGeoPath);

      const dheerajCentroidByName = new Map();
      dheerajWorld.features.forEach(dheerajF => {
        const dheerajC = dheerajGeoPath.centroid(dheerajF);
        if (isFinite(dheerajC[0]) && isFinite(dheerajC[1])) {
          dheerajCentroidByName.set(dheerajF.properties.name, dheerajC);
        }
      });

      const dheerajFiltered = dheerajMissions.filter(dheerajD => dheerajCentroidByName.has(dheerajD.country));
      const dheerajMissionsByCountry = d3.group(dheerajFiltered, dheerajD => dheerajD.country);
      const dheerajCountryList = Array.from(dheerajMissionsByCountry.keys()).sort();

      const dheerajImpactCounts = [];
      dheerajMissionsByCountry.forEach(dheerajArr =>
        dheerajImpacts.forEach(dheerajImp =>
          dheerajImpactCounts.push(dheerajArr.filter(dheerajM => dheerajM.impact === dheerajImp).length)
        )
      );

      const dheerajRadiusScale = d3.scaleSqrt()
        .domain([0, d3.max(dheerajImpactCounts) || 1])
        .range([0, 35]);

      const dheerajGlyphData = dheerajCountryList.map(dheerajName => {
        const [dheerajCx, dheerajCy] = dheerajCentroidByName.get(dheerajName);
        return { country: dheerajName, cx: dheerajCx, cy: dheerajCy, missions: dheerajMissionsByCountry.get(dheerajName) };
      });

      const dheerajCountryGroups = dheerajRootG.append("g")
        .selectAll(".aadiss-country-glyph")
        .data(dheerajGlyphData)
        .enter()
        .append("g")
        .attr("class", "aadiss-country-glyph")
        .attr("transform", dheerajD => `translate(${dheerajD.cx},${dheerajD.cy})`);

      const dheerajAngleStep = (2 * Math.PI) / dheerajImpacts.length;
      const dheerajAngleCfg = new Map(dheerajImpacts.map((dheerajImp, dheerajI) => {
        const dheerajStartA = -Math.PI / 2 + dheerajI * dheerajAngleStep;
        return [dheerajImp, { startA: dheerajStartA, endA: dheerajStartA + dheerajAngleStep * 0.8 }];
      }));

      dheerajCountryGroups.each(function (dheerajCountryDatum) {
        const dheerajG = d3.select(this);
        const dheerajPetalsData = dheerajImpacts.map(dheerajImp => {
          const dheerajCfg = dheerajAngleCfg.get(dheerajImp);
          const dheerajSubset = dheerajCountryDatum.missions.filter(dheerajM => dheerajM.impact === dheerajImp);
          return {
            country: dheerajCountryDatum.country,
            impact: dheerajImp,
            innerR: 4,
            outerR: dheerajRadiusScale(dheerajSubset.length),
            startA: dheerajCfg.startA,
            endA: dheerajCfg.endA,
            count: dheerajSubset.length,
            totalBudget: d3.sum(dheerajSubset, dheerajM => dheerajM.budget),
            missions: dheerajSubset
          };
        });

        dheerajG.selectAll(".aadiss-petal")
          .data(dheerajPetalsData)
          .enter()
          .append("path")
          .attr("class", "aadiss-petal")
          .attr("fill", dheerajD => dheerajImpactColor(dheerajD.impact))
          .attr("stroke", "rgba(255,255,255,0.6)")
          .attr("stroke-width", 1.2)
          .attr("fill-opacity", 0.8)
          .attr("d", dheerajArcGen)
          .on("mouseover", (dheerajEvent, dheerajD) => {
            d3.select(dheerajEvent.currentTarget)
              .transition().duration(150)
              .attr("transform", "scale(1.15)")
              .attr("stroke-width", 2);

            const dheerajFailRate = dheerajD.missions.length
              ? (100 - d3.mean(dheerajD.missions, dheerajM => dheerajM.success)).toFixed(1)
              : 0;

            const dheerajMessages = {
              Low: "Minimal environmental damage",
              Medium: "Significant pollution & waste",
              High: "Severe environmental destruction"
            };

            dheerajTooltip
              .style("opacity", 1)
              .html(`<strong>${dheerajD.country} — Environmental Cost</strong><br>${dheerajMessages[dheerajD.impact]}<br>💰 Total Waste: $${dheerajD.totalBudget.toFixed(1)}B<br>🚀 Failed Missions: ${dheerajFailRate}%<br>📊 ${dheerajD.count} missions (${dheerajD.impact.toLowerCase()} impact)`)
              .style("left", (dheerajEvent.pageX + 10) + "px")
              .style("top", (dheerajEvent.pageY - 40) + "px");
          })
          .on("mouseout", (dheerajEvent) => {
            d3.select(dheerajEvent.currentTarget)
              .transition().duration(200)
              .attr("transform", "scale(1)")
              .attr("stroke-width", 1.2);
            dheerajTooltip.style("opacity", 0);
          });

        dheerajG.datum({ country: dheerajCountryDatum.country, missions: dheerajCountryDatum.missions, petalsData: dheerajPetalsData });
      });

      function dheerajUpdatePetals() {
        dheerajCountryGroups.selectAll(".aadiss-petal")
          .transition().duration(450)
          .attr("d", dheerajArcGen)
          .attr("fill-opacity", dheerajD => dheerajD.count === 0 ? 0.1 : 0.85)
          .attr("stroke-opacity", dheerajD => (dheerajD.count === 0 ? 0.2 : 0.8));
      }

      dheerajUpdatePetals();

      dheerajUpdateVizCallback = function (dheerajStep) {
        const dheerajActions = [
          () => dheerajRootG.selectAll(".aadiss-petal").classed("aadiss-petal-pulse", true),
          () => dheerajRootG.selectAll(".aadiss-petal").classed("aadiss-petal-pulse", false),
          () => { },
          () => { },
          () => dheerajRootG.selectAll(".aadiss-petal").classed("aadiss-petal-pulse", false)
        ];
        if (dheerajActions[dheerajStep]) dheerajActions[dheerajStep]();
      };

    }).catch(dheerajErr => console.error("Error loading petal data:", dheerajErr));

    let dheerajCurrentStep = -1;
    const dheerajSteps = document.querySelectorAll('.aadiss-step');

    function dheerajUpdateStep(dheerajStepIndex) {
      if (dheerajStepIndex === dheerajCurrentStep) return;
      dheerajCurrentStep = dheerajStepIndex;
      dheerajSteps.forEach((dheerajS, dheerajI) => dheerajS.classList.toggle('aadiss-active', dheerajI === dheerajStepIndex));
      if (dheerajUpdateVizCallback) dheerajUpdateVizCallback(dheerajStepIndex);
    }

    function dheerajHandleScroll() {
      const dheerajMissionsEl = document.getElementById('aadiss-missions');
      if (!dheerajMissionsEl) return;

      const dheerajRect = dheerajMissionsEl.getBoundingClientRect();
      const dheerajWinH = window.innerHeight;
      if (dheerajRect.top > dheerajWinH || dheerajRect.bottom < 0) { dheerajUpdateStep(-1); return; }

      const dheerajProgress = Math.max(0, Math.min(1, (dheerajWinH - dheerajRect.top) / (dheerajWinH + dheerajRect.height)));
      dheerajUpdateStep(Math.min(Math.floor(dheerajProgress * dheerajSteps.length), dheerajSteps.length - 1));
    }

    window.addEventListener('scroll', dheerajHandleScroll);
    setTimeout(dheerajHandleScroll, 100);
  });

  const dheerajORBIT_CSV = "space_decay.csv";
  const dheerajLEO_MAX = 2000;
  const dheerajMEO_MAX = 35786;
  const dheerajCOLORS = { LEO: "#f94144", MEO: "#4d9de0", GEO: "#90be6d" };

  function dheerajGetNumeric(dheerajD, dheerajKeys) {
    for (let dheerajK of dheerajKeys) {
      if (dheerajK in dheerajD && dheerajD[dheerajK] !== "") {
        const dheerajVal = Number(dheerajD[dheerajK]);
        if (!isNaN(dheerajVal)) return dheerajVal;
      }
    }
    return NaN;
  }

  function dheerajClassifyOrbit(dheerajAlt) {
    if (dheerajAlt < dheerajLEO_MAX) return "LEO";
    if (dheerajAlt < dheerajMEO_MAX) return "MEO";
    return "GEO";
  }

  async function dheerajLoadOrbitData() {
    try {
      const dheerajCsv = d3.csvParse(await fetch(dheerajORBIT_CSV).then(dheerajR => dheerajR.text()));
      return dheerajCsv.map(dheerajD => {
        const dheerajApogee = dheerajGetNumeric(dheerajD, ["APOAPSIS", "APOAPSIS_KM", "APOAPSIS (KM)"]);
        const dheerajPerigee = dheerajGetNumeric(dheerajD, ["PERIAPSIS", "PERIAPSIS_KM", "PERIAPSIS (KM)"]);
        const dheerajSma = dheerajGetNumeric(dheerajD, ["SEMIMAJOR_AXIS", "SEMIMAJOR AXIS"]);
        let dheerajAlt = 500;
        if (Number.isFinite(dheerajApogee) && Number.isFinite(dheerajPerigee)) dheerajAlt = (dheerajApogee + dheerajPerigee) / 2;
        else if (Number.isFinite(dheerajApogee)) dheerajAlt = dheerajApogee;
        else if (Number.isFinite(dheerajPerigee)) dheerajAlt = dheerajPerigee;
        else if (Number.isFinite(dheerajSma)) dheerajAlt = dheerajSma - 6371;

        let dheerajRaan = dheerajGetNumeric(dheerajD, ["RA_OF_ASC_NODE", "RAAN"]);
        if (!Number.isFinite(dheerajRaan)) dheerajRaan = Math.random() * 360;

        const dheerajLaunchDate = dheerajD.LAUNCH_DATE || "";
        let dheerajYear = null;
        if (dheerajLaunchDate) {
          const dheerajMatch = dheerajLaunchDate.match(/(\d{4})/);
          if (dheerajMatch) dheerajYear = parseInt(dheerajMatch[1]);
        }

        return {
          alt: dheerajAlt,
          band: dheerajClassifyOrbit(dheerajAlt),
          raan: dheerajRaan,
          name: dheerajD.OBJECT_NAME || "",
          type: dheerajD.OBJECT_TYPE || "",
          country: dheerajD.COUNTRY_CODE || "",
          year: dheerajYear
        };
      });
    } catch {
      return Array.from({ length: 1000 }, (dheerajUndef, dheerajI) => {
        const dheerajAlt = Math.random() * 40000;
        return {
          alt: dheerajAlt,
          band: dheerajClassifyOrbit(dheerajAlt),
          raan: Math.random() * 360,
          name: `Debris-${dheerajI}`,
          type: "Debris",
          country: "Unknown",
          year: 2000 + Math.floor(Math.random() * 26)
        };
      });
    }
  }

  async function dheerajDrawOrbitHeatmap() {
    const dheerajContainer = d3.select("#aadiss-viz-orbit");
    if (dheerajContainer.empty()) return;

    const dheerajAllData = await dheerajLoadOrbitData();
    let dheerajCurrentPeriod = "intro";

    dheerajContainer.selectAll("*").remove();

    const dheerajW = dheerajContainer.node().clientWidth || 800;
    const dheerajH = dheerajContainer.node().clientHeight || 600;
    const dheerajRadius = Math.min(dheerajW, dheerajH) / 2 - 50;

    const dheerajTooltip = dheerajContainer.append("div").attr("class", "aadiss-orbit-tooltip");
    const dheerajSvg = dheerajContainer.append("svg").attr("width", dheerajW).attr("height", dheerajH);
    const dheerajG = dheerajSvg.append("g").attr("transform", `translate(${dheerajW / 2},${dheerajH / 2})`);

    const dheerajMaxAlt = d3.max(dheerajAllData, dheerajD => dheerajD.alt) || 40000;
    const dheerajRScale = d3.scalePow().exponent(0.6).domain([0, dheerajMaxAlt]).range([0, dheerajRadius]);
    const dheerajAngleScale = d3.scaleLinear().domain([0, 360]).range([0, 2 * Math.PI]);

    const dheerajDefs = dheerajSvg.append("defs");
    const dheerajGrad = dheerajDefs.append("radialGradient").attr("id", "aadiss-earth-gradient");
    dheerajGrad.append("stop").attr("offset", "0%").attr("stop-color", "#00b4d8");
    dheerajGrad.append("stop").attr("offset", "100%").attr("stop-color", "#03045e");

    dheerajG.append("circle").attr("r", 25).attr("fill", "url(#aadiss-earth-gradient)");
    dheerajG.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .text("EARTH");

    const dheerajBands = [
      { name: "LEO", r0: 0, r1: dheerajRScale(dheerajLEO_MAX) },
      { name: "MEO", r0: dheerajRScale(dheerajLEO_MAX), r1: dheerajRScale(dheerajMEO_MAX) },
      { name: "GEO", r0: dheerajRScale(dheerajMEO_MAX), r1: dheerajRScale(dheerajMaxAlt) }
    ];

    const dheerajArc = d3.arc().startAngle(0).endAngle(2 * Math.PI);
    dheerajG.selectAll("path.aadiss-orbit-band")
      .data(dheerajBands)
      .join("path")
      .attr("d", dheerajD => dheerajArc({ innerRadius: dheerajD.r0, outerRadius: dheerajD.r1 }))
      .attr("fill", dheerajD =>
        dheerajD.name === "LEO" ? "rgba(255,0,0,0.07)" :
          dheerajD.name === "MEO" ? "rgba(0,150,255,0.05)" :
            "rgba(100,255,100,0.03)"
      )
      .attr("stroke", "#334");

    const dheerajLabelGroup = dheerajG.append("g").attr("class", "aadiss-band-labels");

    const dheerajDebrisCircles = dheerajG.append("g").attr("class", "aadiss-debris-circles");

    function dheerajFilterDataByPeriod(dheerajPeriod) {
      if (dheerajPeriod === "intro" || dheerajPeriod === "conclusion") {
        return dheerajAllData;
      }

      const dheerajPeriodRanges = {
        "2000-2008": [2000, 2008],
        "2009-2016": [2009, 2016],
        "2017-2025": [2017, 2025]
      };

      const [dheerajStart, dheerajEnd] = dheerajPeriodRanges[dheerajPeriod] || [0, 3000];
      return dheerajAllData.filter(dheerajD => dheerajD.year && dheerajD.year >= dheerajStart && dheerajD.year <= dheerajEnd);
    }

    function dheerajUpdateVisualization(dheerajPeriod, dheerajAnimate = true) {
      const dheerajData = dheerajFilterDataByPeriod(dheerajPeriod);

      const dheerajCounts = {
        LEO: dheerajData.filter(dheerajD => dheerajD.band === "LEO").length,
        MEO: dheerajData.filter(dheerajD => dheerajD.band === "MEO").length,
        GEO: dheerajData.filter(dheerajD => dheerajD.band === "GEO").length
      };

      const dheerajZoomConfig = {
        "intro": { scale: 0.85, duration: 1000 },
        "2000-2008": { scale: 1.4, duration: 1200 },
        "2009-2016": { scale: 1.4, duration: 1200 },
        "2017-2025": { scale: 1.4, duration: 1200 },
        "conclusion": { scale: 0.85, duration: 1000 }
      };

      const dheerajZoom = dheerajZoomConfig[dheerajPeriod] || { scale: 1, duration: 800 };

      if (dheerajAnimate) {
        dheerajG.transition()
          .duration(dheerajZoom.duration)
          .attr("transform", `translate(${dheerajW / 2},${dheerajH / 2}) scale(${dheerajZoom.scale})`);
      } else {
        dheerajG.attr("transform", `translate(${dheerajW / 2},${dheerajH / 2}) scale(${dheerajZoom.scale})`);
      }

      const dheerajLabelData = [
        { name: "LEO", r: (dheerajBands[0].r0 + dheerajBands[0].r1) / 2, count: dheerajCounts.LEO, pos: "top" },
        { name: "MEO", r: (dheerajBands[1].r0 + dheerajBands[1].r1) / 2, count: dheerajCounts.MEO, pos: "right" },
        { name: "GEO", r: (dheerajBands[2].r0 + dheerajBands[2].r1) / 2, count: dheerajCounts.GEO, pos: "bottom" }
      ];

      dheerajLabelGroup.selectAll("text.aadiss-band-label")
        .data(dheerajLabelData)
        .join("text")
        .attr("class", "aadiss-band-label")
        .attr("x", dheerajD => dheerajD.pos === "right" ? dheerajD.r + 15 : dheerajD.pos === "left" ? -dheerajD.r - 15 : 0)
        .attr("y", dheerajD => dheerajD.pos === "top" ? -dheerajD.r - 15 : dheerajD.pos === "bottom" ? dheerajD.r + 25 : 5)
        .attr("text-anchor", dheerajD => dheerajD.pos === "right" ? "start" : dheerajD.pos === "left" ? "end" : "middle")
        .attr("fill", dheerajD => dheerajCOLORS[dheerajD.name])
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .transition()
        .duration(dheerajAnimate ? 600 : 0)
        .text(dheerajD => `${dheerajD.name}: ${dheerajD.count.toLocaleString()}`);

      const dheerajCircles = dheerajDebrisCircles.selectAll("circle.aadiss-orbit-object")
        .data(dheerajData, (dheerajD, dheerajI) => dheerajD.name + dheerajI);

      dheerajCircles.exit()
        .each(function() {
          const dheerajCircle = d3.select(this);
          const dheerajD = dheerajCircle.datum();
          if (dheerajAnimate) {
            dheerajCircle
              .transition()
              .duration(200)
              .attr("r", (dheerajD.band === "LEO" ? 2.5 : dheerajD.band === "MEO" ? 2.0 : 1.8) * 1.5)
              .attr("fill-opacity", 0.3)
              .transition()
              .duration(400)
              .attr("r", 0)
              .attr("fill-opacity", 0)
              .remove();
          } else {
            dheerajCircle.remove();
          }
        });

      dheerajCircles
        .transition()
        .duration(dheerajAnimate ? 600 : 0)
        .attr("fill-opacity", dheerajD => dheerajD.band === "LEO" ? 1.0 : dheerajD.band === 'MEO' ? 0.9 : 0.8);

      const dheerajEntering = dheerajCircles.enter()
        .append("circle")
        .attr("class", "aadiss-orbit-object")
        .attr("r", 0)
        .attr("cx", dheerajD => {
          const dheerajΘ = dheerajAngleScale(dheerajD.raan) - Math.PI / 2;
          return dheerajRScale(dheerajD.alt) * Math.cos(dheerajΘ);
        })
        .attr("cy", dheerajD => {
          const dheerajΘ = dheerajAngleScale(dheerajD.raan) - Math.PI / 2;
          return dheerajRScale(dheerajD.alt) * Math.sin(dheerajΘ);
        })
        .attr("fill", dheerajD => dheerajCOLORS[dheerajD.band])
        .attr("fill-opacity", 0)
        .on("mouseover", function(dheerajEvent, dheerajD) {
          const [dheerajMx, dheerajMy] = d3.pointer(dheerajEvent, dheerajContainer.node());
          dheerajTooltip
            .style("left", (dheerajMx + 10) + "px")
            .style("top", (dheerajMy - 10) + "px")
            .style("opacity", 1)
            .html(`<b>⚠️ DEBRIS THREAT</b><br/><strong>Object:</strong> ${dheerajD.name || "Untracked Fragment"}<br/><strong>Origin:</strong> ${dheerajD.country || "Unknown Mission"}<br/><strong>Year:</strong> ${dheerajD.year || "Unknown"}<br/><strong>Risk Zone:</strong> ${dheerajD.band}<br/><strong>Speed:</strong> ~17,500 mph<br/><strong>Altitude:</strong> ${Math.round(dheerajD.alt).toLocaleString()} km`);
        })
        .on("mouseout", () => dheerajTooltip.style("opacity", 0));

      if (dheerajAnimate) {
        dheerajEntering
          .transition()
          .delay((dheerajUndef, dheerajI) => Math.min(dheerajI * 0.3, 800))
          .duration(600)
          .attr("r", dheerajD => dheerajD.band === "LEO" ? 2.5 : dheerajD.band === "MEO" ? 2.0 : 1.8)
          .attr("fill-opacity", dheerajD => dheerajD.band === "LEO" ? 1.0 : dheerajD.band === 'MEO' ? 0.9 : 0.8)
          .transition()
          .duration(200)
          .attr("r", dheerajD => (dheerajD.band === "LEO" ? 2.5 : dheerajD.band === "MEO" ? 2.0 : 1.8) * 1.2)
          .transition()
          .duration(200)
          .attr("r", dheerajD => dheerajD.band === "LEO" ? 2.5 : dheerajD.band === "MEO" ? 2.0 : 1.8);
      } else {
        dheerajEntering
          .attr("r", dheerajD => dheerajD.band === "LEO" ? 2.5 : dheerajD.band === "MEO" ? 2.0 : 1.8)
          .attr("fill-opacity", dheerajD => dheerajD.band === "LEO" ? 1.0 : dheerajD.band === 'MEO' ? 0.9 : 0.8);
      }
    }

    dheerajUpdateVisualization("intro", true);

    function dheerajSetupScrollytelling() {
      const dheerajStorySteps = document.querySelectorAll('.aadiss-story-step');

      if (dheerajStorySteps.length === 0) {
        console.warn('No story steps found! Scrollytelling will not work.');
        return;
      }

      let dheerajCurrentStepIndex = -1;

      function dheerajHandleScrollytellingScroll() {
        const dheerajWindowHeight = window.innerHeight;
        let dheerajActiveIndex = -1;

        dheerajStorySteps.forEach((dheerajStep, dheerajIndex) => {
          const dheerajRect = dheerajStep.getBoundingClientRect();
          const dheerajStepMiddle = dheerajRect.top + dheerajRect.height / 2;
          const dheerajIsInRange = dheerajStepMiddle >= 0 && dheerajStepMiddle <= dheerajWindowHeight * 0.6;

          if (dheerajIsInRange) {
            dheerajActiveIndex = dheerajIndex;
          }
        });

        if (dheerajActiveIndex !== dheerajCurrentStepIndex) {
          dheerajCurrentStepIndex = dheerajActiveIndex;

          dheerajStorySteps.forEach((dheerajStep, dheerajI) => {
            if (dheerajI === dheerajActiveIndex) {
              dheerajStep.classList.add('aadiss-active');
            } else {
              dheerajStep.classList.remove('aadiss-active');
            }
          });

          if (dheerajActiveIndex >= 0 && dheerajActiveIndex < dheerajStorySteps.length) {
            const dheerajNewPeriod = dheerajStorySteps[dheerajActiveIndex].dataset.period;

            if (dheerajNewPeriod !== dheerajCurrentPeriod) {
              dheerajCurrentPeriod = dheerajNewPeriod;
              dheerajUpdateVisualization(dheerajNewPeriod, true);
            }
          }
        }
      }

      window.addEventListener('scroll', dheerajHandleScrollytellingScroll, { passive: true });

      setTimeout(dheerajHandleScrollytellingScroll, 100);
      setTimeout(dheerajHandleScrollytellingScroll, 500);
    }

    setTimeout(dheerajSetupScrollytelling, 200);

    window.addEventListener('resize', () => {
      dheerajDrawOrbitHeatmap();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(dheerajDrawOrbitHeatmap, 100);
      dheerajSetupSingleDescScrollEffects();
    });
  } else {
    setTimeout(dheerajDrawOrbitHeatmap, 100);
    dheerajSetupSingleDescScrollEffects();
  }

  function dheerajSetupSingleDescScrollEffects() {
    const dheerajSingleContainers = document.querySelectorAll('.aadiss-scrolly-container-single');

    if (dheerajSingleContainers.length === 0) {
      console.log('No single-description containers found');
      return;
    }

    console.log(`✅ Found ${dheerajSingleContainers.length} single-description containers`);

    const dheerajAnimatedContainers = new Set();

    function dheerajCheckVisibility() {
      const dheerajWindowHeight = window.innerHeight;
      const dheerajTriggerPoint = dheerajWindowHeight * 0.75;

      dheerajSingleContainers.forEach(dheerajContainer => {
        const dheerajRect = dheerajContainer.getBoundingClientRect();
        const dheerajContainerTop = dheerajRect.top;
        const dheerajContainerBottom = dheerajRect.bottom;

        if (dheerajContainerTop < dheerajTriggerPoint && dheerajContainerBottom > 0) {
          const dheerajWasInView = dheerajContainer.classList.contains('aadiss-in-view');
          dheerajContainer.classList.add('aadiss-in-view');

          if (!dheerajWasInView && !dheerajAnimatedContainers.has(dheerajContainer)) {
            dheerajAnimatedContainers.add(dheerajContainer);
            const dheerajEvent = new CustomEvent('aadiss-scrolly-inview', { detail: { container: dheerajContainer } });
            dheerajContainer.dispatchEvent(dheerajEvent);
          }
        } else {
          dheerajContainer.classList.remove('aadiss-in-view');
        }
      });
    }

    window.addEventListener('scroll', dheerajCheckVisibility, { passive: true });

    setTimeout(dheerajCheckVisibility, 100);
  }

})();
