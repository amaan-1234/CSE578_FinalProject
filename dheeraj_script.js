(function () {
  const canvas = document.getElementById("stars-dheeraj");
  if (canvas) {
    const ctx = canvas.getContext("2d");

    function drawStars() {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.9})`;
        ctx.beginPath();
        ctx.arc(
          Math.random() * w,
          Math.random() * h,
          Math.random() * 1.2,
          0, 2 * Math.PI
        );
        ctx.fill();
      }
    }

    drawStars();
    window.addEventListener("resize", drawStars);
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = document.querySelector(btn.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });


  window.addEventListener("DOMContentLoaded", () => {

    const svg = d3.select("#viz-petals");
    if (svg.empty()) return;

    const width = +svg.attr("width") || 1000;
    const height = +svg.attr("height") || 600;

    // Unique tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .attr("id", "tooltip-dheeraj")
      .style("opacity", 0);

    const rootG = svg.append("g");
    const projection = d3.geoNaturalEarth1()
      .translate([width / 2, height / 2])
      .scale(175);

    const geoPath = d3.geoPath(projection);
    const impacts = ["Low", "Medium", "High"];
    const impactColor = d3.scaleOrdinal()
      .domain(impacts)
      .range(["#ffd54f", "#ff8a65", "#ef5350"]);

    const arcGen = d3.arc()
      .innerRadius(d => d.innerR)
      .outerRadius(d => d.outerR)
      .startAngle(d => d.startA)
      .endAngle(d => d.endA);

    // Internal state for visualization updates
    let updateVizCallback = null;

    Promise.all([
      d3.json("countries-110m.json"),
      d3.csv("space_missions.csv")
    ]).then(([worldData, missions]) => {

      missions.forEach(d => {
        d.budget = +d["Budget (in Billion $)"] || 0;
        d.success = +d["Success Rate (%)"] || 0;
        d.impact = d["Environmental Impact"];
        d.tech = d["Technology Used"];
        d.country = d["Country"];
      });

      const world = topojson.feature(worldData, worldData.objects.countries);
      rootG.selectAll(".country")
        .data(world.features)
        .enter()
        .append("path")
        .attr("class", "country")
        .attr("d", geoPath);

      const centroidByName = new Map();
      world.features.forEach(f => {
        const c = geoPath.centroid(f);
        if (isFinite(c[0]) && isFinite(c[1])) {
          centroidByName.set(f.properties.name, c);
        }
      });

      const filtered = missions.filter(d => centroidByName.has(d.country));
      const missionsByCountry = d3.group(filtered, d => d.country);
      const countryList = Array.from(missionsByCountry.keys()).sort();

      const impactCounts = [];
      missionsByCountry.forEach(arr =>
        impacts.forEach(imp =>
          impactCounts.push(arr.filter(m => m.impact === imp).length)
        )
      );

      const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(impactCounts) || 1])
        .range([0, 35]);

      const glyphData = countryList.map(name => {
        const [cx, cy] = centroidByName.get(name);
        return { country: name, cx, cy, missions: missionsByCountry.get(name) };
      });

      const countryGroups = rootG.append("g")
        .selectAll(".country-glyph")
        .data(glyphData)
        .enter()
        .append("g")
        .attr("class", "country-glyph")
        .attr("transform", d => `translate(${d.cx},${d.cy})`);

      const angleStep = (2 * Math.PI) / impacts.length;
      const angleCfg = new Map(impacts.map((imp, i) => {
        const startA = -Math.PI / 2 + i * angleStep;
        return [imp, { startA, endA: startA + angleStep * 0.8 }];
      }));

      countryGroups.each(function (countryDatum) {
        const g = d3.select(this);
        const petalsData = impacts.map(imp => {
          const cfg = angleCfg.get(imp);
          const subset = countryDatum.missions.filter(m => m.impact === imp);
          return {
            country: countryDatum.country,
            impact: imp,
            innerR: 4,
            outerR: radiusScale(subset.length),
            startA: cfg.startA,
            endA: cfg.endA,
            count: subset.length,
            totalBudget: d3.sum(subset, m => m.budget),
            missions: subset
          };
        });

        g.selectAll(".petal")
          .data(petalsData)
          .enter()
          .append("path")
          .attr("class", "petal")
          .attr("fill", d => impactColor(d.impact))
          .attr("stroke", "rgba(255,255,255,0.6)")
          .attr("stroke-width", 1.2)
          .attr("fill-opacity", 0.8)
          .attr("d", arcGen)
          .on("mouseover", (event, d) => {
            d3.select(event.currentTarget)
              .transition().duration(150)
              .attr("transform", "scale(1.15)")
              .attr("stroke-width", 2);

            const failRate = d.missions.length
              ? (100 - d3.mean(d.missions, m => m.success)).toFixed(1)
              : 0;

            const messages = {
              Low: "Minimal environmental damage",
              Medium: "Significant pollution & waste",
              High: "Severe environmental destruction"
            };

            tooltip
              .style("opacity", 1)
              .html(`<strong>${d.country} — Environmental Cost</strong><br>${messages[d.impact]}<br>💰 Total Waste: $${d.totalBudget.toFixed(1)}B<br>🚀 Failed Missions: ${failRate}%<br>📊 ${d.count} missions (${d.impact.toLowerCase()} impact)`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 40) + "px");
          })
          .on("mouseout", (event) => {
            d3.select(event.currentTarget)
              .transition().duration(200)
              .attr("transform", "scale(1)")
              .attr("stroke-width", 1.2);
            tooltip.style("opacity", 0);
          });

        g.datum({ country: countryDatum.country, missions: countryDatum.missions, petalsData });
      });

      function updatePetals() {
        countryGroups.selectAll(".petal")
          .transition().duration(450)
          .attr("d", arcGen)
          .attr("fill-opacity", d => d.count === 0 ? 0.1 : 0.85)
          .attr("stroke-opacity", d => (d.count === 0 ? 0.2 : 0.8));
      }

      updatePetals();

      updateVizCallback = function (step) {
        const actions = [
          () => rootG.selectAll(".petal").classed("petal-pulse", true),
          () => rootG.selectAll(".petal").classed("petal-pulse", false),
          () => { },
          () => { },
          () => rootG.selectAll(".petal").classed("petal-pulse", false)
        ];
        if (actions[step]) actions[step]();
      };


    }).catch(err => console.error("Error loading petal data:", err));

    let currentStep = -1;
    const steps = document.querySelectorAll('.step');

    function updateStep(stepIndex) {
      if (stepIndex === currentStep) return;
      currentStep = stepIndex;
      steps.forEach((s, i) => s.classList.toggle('active', i === stepIndex));
      if (updateVizCallback) updateVizCallback(stepIndex);
    }

    function handleScroll() {
      const missionsEl = document.getElementById('missions');
      if (!missionsEl) return;

      const rect = missionsEl.getBoundingClientRect();
      const winH = window.innerHeight;
      if (rect.top > winH || rect.bottom < 0) { updateStep(-1); return; }

      const progress = Math.max(0, Math.min(1, (winH - rect.top) / (winH + rect.height)));
      updateStep(Math.min(Math.floor(progress * steps.length), steps.length - 1));
    }

    window.addEventListener('scroll', handleScroll);
    setTimeout(handleScroll, 100);
  });


  const ORBIT_CSV = "space_decay.csv";
  const LEO_MAX = 2000;
  const MEO_MAX = 35786;
  const COLORS = { LEO: "#f94144", MEO: "#4d9de0", GEO: "#90be6d" };

  function getNumeric(d, keys) {
    for (let k of keys) {
      if (k in d && d[k] !== "") {
        const val = Number(d[k]);
        if (!isNaN(val)) return val;
      }
    }
    return NaN;
  }

  function classifyOrbit(alt) {
    if (alt < LEO_MAX) return "LEO";
    if (alt < MEO_MAX) return "MEO";
    return "GEO";
  }

  async function loadOrbitData() {
    try {
      const csv = d3.csvParse(await fetch(ORBIT_CSV).then(r => r.text()));
      return csv.map(d => {
        const apogee = getNumeric(d, ["APOAPSIS", "APOAPSIS_KM", "APOAPSIS (KM)"]);
        const perigee = getNumeric(d, ["PERIAPSIS", "PERIAPSIS_KM", "PERIAPSIS (KM)"]);
        const sma = getNumeric(d, ["SEMIMAJOR_AXIS", "SEMIMAJOR AXIS"]);
        let alt = 500;
        if (Number.isFinite(apogee) && Number.isFinite(perigee)) alt = (apogee + perigee) / 2;
        else if (Number.isFinite(apogee)) alt = apogee;
        else if (Number.isFinite(perigee)) alt = perigee;
        else if (Number.isFinite(sma)) alt = sma - 6371;

        let raan = getNumeric(d, ["RA_OF_ASC_NODE", "RAAN"]);
        if (!Number.isFinite(raan)) raan = Math.random() * 360;

        return {
          alt,
          band: classifyOrbit(alt),
          raan,
          name: d.OBJECT_NAME || "",
          type: d.OBJECT_TYPE || "",
          country: d.COUNTRY_CODE || ""
        };
      });
    } catch {
      return Array.from({ length: 1000 }, (_, i) => {
        const alt = Math.random() * 40000;
        return {
          alt,
          band: classifyOrbit(alt),
          raan: Math.random() * 360,
          name: `Debris-${i}`,
          type: "Debris",
          country: "Unknown"
        };
      });
    }
  }


  async function drawOrbitHeatmap() {
    const container = d3.select("#viz-orbit");
    if (container.empty()) return;

    const data = await loadOrbitData();

    const counts = {
      LEO: data.filter(d => d.band === "LEO").length,
      MEO: data.filter(d => d.band === "MEO").length,
      GEO: data.filter(d => d.band === "GEO").length
    };

    container.selectAll("*").remove();

    const w = container.node().clientWidth || 800;
    const h = container.node().clientHeight || 600;
    const radius = Math.min(w, h) / 2 - 50;

    const tooltip = container.append("div").attr("class", "orbit-tooltip");
    const svg = container.append("svg").attr("width", w).attr("height", h);
    const g = svg.append("g").attr("transform", `translate(${w / 2},${h / 2})`);

    const maxAlt = d3.max(data, d => d.alt) || 40000;
    const rScale = d3.scalePow().exponent(0.6).domain([0, maxAlt]).range([0, radius]);
    const angleScale = d3.scaleLinear().domain([0, 360]).range([0, 2 * Math.PI]);

    const defs = svg.append("defs");
    const grad = defs.append("radialGradient").attr("id", "earth-gradient");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#00b4d8");
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#03045e");

    g.append("circle").attr("r", 25).attr("fill", "url(#earth-gradient)");
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .text("EARTH");

    const bands = [
      { name: "LEO", r0: 0, r1: rScale(LEO_MAX), val: counts.LEO },
      { name: "MEO", r0: rScale(LEO_MAX), r1: rScale(MEO_MAX), val: counts.MEO },
      { name: "GEO", r0: rScale(MEO_MAX), r1: rScale(maxAlt), val: counts.GEO }
    ];

    const arc = d3.arc().startAngle(0).endAngle(2 * Math.PI);
    g.selectAll("path.orbit-band")
      .data(bands)
      .join("path")
      .attr("d", d => arc({ innerRadius: d.r0, outerRadius: d.r1 }))
      .attr("fill", d =>
        d.name === "LEO" ? "rgba(255,0,0,0.07)" :
          d.name === "MEO" ? "rgba(0,150,255,0.05)" :
            "rgba(100,255,100,0.03)"
      )
      .attr("stroke", "#334");

    g.selectAll("circle.orbit-object")
      .data(data)
      .join("circle")
      .attr("r", 0)
      .attr("cx", d => {
        const θ = angleScale(d.raan) - Math.PI / 2;
        return rScale(d.alt) * Math.cos(θ);
      })
      .attr("cy", d => {
        const θ = angleScale(d.raan) - Math.PI / 2;
        return rScale(d.alt) * Math.sin(θ);
      })
      .attr("fill", d => COLORS[d.band])
      .attr("fill-opacity", d => d.band === "LEO" ? 1.0 : d.band === 'MEO' ? 0.9 : 0.8)
      .on("mouseover", (event, d) => {
        const [mx, my] = d3.pointer(event, container.node());
        tooltip
          .style("left", (mx + 10) + "px")
          .style("top", (my - 10) + "px")
          .style("opacity", 1)
          .html(`<b>⚠️ DEBRIS THREAT</b><br/><strong>Object:</strong> ${d.name || "Untracked Fragment"}<br/><strong>Origin:</strong> ${d.country || "Unknown Mission"}<br/><strong>Risk Zone:</strong> ${d.band}<br/><strong>Speed:</strong> ~17,500 mph<br/><strong>Altitude:</strong> ${Math.round(d.alt).toLocaleString()} km`);
      })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .transition()
      .delay((d, i) => i * 1.5)
      .duration(1200)
      .attr("r", d => d.band === "LEO" ? 2.5 : d.band === "MEO" ? 2.0 : 1.8);

    const labelData = [
      { name: "LEO", r: (bands[0].r0 + bands[0].r1) / 2, count: counts.LEO, pos: "top" },
      { name: "MEO", r: (bands[1].r0 + bands[1].r1) / 2, count: counts.MEO, pos: "right" },
      { name: "GEO", r: (bands[2].r0 + bands[2].r1) / 2, count: counts.GEO, pos: "bottom" }
    ];

    g.selectAll("text.band-label")
      .data(labelData)
      .join("text")
      .attr("x", d => d.pos === "right" ? d.r + 15 : d.pos === "left" ? -d.r - 15 : 0)
      .attr("y", d => d.pos === "top" ? -d.r - 15 : d.pos === "bottom" ? d.r + 25 : 5)
      .attr("text-anchor", d => d.pos === "right" ? "start" : d.pos === "left" ? "end" : "middle")
      .attr("fill", d => COLORS[d.name])
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(d => `${d.name}: ${d.count.toLocaleString()}`);

    let currentDebrisStep = -1;
    const debrisSteps = document.querySelectorAll('.debris-step');
    let baseTransform = `translate(${w / 2},${h / 2})`;

    function updateDebrisVisualization(zone) {
      const zoneConfig = {
        'overview': { scale: 1, highlight: null },
        'LEO': { scale: 2.5, highlight: 'LEO' },
        'MEO': { scale: 1.8, highlight: 'MEO' },
        'GEO': { scale: 1.3, highlight: 'GEO' },
        'future': { scale: 1, highlight: null }
      };

      const { scale, highlight: highlightBand } = zoneConfig[zone] || { scale: 1, highlight: null };

      g.transition().duration(800).attr('transform', `${baseTransform} scale(${scale})`);

      g.selectAll('circle.orbit-object')
        .transition().duration(600)
        .attr('fill-opacity', d => {
          if (!highlightBand) return d.band === 'LEO' ? 1.0 : d.band === 'MEO' ? 0.9 : 0.8;
          return d.band === highlightBand ? 1.0 : 0.3;
        })
        .attr('r', d => {
          const baseSize = d.band === 'LEO' ? 2.5 : d.band === 'MEO' ? 2.0 : 1.8;
          if (!highlightBand) return baseSize;
          return d.band === highlightBand ? baseSize * 1.2 : baseSize * 0.6;
        });
    }

    function updateDebrisStep(stepIndex) {
      if (stepIndex === currentDebrisStep) return;
      currentDebrisStep = stepIndex;

      debrisSteps.forEach((step, i) => {
        step.classList.toggle('active', i === stepIndex);
      });

      if (stepIndex >= 0 && stepIndex < debrisSteps.length) {
        const zone = debrisSteps[stepIndex].dataset.zone;
        updateDebrisVisualization(zone);
      }
    }

    function handleDebrisScroll() {
      const debrisSection = document.getElementById('debris');
      if (!debrisSection) return;

      const rect = debrisSection.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top > windowHeight || rect.bottom < 0) {
        updateDebrisStep(-1);
        return;
      }

      const headerHeight = document.querySelector('.viz2-header') ? document.querySelector('.viz2-header').offsetHeight : 0;
      const scrollInSection = Math.max(0, windowHeight - rect.top - headerHeight);
      const sectionHeight = debrisSteps.length * windowHeight;
      const scrollProgress = scrollInSection / sectionHeight;
      const stepIndex = Math.floor(scrollProgress * debrisSteps.length);
      updateDebrisStep(Math.min(stepIndex, debrisSteps.length - 1));
    }

    window.addEventListener('scroll', handleDebrisScroll);
    handleDebrisScroll();
  }

  setTimeout(drawOrbitHeatmap, 100);

  window.addEventListener("resize", () => {
    // drawStars(); // drawStars is not accessible here unless we move it out or expose it. 
    // But we attached resize listener for drawStars inside the if(canvas) block.
    // So we just need to re-draw orbit heatmap.
    drawOrbitHeatmap();
  });

})();
