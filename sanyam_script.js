(function () {
    const sanyamRootA = d3.select("#aadiss-vis-container-1");
    const sanyamRootB = d3.select("#aadiss-vis-container-2");

    const sanyamInfoBox = d3.select("body").append("div")
        .attr("class", "aadiss-tooltip")
        .attr("id", "aadiss-info-box-custom")
        .style("opacity", 0);

    const sanyamPad = { t: 60, r: 40, b: 60, l: 60 };

    const sanyamSetSize = (sanyamSel) => {
        if (sanyamSel.node() && !sanyamSel.style("width")) {
            sanyamSel.style("width", "100%").style("height", "800px");
        }
    };
    sanyamSetSize(sanyamRootA);
    sanyamSetSize(sanyamRootB);

    const sanyamGetDim = (sanyamN) => sanyamN.node() ? sanyamN.node().getBoundingClientRect() : { width: 800, height: 800 };

    const sanyamDimA = sanyamGetDim(sanyamRootA);
    const sanyamWA = sanyamDimA.width - sanyamPad.l - sanyamPad.r;
    const sanyamHA = sanyamDimA.height - sanyamPad.t - sanyamPad.b;

    const sanyamCanvasA = sanyamRootA.append("svg")
        .attr("width", sanyamDimA.width)
        .attr("height", sanyamDimA.height)
        .append("g")
        .attr("transform", `translate(${sanyamPad.l}, ${sanyamPad.t})`);

    const sanyamDimB = sanyamGetDim(sanyamRootB);
    const sanyamWB = sanyamDimB.width - sanyamPad.l - sanyamPad.r;
    const sanyamHB = sanyamDimB.height - sanyamPad.t - sanyamPad.b;

    const sanyamCanvasB = sanyamRootB.append("svg")
        .attr("width", sanyamDimB.width)
        .attr("height", sanyamDimB.height)
        .append("g")
        .attr("transform", `translate(${sanyamPad.l}, ${sanyamPad.t})`);

    const sanyamPalette = d3.scaleOrdinal(d3.schemeCategory10);

    const sanyamShowInfo = (sanyamE, sanyamContent) => {
        sanyamInfoBox.html(sanyamContent)
            .style("left", `${sanyamE.pageX + 10}px`)
            .style("top", `${sanyamE.pageY - 28}px`)
            .style("opacity", 1);
    };

    const sanyamHideInfo = () => sanyamInfoBox.style("opacity", 0);

    const sanyamExtractRegion = (sanyamStr) => {
        if (!sanyamStr) return "Unknown";
        const sanyamSegs = sanyamStr.split(',');
        const sanyamLast = sanyamSegs.pop().trim();
        const sanyamMains = ["USA", "Russia", "China", "Japan", "India", "France"];
        if (sanyamMains.includes(sanyamLast)) return sanyamLast;
        return sanyamLast === "Kazakhstan" ? "Russia" : (sanyamLast === "French Guiana" ? "France" : sanyamLast);
    };

    const sanyamExtractTime = (sanyamD) => {
        const sanyamVal = new Date(sanyamD).getFullYear();
        return isNaN(sanyamVal) ? null : Math.floor(sanyamVal / 10) * 10;
    };

    const sanyamRenderRelations = (sanyamDataset) => {
        sanyamCanvasA.selectAll("*").remove();
        const sanyamUniq = [...new Set(sanyamDataset.map(sanyamX => sanyamX.source)), ...new Set(sanyamDataset.map(sanyamX => sanyamX.target))];
        const sanyamIdxMap = new Map(sanyamUniq.map((sanyamU, sanyamI) => [sanyamU, sanyamI]));
        const sanyamGrid = Array.from({ length: sanyamUniq.length }, () => new Array(sanyamUniq.length).fill(0));

        sanyamDataset.forEach(sanyamX => {
            const sanyamS = sanyamIdxMap.get(sanyamX.source);
            const sanyamT = sanyamIdxMap.get(sanyamX.target);
            if (sanyamS !== undefined && sanyamT !== undefined && sanyamX.value > 1) sanyamGrid[sanyamS][sanyamT] = sanyamX.value;
        });

        const sanyamROut = Math.min(sanyamWA, sanyamHA) / 2 - 40;
        const sanyamRIn = sanyamROut - 20;

        const sanyamLayout = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(sanyamGrid);
        const sanyamArcGen = d3.arc().innerRadius(sanyamRIn).outerRadius(sanyamROut);
        const sanyamRibGen = d3.ribbon().radius(sanyamRIn);

        const sanyamCore = sanyamCanvasA.append("g").attr("transform", `translate(${sanyamWA / 2}, ${sanyamHA / 2})`);

        const sanyamNodes = sanyamCore.append("g").selectAll("g").data(sanyamLayout.groups).join("g");

        sanyamNodes.append("path")
            .attr("class", "aadiss-chord-arc")
            .attr("d", sanyamArcGen)
            .attr("fill", sanyamD => sanyamPalette(sanyamUniq[sanyamD.index]))
            .attr("stroke", sanyamD => d3.rgb(sanyamPalette(sanyamUniq[sanyamD.index])))
            .on("mouseenter", function(sanyamE, sanyamD) {
                d3.select(this).style("opacity", 1);
                sanyamCore.selectAll(".aadiss-chord-path").style("opacity", sanyamP =>
                    sanyamP.source.index === sanyamD.index || sanyamP.target.index === sanyamD.index ? 1 : 0.1
                );
                sanyamShowInfo(sanyamE, `<strong>${sanyamUniq[sanyamD.index]}</strong><br>Total: ${sanyamD.value.toLocaleString()} missions`);
            })
            .on("mousemove", (sanyamE, sanyamD) => sanyamShowInfo(sanyamE, `<strong>${sanyamUniq[sanyamD.index]}</strong><br>Total: ${sanyamD.value.toLocaleString()} missions`))
            .on("mouseleave", function() {
                d3.select(this).style("opacity", 1);
                sanyamCore.selectAll(".aadiss-chord-path").style("opacity", 1);
                sanyamHideInfo();
            });

        sanyamNodes.append("text")
            .attr("class", "aadiss-chord-label")
            .each(sanyamD => { sanyamD.mid = (sanyamD.startAngle + sanyamD.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", sanyamD => `rotate(${(sanyamD.mid * 180 / Math.PI - 90)}) translate(${(sanyamROut + 10)}) ${sanyamD.mid > Math.PI ? "rotate(180)" : ""}`)
            .attr("text-anchor", sanyamD => sanyamD.mid > Math.PI ? "end" : null)
            .text(sanyamD => sanyamUniq[sanyamD.index]);

        sanyamCore.append("g")
            .attr("fill-opacity", 0.7)
            .selectAll("path")
            .data(sanyamLayout)
            .join("path")
            .attr("class", "aadiss-chord-path")
            .attr("d", sanyamRibGen)
            .attr("fill", sanyamD => sanyamPalette(sanyamUniq[sanyamD.source.index]))
            .on("mouseenter", function(sanyamE, sanyamD) {
                d3.select(this).raise();
                sanyamShowInfo(sanyamE, `<strong>${sanyamUniq[sanyamD.source.index]} → ${sanyamUniq[sanyamD.target.index]}</strong><br>Missions: ${sanyamD.source.value.toLocaleString()}`);
            })
            .on("mousemove", (sanyamE, sanyamD) => sanyamShowInfo(sanyamE, `<strong>${sanyamUniq[sanyamD.source.index]} → ${sanyamUniq[sanyamD.target.index]}</strong><br>Missions: ${sanyamD.source.value.toLocaleString()}`))
            .on("mouseleave", sanyamHideInfo);
    };

    const sanyamRenderDefense = (sanyamStats, sanyamObjs) => {
        sanyamCanvasB.selectAll("*").remove();

        const sanyamDefs = sanyamCanvasB.append("defs");
        const sanyamFilter = sanyamDefs.append("filter").attr("id", "aadiss-shield-glow");
        sanyamFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
        const sanyamFeMerge = sanyamFilter.append("feMerge");
        sanyamFeMerge.append("feMergeNode").attr("in", "coloredBlur");
        sanyamFeMerge.append("feMergeNode").attr("in", "SourceGraphic");

        const sanyamRadialGrad = sanyamDefs.append("radialGradient").attr("id", "aadiss-heatmap-gradient");
        sanyamRadialGrad.append("stop").attr("offset", "0%").attr("stop-color", "#22c55e").attr("stop-opacity", "0.8");
        sanyamRadialGrad.append("stop").attr("offset", "50%").attr("stop-color", "#eab308").attr("stop-opacity", "0.6");
        sanyamRadialGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444").attr("stop-opacity", "0.4");

        const sanyamBase = sanyamCanvasB.append("g").attr("transform", `translate(${sanyamWB / 2}, ${sanyamHB / 2})`);
        const sanyamRMax = Math.min(sanyamWB, sanyamHB) / 2 - 40;

        const sanyamScaleR = d3.scaleLinear().domain(d3.extent(sanyamStats, sanyamS => sanyamS.Decade)).range([sanyamRMax * 0.25, sanyamRMax * 0.85]);
        const sanyamScaleD = d3.scaleLinear().domain([0, d3.max(sanyamObjs, sanyamO => sanyamO.dist)]).range([sanyamScaleR.range()[1] + 15, sanyamRMax * 0.95]);
        const sanyamScaleS = d3.scaleLinear().domain(d3.extent(sanyamObjs, sanyamO => sanyamO.mag)).range([6, 2]);

        const sanyamColMap = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.3, 1.0]);

        const sanyamZones = sanyamBase.selectAll(".aadiss-shield-ring-group").data(sanyamStats.slice().reverse()).join("g");

        sanyamZones.append("circle")
            .attr("class", "aadiss-shield-ring")
            .attr("r", 0)
            .attr("fill", sanyamD => sanyamColMap(sanyamD.Rate))
            .attr("stroke", sanyamD => d3.rgb(sanyamColMap(sanyamD.Rate)).brighter(0.5))
            .attr("stroke-width", 2)
            .attr("fill-opacity", sanyamD => 0.15 + (sanyamD.Rate * 0.25))
            .style("pointer-events", "all")
            .style("filter", "url(#aadiss-shield-glow)")
            .on("mouseenter", function(sanyamE, sanyamD) {
                sanyamE.stopPropagation();
                d3.select(this).transition().duration(200).attr("fill-opacity", 0.35 + (sanyamD.Rate * 0.35));
                sanyamShowInfo(sanyamE, `<strong>${sanyamD.Decade}s</strong><br>Success Rate: ${(sanyamD.Rate * 100).toFixed(1)}%<br>Successful: ${sanyamD.Success} | Failed: ${sanyamD.Failure}`);
            })
            .on("mousemove", (sanyamE, sanyamD) => {
                sanyamE.stopPropagation();
                sanyamShowInfo(sanyamE, `<strong>${sanyamD.Decade}s</strong><br>Success Rate: ${(sanyamD.Rate * 100).toFixed(1)}%<br>Successful: ${sanyamD.Success} | Failed: ${sanyamD.Failure}`);
            })
            .on("mouseleave", function(sanyamE, sanyamD) {
                sanyamE.stopPropagation();
                d3.select(this).transition().duration(200).attr("fill-opacity", 0.15 + (sanyamD.Rate * 0.25));
                sanyamHideInfo();
            })
            .transition().duration(1000).delay((sanyamD, sanyamI) => (sanyamStats.length - 1 - sanyamI) * 150)
            .attr("r", sanyamD => sanyamScaleR(sanyamD.Decade));

        sanyamZones.append("text")
            .attr("class", "aadiss-decade-label")
            .attr("y", sanyamD => -sanyamScaleR(sanyamD.Decade) - 5)
            .attr("opacity", 0)
            .text(sanyamD => sanyamD.Decade + "s")
            .transition().duration(500).delay((sanyamD, sanyamI) => (sanyamStats.length - 1 - sanyamI) * 150 + 1000)
            .attr("opacity", 1);

        sanyamBase.selectAll(".aadiss-threat-dot")
            .data(sanyamObjs.slice(0, 100))
            .join("circle")
            .attr("class", "aadiss-threat-dot")
            .attr("transform", sanyamD => {
                const sanyamAng = Math.random() * 360;
                return `rotate(${sanyamAng}) translate(${sanyamScaleD(sanyamD.dist)}, 0)`;
            })
            .attr("r", 0)
            .attr("fill", "#ff6b6b")
            .attr("stroke", "#333")
            .on("mouseenter", function(sanyamE, sanyamD) {
                d3.select(this).transition().duration(150).attr("r", sanyamScaleS(sanyamD.mag) * 1.5);
                sanyamShowInfo(sanyamE, `<strong>Near-Earth Object</strong><br>Brightness (H): ${sanyamD.mag.toFixed(2)}<br>Miss Distance: ${sanyamD.dist.toFixed(3)} LD`);
            })
            .on("mousemove", (sanyamE, sanyamD) => sanyamShowInfo(sanyamE, `<strong>Near-Earth Object</strong><br>Brightness (H): ${sanyamD.mag.toFixed(2)}<br>Miss Distance: ${sanyamD.dist.toFixed(3)} LD`))
            .on("mouseleave", function() {
                d3.select(this).transition().duration(150).attr("r", sanyamScaleS(d3.select(this).datum().mag));
                sanyamHideInfo();
            })
            .transition().duration(500).delay(1800)
            .attr("r", sanyamD => sanyamScaleS(sanyamD.mag));

        sanyamBase.append("circle")
            .attr("r", 0).attr("fill", "#4a90e2")
            .attr("stroke", "#fff").attr("stroke-width", 2)
            .transition().duration(800)
            .attr("r", sanyamScaleR.range()[0] * 0.75);

        sanyamBase.append("text")
            .attr("class", "aadiss-earth-label")
            .attr("y", 5).attr("opacity", 0)
            .text("Earth")
            .transition().duration(500).delay(800).attr("opacity", 1);

        const sanyamLeg = sanyamBase.append("g").attr("transform", `translate(${-sanyamRMax + 20}, ${sanyamRMax - 80})`);
        sanyamLeg.append("text").attr("class", "aadiss-legend-item").attr("y", 0).attr("font-weight", "600").text("Success Rate:");

        const sanyamLScale = d3.scaleLinear().domain([0.3, 1]).range([0, 100]);
        const sanyamGrad = sanyamCanvasB.append("defs").append("linearGradient").attr("id", "aadiss-grad-success").attr("x1", "0%").attr("x2", "100%");

        sanyamGrad.selectAll("stop").data([
            { pct: "0%", c: sanyamColMap(0.3) }, { pct: "50%", c: sanyamColMap(0.65) }, { pct: "100%", c: sanyamColMap(1.0) }
        ]).join("stop").attr("offset", sanyamD => sanyamD.pct).attr("stop-color", sanyamD => sanyamD.c);

        sanyamLeg.append("rect").attr("y", 10).attr("width", 100).attr("height", 10).style("fill", "url(#aadiss-grad-success)");
        sanyamLeg.append("g").attr("transform", "translate(0, 20)")
           .call(d3.axisBottom(sanyamLScale).tickFormat(sanyamD => `${(sanyamD * 100).toFixed(0)}%`).ticks(4))
           .selectAll("text").style("font-size", "9px");
    };

    let sanyamGlobalStats, sanyamGlobalObjs;

    Promise.all([
        d3.csv("Space_Corrected.csv"),
        d3.csv("near earth objects.csv")
    ]).then(([sanyamRawSpace, sanyamRawNeo]) => {
        const sanyamMissions = d3.rollups(
            sanyamRawSpace.filter(sanyamX => sanyamX['Company Name'] && sanyamX.Location),
            sanyamV => sanyamV.length,
            sanyamD => sanyamD['Company Name'],
            sanyamD => sanyamExtractRegion(sanyamD.Location)
        ).flatMap(([sanyamS, sanyamTList]) => sanyamTList.map(([sanyamT, sanyamV]) => ({ source: sanyamS, target: sanyamT, value: sanyamV })));

        const sanyamSumMap = new Map();
        sanyamMissions.forEach(sanyamM => {
            sanyamSumMap.set(sanyamM.source, (sanyamSumMap.get(sanyamM.source) || 0) + sanyamM.value);
            sanyamSumMap.set(sanyamM.target, (sanyamSumMap.get(sanyamM.target) || 0) + sanyamM.value);
        });

        const sanyamDataA = sanyamMissions.filter(sanyamM => (sanyamSumMap.get(sanyamM.source) || 0) > 0 && (sanyamSumMap.get(sanyamM.target) || 0) > 0 && sanyamM.value > 1);

        const sanyamPeriods = d3.rollup(
            sanyamRawSpace.filter(sanyamX => sanyamX.Datum && sanyamX['Status Mission']),
            sanyamV => sanyamV.length,
            sanyamD => sanyamExtractTime(sanyamD.Datum),
            sanyamD => sanyamD['Status Mission']
        );

        const sanyamDataB_Stats = Array.from(sanyamPeriods, ([sanyamYr, sanyamStatMap]) => {
            if (!sanyamYr || sanyamYr < 1950) return null;
            const sanyamM = new Map(sanyamStatMap);
            const sanyamS = sanyamM.get("Success") || 0;
            const sanyamF = sanyamM.get("Failure") || 0;
            return { Decade: sanyamYr, Success: sanyamS, Failure: sanyamF, Rate: (sanyamS + sanyamF) > 0 ? sanyamS / (sanyamS + sanyamF) : 0 };
        }).filter(Boolean).sort((sanyamA, sanyamB) => sanyamA.Decade - sanyamB.Decade);

        const sanyamDataB_Objs = sanyamRawNeo.map(sanyamN => {
            const sanyamDist = parseFloat(sanyamN['CA Distance Nominal (LD)']);
            const sanyamMag = parseFloat(sanyamN['H (mag)']);
            return (isNaN(sanyamDist) || isNaN(sanyamMag)) ? null : { dist: sanyamDist, mag: sanyamMag };
        }).filter(Boolean);

        sanyamGlobalStats = sanyamDataB_Stats;
        sanyamGlobalObjs = sanyamDataB_Objs;

        sanyamRenderRelations(sanyamDataA);
        sanyamRenderDefense(sanyamDataB_Stats, sanyamDataB_Objs);

        setTimeout(sanyamSetupShieldScrollytelling, 500);
    });

    function sanyamUpdateShieldByDecade(sanyamDecade) {
        console.log('updateShieldByDecade called with decade:', sanyamDecade);

        const sanyamBase = sanyamCanvasB.select("g");
        if (sanyamBase.empty()) {
            console.log('Warning: Shield base element not found');
            return;
        }

        const sanyamRings = sanyamBase.selectAll(".aadiss-shield-ring");
        const sanyamDots = sanyamBase.selectAll(".aadiss-threat-dot");
        const sanyamLabels = sanyamBase.selectAll(".aadiss-decade-label");

        console.log('Shield elements found - rings:', sanyamRings.size(), 'dots:', sanyamDots.size(), 'labels:', sanyamLabels.size());

        const sanyamHeatmapColor = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.3, 1.0]);

        if (sanyamDecade === 'intro') {
            sanyamRings.transition().duration(1000)
                .attr("fill-opacity", sanyamD => 0.25 + (sanyamD.Rate * 0.35))
                .attr("stroke-width", 3)
                .attr("stroke-opacity", 0.8)
                .attr("fill", sanyamD => sanyamHeatmapColor(sanyamD.Rate))
                .attr("stroke", sanyamD => d3.rgb(sanyamHeatmapColor(sanyamD.Rate)).brighter(0.5));

            sanyamLabels.transition().duration(1000)
                .attr("opacity", 1)
                .attr("font-size", "13px")
                .attr("font-weight", "600")
                .attr("fill", sanyamD => sanyamHeatmapColor(sanyamD.Rate));

            sanyamDots.transition().duration(1000)
                .attr("opacity", 0.5)
                .attr("r", function() {
                    const sanyamD = d3.select(this).datum();
                    const sanyamScaleS = d3.scaleLinear().domain(d3.extent(sanyamGlobalObjs, sanyamO => sanyamO.mag)).range([6, 2]);
                    return sanyamScaleS(sanyamD.mag);
                });

        } else if (sanyamDecade === 'threats') {
            sanyamRings.transition().duration(1000)
                .attr("fill-opacity", 0.08)
                .attr("stroke-width", 1)
                .attr("stroke-opacity", 0.3);

            sanyamLabels.transition().duration(1000)
                .attr("opacity", 0.2)
                .attr("font-size", "10px");

            sanyamDots.transition().duration(600)
                .attr("opacity", 1)
                .attr("r", function() {
                    const sanyamD = d3.select(this).datum();
                    const sanyamScaleS = d3.scaleLinear().domain(d3.extent(sanyamGlobalObjs, sanyamO => sanyamO.mag)).range([6, 2]);
                    return sanyamScaleS(sanyamD.mag) * 2;
                })
                .attr("fill", "#ef4444")
                .transition().duration(600)
                .attr("r", function() {
                    const sanyamD = d3.select(this).datum();
                    const sanyamScaleS = d3.scaleLinear().domain(d3.extent(sanyamGlobalObjs, sanyamO => sanyamO.mag)).range([6, 2]);
                    return sanyamScaleS(sanyamD.mag) * 1.6;
                })
                .transition().duration(600)
                .attr("r", function() {
                    const sanyamD = d3.select(this).datum();
                    const sanyamScaleS = d3.scaleLinear().domain(d3.extent(sanyamGlobalObjs, sanyamO => sanyamO.mag)).range([6, 2]);
                    return sanyamScaleS(sanyamD.mag) * 2;
                });

        } else if (sanyamDecade === 'conclusion') {
            sanyamRings.transition().duration(1000)
                .attr("fill-opacity", sanyamD => 0.3 + (sanyamD.Rate * 0.45))
                .attr("stroke-width", 3)
                .attr("stroke-opacity", 0.9)
                .attr("fill", sanyamD => sanyamHeatmapColor(sanyamD.Rate))
                .attr("stroke", sanyamD => d3.rgb(sanyamHeatmapColor(sanyamD.Rate)).brighter(0.5));

            sanyamLabels.transition().duration(1000)
                .attr("opacity", 1)
                .attr("font-size", "14px")
                .attr("font-weight", "700")
                .attr("fill", sanyamD => sanyamHeatmapColor(sanyamD.Rate));

            sanyamDots.transition().duration(1000)
                .attr("opacity", 0.6)
                .attr("r", function() {
                    const sanyamD = d3.select(this).datum();
                    const sanyamScaleS = d3.scaleLinear().domain(d3.extent(sanyamGlobalObjs, sanyamO => sanyamO.mag)).range([6, 2]);
                    return sanyamScaleS(sanyamD.mag) * 1.2;
                })
                .attr("fill", "#fbbf24");

        } else {
            const sanyamTargetDecade = parseInt(sanyamDecade);
            console.log('Highlighting decade:', sanyamTargetDecade);

            sanyamRings.each(function(sanyamD) {
                const sanyamRing = d3.select(this);
                if (sanyamD.Decade === sanyamTargetDecade) {
                    sanyamRing.transition().duration(800)
                        .attr("fill-opacity", 0.7 + (sanyamD.Rate * 0.3))
                        .attr("stroke-width", 8)
                        .attr("stroke-opacity", 1)
                        .attr("fill", sanyamHeatmapColor(sanyamD.Rate))
                        .attr("stroke", d3.rgb(sanyamHeatmapColor(sanyamD.Rate)).brighter(1))
                        .style("filter", "url(#aadiss-shield-glow)")
                        .transition().duration(600)
                        .attr("stroke-width", 6)
                        .transition().duration(600)
                        .attr("stroke-width", 8);
                } else {
                    sanyamRing.transition().duration(800)
                        .attr("fill-opacity", 0.05)
                        .attr("stroke-width", 1)
                        .attr("stroke-opacity", 0.2)
                        .style("filter", "none");
                }
            });

            sanyamLabels.transition().duration(800)
                .attr("opacity", sanyamD => sanyamD.Decade === sanyamTargetDecade ? 1 : 0.15)
                .attr("font-size", sanyamD => sanyamD.Decade === sanyamTargetDecade ? "18px" : "10px")
                .attr("font-weight", sanyamD => sanyamD.Decade === sanyamTargetDecade ? "bold" : "400")
                .attr("fill", sanyamD => sanyamD.Decade === sanyamTargetDecade ? sanyamHeatmapColor(sanyamD.Rate) : "#666");

            sanyamDots.transition().duration(800)
                .attr("opacity", 0.25)
                .attr("r", function() {
                    const sanyamD = d3.select(this).datum();
                    const sanyamScaleS = d3.scaleLinear().domain(d3.extent(sanyamGlobalObjs, sanyamO => sanyamO.mag)).range([6, 2]);
                    return sanyamScaleS(sanyamD.mag) * 0.8;
                });
        }
    }

    function sanyamSetupShieldScrollytelling() {
        console.log('Setting up shield scrollytelling...');

        const sanyamAllSteps = Array.from(document.querySelectorAll('.aadiss-story-step'));
        const sanyamShieldSteps = sanyamAllSteps.filter(sanyamStep => sanyamStep.dataset.decade !== undefined);

        console.log('Found story steps with data-decade:', sanyamShieldSteps.length);

        if (sanyamShieldSteps.length === 0) {
            console.log('No story steps found for shield scrollytelling');
            return;
        }

        let sanyamCurrentStepIndex = -1;

        function sanyamHandleScroll() {
            const sanyamWindowHeight = window.innerHeight;
            let sanyamActiveIndex = -1;

            sanyamShieldSteps.forEach((sanyamStep, sanyamIndex) => {
                const sanyamRect = sanyamStep.getBoundingClientRect();
                const sanyamStepMiddle = sanyamRect.top + sanyamRect.height / 2;
                const sanyamIsInRange = sanyamStepMiddle >= 0 && sanyamStepMiddle <= sanyamWindowHeight * 0.6;

                if (sanyamIsInRange) {
                    sanyamActiveIndex = sanyamIndex;
                }
            });

            if (sanyamActiveIndex !== sanyamCurrentStepIndex && sanyamActiveIndex >= 0) {
                sanyamCurrentStepIndex = sanyamActiveIndex;
                const sanyamDecade = sanyamShieldSteps[sanyamActiveIndex].dataset.decade;
                console.log('Shield scroll: activating step', sanyamActiveIndex, 'decade:', sanyamDecade);

                sanyamShieldSteps.forEach((sanyamStep, sanyamI) => {
                    if (sanyamI === sanyamActiveIndex) {
                        sanyamStep.classList.add('aadiss-active');
                    } else {
                        sanyamStep.classList.remove('aadiss-active');
                    }
                });

                sanyamUpdateShieldByDecade(sanyamDecade);
            }
        }

        window.addEventListener('scroll', sanyamHandleScroll, { passive: true });

        setTimeout(sanyamHandleScroll, 100);
        setTimeout(sanyamHandleScroll, 500);
        setTimeout(sanyamHandleScroll, 1000);

        console.log('Shield scrollytelling setup complete');
    }
})();
