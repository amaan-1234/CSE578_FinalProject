(function () {
    const rootA = d3.select("#vis-container-1");
    const rootB = d3.select("#vis-container-2");
    
    const infoBox = d3.select("body").append("div")
        .attr("class", "tooltip")
        .attr("id", "info-box-custom")
        .style("opacity", 0);

    const pad = { t: 60, r: 40, b: 60, l: 60 };

    const setSize = (sel) => {
        if (sel.node() && !sel.style("width")) {
            sel.style("width", "100%").style("height", "800px");
        }
    };
    setSize(rootA);
    setSize(rootB);

    const getDim = (n) => n.node() ? n.node().getBoundingClientRect() : { width: 800, height: 800 };
    
    const dimA = getDim(rootA);
    const wA = dimA.width - pad.l - pad.r;
    const hA = dimA.height - pad.t - pad.b;

    const canvasA = rootA.append("svg")
        .attr("width", dimA.width)
        .attr("height", dimA.height)
        .append("g")
        .attr("transform", `translate(${pad.l}, ${pad.t})`);

    const dimB = getDim(rootB);
    const wB = dimB.width - pad.l - pad.r;
    const hB = dimB.height - pad.t - pad.b;

    const canvasB = rootB.append("svg")
        .attr("width", dimB.width)
        .attr("height", dimB.height)
        .append("g")
        .attr("transform", `translate(${pad.l}, ${pad.t})`);

    const palette = d3.scaleOrdinal(d3.schemeCategory10);

    const showInfo = (e, content) => {
        infoBox.html(content)
            .style("left", `${e.pageX + 10}px`)
            .style("top", `${e.pageY - 28}px`)
            .style("opacity", 1);
    };

    const hideInfo = () => infoBox.style("opacity", 0);

    const extractRegion = (str) => {
        if (!str) return "Unknown";
        const segs = str.split(',');
        const last = segs.pop().trim();
        const mains = ["USA", "Russia", "China", "Japan", "India", "France"];
        if (mains.includes(last)) return last;
        return last === "Kazakhstan" ? "Russia" : (last === "French Guiana" ? "France" : last);
    };

    const extractTime = (d) => {
        const val = new Date(d).getFullYear();
        return isNaN(val) ? null : Math.floor(val / 10) * 10;
    };

    const renderRelations = (dataset) => {
        canvasA.selectAll("*").remove();
        const uniq = [...new Set(dataset.map(x => x.source)), ...new Set(dataset.map(x => x.target))];
        const idxMap = new Map(uniq.map((u, i) => [u, i]));
        const grid = Array.from({ length: uniq.length }, () => new Array(uniq.length).fill(0));
        
        dataset.forEach(x => {
            const s = idxMap.get(x.source);
            const t = idxMap.get(x.target);
            if (s !== undefined && t !== undefined && x.value > 1) grid[s][t] = x.value;
        });

        const rOut = Math.min(wA, hA) / 2 - 40;
        const rIn = rOut - 20;
        
        const layout = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(grid);
        const arcGen = d3.arc().innerRadius(rIn).outerRadius(rOut);
        const ribGen = d3.ribbon().radius(rIn);

        const core = canvasA.append("g").attr("transform", `translate(${wA / 2}, ${hA / 2})`);

        const nodes = core.append("g").selectAll("g").data(layout.groups).join("g");
        
        nodes.append("path")
            .attr("class", "chord-arc")
            .attr("d", arcGen)
            .attr("fill", d => palette(uniq[d.index]))
            .attr("stroke", d => d3.rgb(palette(uniq[d.index])))
            .on("mouseenter", function(e, d) {
                d3.select(this).style("opacity", 1);
                core.selectAll(".chord-path").style("opacity", p => 
                    p.source.index === d.index || p.target.index === d.index ? 1 : 0.1
                );
                showInfo(e, `<strong>${uniq[d.index]}</strong><br>Total: ${d.value.toLocaleString()} missions`);
            })
            .on("mousemove", (e, d) => showInfo(e, `<strong>${uniq[d.index]}</strong><br>Total: ${d.value.toLocaleString()} missions`))
            .on("mouseleave", function() {
                d3.select(this).style("opacity", 1);
                core.selectAll(".chord-path").style("opacity", 1);
                hideInfo();
            });

        nodes.append("text")
            .attr("class", "chord-label")
            .each(d => { d.mid = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", d => `rotate(${(d.mid * 180 / Math.PI - 90)}) translate(${(rOut + 10)}) ${d.mid > Math.PI ? "rotate(180)" : ""}`)
            .attr("text-anchor", d => d.mid > Math.PI ? "end" : null)
            .text(d => uniq[d.index]);

        core.append("g")
            .attr("fill-opacity", 0.7)
            .selectAll("path")
            .data(layout)
            .join("path")
            .attr("class", "chord-path")
            .attr("d", ribGen)
            .attr("fill", d => palette(uniq[d.source.index]))
            .on("mouseenter", function(e, d) {
                d3.select(this).raise();
                showInfo(e, `<strong>${uniq[d.source.index]} → ${uniq[d.target.index]}</strong><br>Missions: ${d.source.value.toLocaleString()}`);
            })
            .on("mousemove", (e, d) => showInfo(e, `<strong>${uniq[d.source.index]} → ${uniq[d.target.index]}</strong><br>Missions: ${d.source.value.toLocaleString()}`))
            .on("mouseleave", hideInfo);
    };

    const renderDefense = (stats, objs) => {
        canvasB.selectAll("*").remove();

        // Add glow filter for enhanced visibility
        const defs = canvasB.append("defs");
        const filter = defs.append("filter").attr("id", "shield-glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Add radial gradient for heatmap effect
        const radialGrad = defs.append("radialGradient").attr("id", "heatmap-gradient");
        radialGrad.append("stop").attr("offset", "0%").attr("stop-color", "#22c55e").attr("stop-opacity", "0.8");
        radialGrad.append("stop").attr("offset", "50%").attr("stop-color", "#eab308").attr("stop-opacity", "0.6");
        radialGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444").attr("stop-opacity", "0.4");

        const base = canvasB.append("g").attr("transform", `translate(${wB / 2}, ${hB / 2})`);
        const rMax = Math.min(wB, hB) / 2 - 40;

        const scaleR = d3.scaleLinear().domain(d3.extent(stats, s => s.Decade)).range([rMax * 0.25, rMax * 0.85]);
        const scaleD = d3.scaleLinear().domain([0, d3.max(objs, o => o.dist)]).range([scaleR.range()[1] + 15, rMax * 0.95]);
        const scaleS = d3.scaleLinear().domain(d3.extent(objs, o => o.mag)).range([6, 2]);

        // Enhanced color map with more vibrant colors for heatmap effect
        const colMap = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.3, 1.0]);

        const zones = base.selectAll(".shield-ring-group").data(stats.slice().reverse()).join("g");
        
        zones.append("circle")
            .attr("class", "shield-ring")
            .attr("r", 0)
            .attr("fill", d => colMap(d.Rate))
            .attr("stroke", d => d3.rgb(colMap(d.Rate)).brighter(0.5))
            .attr("stroke-width", 2)
            .attr("fill-opacity", d => 0.15 + (d.Rate * 0.25))
            .style("pointer-events", "all")
            .style("filter", "url(#shield-glow)")
            .on("mouseenter", function(e, d) {
                e.stopPropagation();
                d3.select(this).transition().duration(200).attr("fill-opacity", 0.35 + (d.Rate * 0.35));
                showInfo(e, `<strong>${d.Decade}s</strong><br>Success Rate: ${(d.Rate * 100).toFixed(1)}%<br>Successful: ${d.Success} | Failed: ${d.Failure}`);
            })
            .on("mousemove", (e, d) => {
                e.stopPropagation();
                showInfo(e, `<strong>${d.Decade}s</strong><br>Success Rate: ${(d.Rate * 100).toFixed(1)}%<br>Successful: ${d.Success} | Failed: ${d.Failure}`);
            })
            .on("mouseleave", function(e, d) {
                e.stopPropagation();
                d3.select(this).transition().duration(200).attr("fill-opacity", 0.15 + (d.Rate * 0.25));
                hideInfo();
            })
            .transition().duration(1000).delay((d, i) => (stats.length - 1 - i) * 150)
            .attr("r", d => scaleR(d.Decade));

        zones.append("text")
            .attr("class", "decade-label")
            .attr("y", d => -scaleR(d.Decade) - 5)
            .attr("opacity", 0)
            .text(d => d.Decade + "s")
            .transition().duration(500).delay((d, i) => (stats.length - 1 - i) * 150 + 1000)
            .attr("opacity", 1);

        base.selectAll(".threat-dot")
            .data(objs.slice(0, 100))
            .join("circle")
            .attr("class", "threat-dot")
            .attr("transform", d => {
                const ang = Math.random() * 360;
                return `rotate(${ang}) translate(${scaleD(d.dist)}, 0)`;
            })
            .attr("r", 0)
            .attr("fill", "#ff6b6b")
            .attr("stroke", "#333")
            .on("mouseenter", function(e, d) {
                d3.select(this).transition().duration(150).attr("r", scaleS(d.mag) * 1.5);
                showInfo(e, `<strong>Near-Earth Object</strong><br>Brightness (H): ${d.mag.toFixed(2)}<br>Miss Distance: ${d.dist.toFixed(3)} LD`);
            })
            .on("mousemove", (e, d) => showInfo(e, `<strong>Near-Earth Object</strong><br>Brightness (H): ${d.mag.toFixed(2)}<br>Miss Distance: ${d.dist.toFixed(3)} LD`))
            .on("mouseleave", function() {
                d3.select(this).transition().duration(150).attr("r", scaleS(d3.select(this).datum().mag));
                hideInfo();
            })
            .transition().duration(500).delay(1800)
            .attr("r", d => scaleS(d.mag));

        base.append("circle")
            .attr("r", 0).attr("fill", "#4a90e2")
            .attr("stroke", "#fff").attr("stroke-width", 2)
            .transition().duration(800)
            .attr("r", scaleR.range()[0] * 0.75);

        base.append("text")
            .attr("class", "earth-label")
            .attr("y", 5).attr("opacity", 0)
            .text("Earth")
            .transition().duration(500).delay(800).attr("opacity", 1);

        const leg = base.append("g").attr("transform", `translate(${-rMax + 20}, ${rMax - 80})`);
        leg.append("text").attr("class", "legend-item").attr("y", 0).attr("font-weight", "600").text("Success Rate:");

        const lScale = d3.scaleLinear().domain([0.3, 1]).range([0, 100]);
        const grad = canvasB.append("defs").append("linearGradient").attr("id", "grad-success").attr("x1", "0%").attr("x2", "100%");
        
        grad.selectAll("stop").data([
            { pct: "0%", c: colMap(0.3) }, { pct: "50%", c: colMap(0.65) }, { pct: "100%", c: colMap(1.0) }
        ]).join("stop").attr("offset", d => d.pct).attr("stop-color", d => d.c);

        leg.append("rect").attr("y", 10).attr("width", 100).attr("height", 10).style("fill", "url(#grad-success)");
        leg.append("g").attr("transform", "translate(0, 20)")
           .call(d3.axisBottom(lScale).tickFormat(d => `${(d * 100).toFixed(0)}%`).ticks(4))
           .selectAll("text").style("font-size", "9px");
    };

    let globalStats, globalObjs;

    Promise.all([
        d3.csv("Space_Corrected.csv"),
        d3.csv("near earth objects.csv")
    ]).then(([rawSpace, rawNeo]) => {
        const missions = d3.rollups(
            rawSpace.filter(x => x['Company Name'] && x.Location),
            v => v.length,
            d => d['Company Name'],
            d => extractRegion(d.Location)
        ).flatMap(([s, tList]) => tList.map(([t, v]) => ({ source: s, target: t, value: v })));

        const sumMap = new Map();
        missions.forEach(m => {
            sumMap.set(m.source, (sumMap.get(m.source) || 0) + m.value);
            sumMap.set(m.target, (sumMap.get(m.target) || 0) + m.value);
        });

        const dataA = missions.filter(m => (sumMap.get(m.source) || 0) > 0 && (sumMap.get(m.target) || 0) > 0 && m.value > 1);

        const periods = d3.rollup(
            rawSpace.filter(x => x.Datum && x['Status Mission']),
            v => v.length,
            d => extractTime(d.Datum),
            d => d['Status Mission']
        );

        const dataB_Stats = Array.from(periods, ([yr, statMap]) => {
            if (!yr || yr < 1950) return null;
            const m = new Map(statMap);
            const s = m.get("Success") || 0;
            const f = m.get("Failure") || 0;
            return { Decade: yr, Success: s, Failure: f, Rate: (s + f) > 0 ? s / (s + f) : 0 };
        }).filter(Boolean).sort((a, b) => a.Decade - b.Decade);

        const dataB_Objs = rawNeo.map(n => {
            const dist = parseFloat(n['CA Distance Nominal (LD)']);
            const mag = parseFloat(n['H (mag)']);
            return (isNaN(dist) || isNaN(mag)) ? null : { dist, mag };
        }).filter(Boolean);

        globalStats = dataB_Stats;
        globalObjs = dataB_Objs;

        renderRelations(dataA);
        renderDefense(dataB_Stats, dataB_Objs);

        // Setup scrollytelling after visualization is rendered
        setTimeout(setupShieldScrollytelling, 500);
    });

    // Scrollytelling functionality for shield diagram with enhanced heatmap effects
    function updateShieldByDecade(decade) {
        console.log('updateShieldByDecade called with decade:', decade);

        const base = canvasB.select("g");
        if (base.empty()) {
            console.log('Warning: Shield base element not found');
            return;
        }

        const rings = base.selectAll(".shield-ring");
        const dots = base.selectAll(".threat-dot");
        const labels = base.selectAll(".decade-label");

        console.log('Shield elements found - rings:', rings.size(), 'dots:', dots.size(), 'labels:', labels.size());

        // Enhanced color map for heatmap effect
        const heatmapColor = d3.scaleSequential(d3.interpolateRdYlGn).domain([0.3, 1.0]);

        if (decade === 'intro') {
            // Introduction: Show all rings with moderate heatmap
            rings.transition().duration(1000)
                .attr("fill-opacity", d => 0.25 + (d.Rate * 0.35))
                .attr("stroke-width", 3)
                .attr("stroke-opacity", 0.8)
                .attr("fill", d => heatmapColor(d.Rate))
                .attr("stroke", d => d3.rgb(heatmapColor(d.Rate)).brighter(0.5));

            labels.transition().duration(1000)
                .attr("opacity", 1)
                .attr("font-size", "13px")
                .attr("font-weight", "600")
                .attr("fill", d => heatmapColor(d.Rate));

            dots.transition().duration(1000)
                .attr("opacity", 0.5)
                .attr("r", function() {
                    const d = d3.select(this).datum();
                    const scaleS = d3.scaleLinear().domain(d3.extent(globalObjs, o => o.mag)).range([6, 2]);
                    return scaleS(d.mag);
                });

        } else if (decade === 'threats') {
            // Emphasize external threats - dim rings, bright pulsing dots
            rings.transition().duration(1000)
                .attr("fill-opacity", 0.08)
                .attr("stroke-width", 1)
                .attr("stroke-opacity", 0.3);

            labels.transition().duration(1000)
                .attr("opacity", 0.2)
                .attr("font-size", "10px");

            dots.transition().duration(600)
                .attr("opacity", 1)
                .attr("r", function() {
                    const d = d3.select(this).datum();
                    const scaleS = d3.scaleLinear().domain(d3.extent(globalObjs, o => o.mag)).range([6, 2]);
                    return scaleS(d.mag) * 2;
                })
                .attr("fill", "#ef4444")
                .transition().duration(600)
                .attr("r", function() {
                    const d = d3.select(this).datum();
                    const scaleS = d3.scaleLinear().domain(d3.extent(globalObjs, o => o.mag)).range([6, 2]);
                    return scaleS(d.mag) * 1.6;
                })
                .transition().duration(600)
                .attr("r", function() {
                    const d = d3.select(this).datum();
                    const scaleS = d3.scaleLinear().domain(d3.extent(globalObjs, o => o.mag)).range([6, 2]);
                    return scaleS(d.mag) * 2;
                });

        } else if (decade === 'conclusion') {
            // Show complete shield system with full heatmap
            rings.transition().duration(1000)
                .attr("fill-opacity", d => 0.3 + (d.Rate * 0.45))
                .attr("stroke-width", 3)
                .attr("stroke-opacity", 0.9)
                .attr("fill", d => heatmapColor(d.Rate))
                .attr("stroke", d => d3.rgb(heatmapColor(d.Rate)).brighter(0.5));

            labels.transition().duration(1000)
                .attr("opacity", 1)
                .attr("font-size", "14px")
                .attr("font-weight", "700")
                .attr("fill", d => heatmapColor(d.Rate));

            dots.transition().duration(1000)
                .attr("opacity", 0.6)
                .attr("r", function() {
                    const d = d3.select(this).datum();
                    const scaleS = d3.scaleLinear().domain(d3.extent(globalObjs, o => o.mag)).range([6, 2]);
                    return scaleS(d.mag) * 1.2;
                })
                .attr("fill", "#fbbf24");

        } else {
            // Highlight specific decade ring with dramatic heatmap effect
            const targetDecade = parseInt(decade);
            console.log('Highlighting decade:', targetDecade);

            rings.each(function(d) {
                const ring = d3.select(this);
                if (d.Decade === targetDecade) {
                    // Highlighted ring: dramatic heatmap with pulsing effect
                    ring.transition().duration(800)
                        .attr("fill-opacity", 0.7 + (d.Rate * 0.3))
                        .attr("stroke-width", 8)
                        .attr("stroke-opacity", 1)
                        .attr("fill", heatmapColor(d.Rate))
                        .attr("stroke", d3.rgb(heatmapColor(d.Rate)).brighter(1))
                        .style("filter", "url(#shield-glow)")
                        .transition().duration(600)
                        .attr("stroke-width", 6)
                        .transition().duration(600)
                        .attr("stroke-width", 8);
                } else {
                    // Dimmed rings
                    ring.transition().duration(800)
                        .attr("fill-opacity", 0.05)
                        .attr("stroke-width", 1)
                        .attr("stroke-opacity", 0.2)
                        .style("filter", "none");
                }
            });

            labels.transition().duration(800)
                .attr("opacity", d => d.Decade === targetDecade ? 1 : 0.15)
                .attr("font-size", d => d.Decade === targetDecade ? "18px" : "10px")
                .attr("font-weight", d => d.Decade === targetDecade ? "bold" : "400")
                .attr("fill", d => d.Decade === targetDecade ? heatmapColor(d.Rate) : "#666");

            dots.transition().duration(800)
                .attr("opacity", 0.25)
                .attr("r", function() {
                    const d = d3.select(this).datum();
                    const scaleS = d3.scaleLinear().domain(d3.extent(globalObjs, o => o.mag)).range([6, 2]);
                    return scaleS(d.mag) * 0.8;
                });
        }
    }

    function setupShieldScrollytelling() {
        console.log('Setting up shield scrollytelling...');

        // Find story steps specifically for the shield visualization
        const allSteps = Array.from(document.querySelectorAll('.story-step'));
        const shieldSteps = allSteps.filter(step => step.dataset.decade !== undefined);

        console.log('Found story steps with data-decade:', shieldSteps.length);

        if (shieldSteps.length === 0) {
            console.log('No story steps found for shield scrollytelling');
            return;
        }

        let currentStepIndex = -1;

        function handleScroll() {
            const windowHeight = window.innerHeight;
            let activeIndex = -1;

            shieldSteps.forEach((step, index) => {
                const rect = step.getBoundingClientRect();
                const stepMiddle = rect.top + rect.height / 2;
                const isInRange = stepMiddle >= 0 && stepMiddle <= windowHeight * 0.6;

                if (isInRange) {
                    activeIndex = index;
                }
            });

            if (activeIndex !== currentStepIndex && activeIndex >= 0) {
                currentStepIndex = activeIndex;
                const decade = shieldSteps[activeIndex].dataset.decade;
                console.log('Shield scroll: activating step', activeIndex, 'decade:', decade);

                // Update visual state of story steps
                shieldSteps.forEach((step, i) => {
                    if (i === activeIndex) {
                        step.classList.add('active');
                    } else {
                        step.classList.remove('active');
                    }
                });

                // Update visualization
                updateShieldByDecade(decade);
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true });

        // Call multiple times to ensure it catches the initial state
        setTimeout(handleScroll, 100);
        setTimeout(handleScroll, 500);
        setTimeout(handleScroll, 1000);

        console.log('Shield scrollytelling setup complete');
    }
})();