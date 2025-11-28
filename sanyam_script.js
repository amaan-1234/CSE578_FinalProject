(function () {
    const vis1 = d3.select("#vis-container-1");
    const vis2 = d3.select("#vis-container-2");

    // Unique tooltip for Sanyam's viz
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .attr("id", "tooltip-sanyam")
        .style("opacity", 0);

    const margin = { top: 60, right: 40, bottom: 60, left: 60 };

    // Ensure containers have dimensions if not set by CSS
    if (vis1.node() && !vis1.style("width")) vis1.style("width", "100%").style("height", "800px");
    if (vis2.node() && !vis2.style("width")) vis2.style("width", "100%").style("height", "800px");

    const visWidth1 = vis1.node() ? vis1.node().getBoundingClientRect().width : 800;
    const visHeight1 = vis1.node() ? vis1.node().getBoundingClientRect().height : 800;
    const width1 = visWidth1 - margin.left - margin.right;
    const height1 = visHeight1 - margin.top - margin.bottom;

    const svg1 = vis1.append("svg")
        .attr("width", visWidth1)
        .attr("height", visHeight1)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const visWidth2 = vis2.node() ? vis2.node().getBoundingClientRect().width : 800;
    const visHeight2 = vis2.node() ? vis2.node().getBoundingClientRect().height : 800;
    const width2 = visWidth2 - margin.left - margin.right;
    const height2 = visHeight2 - margin.top - margin.bottom;

    const svg2 = vis2.append("svg")
        .attr("width", visWidth2)
        .attr("height", visHeight2)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    const onMouseOver = (event, d) => {
        tooltip.style("opacity", 1);
    };

    const onMouseMove = (event, htmlContent) => {
        tooltip
            .html(htmlContent)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    };

    const onMouseOut = (event, d) => {
        tooltip.style("opacity", 0);
    };

    function parseCountry(locationString) {
        if (!locationString) return "Unknown";
        const parts = locationString.split(',');
        const country = parts.pop().trim();
        if (country === "USA" || country === "Russia" || country === "China" || country === "Japan" || country === "India" || country === "France") {
            return country;
        }
        if (country === "Kazakhstan") return "Russia";
        if (country === "French Guiana") return "France";
        return country;
    }

    function parseDecade(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        if (isNaN(year)) return null;
        return Math.floor(year / 10) * 10;
    }


    function drawViz1(chordData) {
        svg1.selectAll("*").remove();

        const names = [...new Set(chordData.map(d => d.source)), ...new Set(chordData.map(d => d.target))];
        const nameMap = new Map(names.map((name, i) => [name, i]));

        const matrix = Array(names.length).fill(0).map(() => Array(names.length).fill(0));
        chordData.forEach(d => {
            const sourceIndex = nameMap.get(d.source);
            const targetIndex = nameMap.get(d.target);
            if (sourceIndex !== undefined && targetIndex !== undefined && d.value > 1) {
                matrix[sourceIndex][targetIndex] = d.value;
            }
        });

        const outerRadius = Math.min(width1, height1) / 2 - 40;
        const innerRadius = outerRadius - 20;
        const chord = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(matrix);
        const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
        const ribbon = d3.ribbon().radius(innerRadius);

        const g = svg1.append("g").attr("transform", `translate(${width1 / 2}, ${height1 / 2})`);

        svg1.append("text")
            .attr("class", "chart-title")
            .attr("x", width1 / 2)
            .attr("y", -20)
            .text("Global Space Mission Ecosystem");

        const groups = g.append("g").selectAll("g").data(chord.groups).join("g");
        groups.append("path")
            .attr("class", "chord-arc")
            .attr("d", arc)
            .attr("fill", d => colors(names[d.index]))
            .attr("stroke", d => d3.rgb(colors(names[d.index])).darker())
            .on("mouseover", function (event, d) {
                onMouseOver(event, d);
                d3.select(this).style("opacity", 1);
                g.selectAll(".chord-path")
                    .style("opacity", ch =>
                        ch.source.index === d.index || ch.target.index === d.index ? 1 : 0.1
                    );
            })
            .on("mousemove", (event, d) => {
                onMouseMove(event, `<strong>${names[d.index]}</strong><br>Total: ${d.value.toLocaleString()} missions`);
            })
            .on("mouseout", function (event, d) {
                onMouseOut(event, d);
                d3.select(this).style("opacity", 1);
                g.selectAll(".chord-path").style("opacity", 1);
            });

        groups.append("text")
            .attr("class", "chord-label")
            .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
            .attr("dy", ".35em")
            .attr("transform", d => `rotate(${(d.angle * 180 / Math.PI - 90)}) translate(${(outerRadius + 10)}) ${d.angle > Math.PI ? "rotate(180)" : ""}`)
            .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
            .text(d => names[d.index]);

        g.append("g")
            .attr("fill-opacity", 0.7)
            .selectAll("path")
            .data(chord)
            .join("path")
            .attr("class", "chord-path")
            .attr("d", ribbon)
            .attr("fill", d => colors(names[d.source.index]))
            .style("mix-blend-mode", "multiply")
            .on("mouseover", function (event, d) {
                onMouseOver(event, d);
                d3.select(this).raise();
            })
            .on("mousemove", (event, d) => {
                onMouseMove(event, `<strong>${names[d.source.index]} → ${names[d.target.index]}</strong><br>Missions: ${d.source.value.toLocaleString()}`);
            })
            .on("mouseout", onMouseOut);
    }

    function drawViz2(shieldData, threatData) {
        svg2.selectAll("*").remove();

        const g = svg2.append("g")
            .attr("transform", `translate(${width2 / 2}, ${height2 / 2})`);

        const maxRadius = Math.min(width2, height2) / 2 - 40;

        svg2.append("text")
            .attr("class", "chart-title")
            .attr("x", width2 / 2)
            .attr("y", -20)
            .text("Earth's Shield: Mission Success Over Time");

        const ringScale = d3.scaleLinear()
            .domain(d3.extent(shieldData, d => d.Decade))
            .range([maxRadius * 0.25, maxRadius * 0.85]);

        const threatDistScale = d3.scaleLinear()
            .domain([0, d3.max(threatData, d => d.Miss_Distance_LD)])
            .range([ringScale.range()[1] + 15, maxRadius * 0.95]);

        const threatSizeScale = d3.scaleLinear()
            .domain(d3.extent(threatData, d => d.H_mag))
            .range([6, 2]);

        const successColor = d3.scaleSequential(d3.interpolateRdYlGn)
            .domain([0.3, 1.0]);

        const rings = g.selectAll(".shield-ring-group")
            .data(shieldData.slice().reverse())
            .join("g")
            .attr("class", "shield-ring-group");

        rings.append("circle")
            .attr("class", "shield-ring")
            .attr("r", 0)
            .attr("fill", d => successColor(d.Rate))
            .attr("stroke", d => d3.rgb(successColor(d.Rate)).darker(1))
            .attr("fill-opacity", d => 0.15 + (d.Rate * 0.25))
            .style("pointer-events", "all")
            .on("mouseover", function (event, d) {
                event.stopPropagation();
                onMouseOver(event, d);
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", d => 0.35 + (d.Rate * 0.35));
            })
            .on("mousemove", (event, d) => {
                event.stopPropagation();
                onMouseMove(event, `<strong>${d.Decade}s</strong><br>Success Rate: ${(d.Rate * 100).toFixed(1)}%<br>Successful: ${d.Success} | Failed: ${d.Failure}`);
            })
            .on("mouseout", function (event, d) {
                event.stopPropagation();
                onMouseOut(event, d);
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", d => 0.15 + (d.Rate * 0.25));
            })
            .transition()
            .duration(1000)
            .delay((d, i) => (shieldData.length - 1 - i) * 150)
            .attr("r", d => ringScale(d.Decade));

        rings.append("text")
            .attr("class", "decade-label")
            .attr("y", d => -ringScale(d.Decade) - 5)
            .attr("opacity", 0)
            .text(d => d.Decade + "s")
            .transition()
            .duration(500)
            .delay((d, i) => (shieldData.length - 1 - i) * 150 + 1000)
            .attr("opacity", 1);

        const threats = g.selectAll(".threat-dot")
            .data(threatData.slice(0, 100))
            .join("circle")
            .attr("class", "threat-dot")
            .attr("transform", d => {
                const angle = Math.random() * 360;
                const r = threatDistScale(d.Miss_Distance_LD);
                return `rotate(${angle}) translate(${r}, 0)`;
            })
            .attr("r", 0)
            .attr("fill", "#ff6b6b")
            .attr("stroke", "#333")
            .on("mouseover", function (event, d) {
                onMouseOver(event, d);
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", threatSizeScale(d.H_mag) * 1.5);
            })
            .on("mousemove", (event, d) => {
                onMouseMove(event, `<strong>Near-Earth Object</strong><br>Brightness (H): ${d.H_mag.toFixed(2)}<br>Miss Distance: ${d.Miss_Distance_LD.toFixed(3)} LD`);
            })
            .on("mouseout", function (event, d) {
                onMouseOut(event, d);
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", threatSizeScale(d.H_mag));
            })
            .transition()
            .duration(500)
            .delay(1800)
            .attr("r", d => threatSizeScale(d.H_mag));

        g.append("circle")
            .attr("r", 0)
            .attr("fill", "#4a90e2")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .transition()
            .duration(800)
            .attr("r", ringScale.range()[0] * 0.75);

        g.append("text")
            .attr("class", "earth-label")
            .attr("y", 5)
            .attr("opacity", 0)
            .text("Earth")
            .transition()
            .duration(500)
            .delay(800)
            .attr("opacity", 1);

        const legend = g.append("g")
            .attr("transform", `translate(${-maxRadius + 20}, ${maxRadius - 80})`);

        legend.append("text")
            .attr("class", "legend-item")
            .attr("y", 0)
            .attr("font-weight", "600")
            .text("Success Rate:");

        const legendScale = d3.scaleLinear().domain([0.3, 1]).range([0, 100]);
        const legendAxis = d3.axisBottom(legendScale)
            .tickFormat(d => `${(d * 100).toFixed(0)}%`)
            .ticks(4);

        const defs = svg2.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "success-gradient")
            .attr("x1", "0%")
            .attr("x2", "100%");

        gradient.selectAll("stop")
            .data([
                { offset: "0%", color: successColor(0.3) },
                { offset: "50%", color: successColor(0.65) },
                { offset: "100%", color: successColor(1.0) }
            ])
            .join("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        legend.append("rect")
            .attr("y", 10)
            .attr("width", 100)
            .attr("height", 10)
            .style("fill", "url(#success-gradient)");

        legend.append("g")
            .attr("transform", "translate(0, 20)")
            .call(legendAxis)
            .selectAll("text")
            .style("font-size", "9px");
    }

    function drawBothVisualizations(viz1Data, viz6Data) {
        drawViz1(viz1Data);
        drawViz2(viz6Data.shield, viz6Data.threats);
    }

    vis1.append("text")
        .attr("x", visWidth1 / 2)
        .attr("y", visHeight1 / 2)
        .attr("text-anchor", "middle")
        .text("Loading data...");

    vis2.append("text")
        .attr("x", visWidth2 / 2)
        .attr("y", visHeight2 / 2)
        .attr("text-anchor", "middle")
        .text("Loading data...");

    const spaceDataFile = "Space_Corrected.csv";
    const neoDataFile = "near earth objects.csv";

    Promise.all([
        d3.csv(spaceDataFile),
        d3.csv(neoDataFile)
    ]).then(function ([spaceData, neoData]) {
        console.log('Sanyam: Data loaded successfully', spaceData.length, neoData.length);

        let viz1Data = d3.rollups(
            spaceData.filter(d => d['Company Name'] && d.Location),
            v => v.length,
            d => d['Company Name'],
            d => parseCountry(d.Location)
        ).flatMap(([source, targets]) =>
            targets.map(([target, value]) => ({ source, target, value }))
        );

        const nameTotals = new Map();
        viz1Data.forEach(d => {
            nameTotals.set(d.source, (nameTotals.get(d.source) || 0) + d.value);
            nameTotals.set(d.target, (nameTotals.get(d.target) || 0) + d.value);
        });

        viz1Data = viz1Data.filter(d => {
            const sourceTotal = nameTotals.get(d.source) || 0;
            const targetTotal = nameTotals.get(d.target) || 0;
            return sourceTotal > 0 && targetTotal > 0 && d.value > 1;
        });

        const decadeStats = d3.rollup(
            spaceData.filter(d => d.Datum && d['Status Mission']),
            v => v.length,
            d => parseDecade(d.Datum),
            d => d['Status Mission']
        );

        const shieldData = Array.from(decadeStats, ([decade, statuses]) => {
            if (!decade || decade < 1950) return null;
            const statusMap = new Map(statuses);
            const success = statusMap.get("Success") || 0;
            const failure = statusMap.get("Failure") || 0;
            const total = success + failure;
            return {
                Decade: decade,
                Success: success,
                Failure: failure,
                Rate: total > 0 ? success / total : 0
            };
        }).filter(d => d).sort((a, b) => a.Decade - b.Decade);

        const threatData = neoData.map(d => {
            const missDistance = parseFloat(d['CA Distance Nominal (LD)']);
            const hMag = parseFloat(d['H (mag)']);

            if (isNaN(missDistance) || isNaN(hMag)) {
                return null;
            }
            return {
                Miss_Distance_LD: missDistance,
                H_mag: hMag
            };
        }).filter(d => d);

        const viz6Data = { shield: shieldData, threats: threatData };

        vis1.selectAll("text").remove();
        vis2.selectAll("text").remove();

        console.log('Sanyam: Drawing visualizations');
        drawBothVisualizations(viz1Data, viz6Data);

    }).catch(function (error) {
        console.error('Sanyam: Error loading data', error);
        vis1.selectAll("text").remove();
        vis2.selectAll("text").remove();
        vis1.append("text")
            .attr("x", visWidth1 / 2)
            .attr("y", visHeight1 / 2)
            .attr("text-anchor", "middle")
            .style("fill", "#ef4444")
            .text("Error loading data: " + error.message);
        vis2.append("text")
            .attr("x", visWidth2 / 2)
            .attr("y", visHeight2 / 2)
            .attr("text-anchor", "middle")
            .style("fill", "#ef4444")
            .text("Error loading data: " + error.message);
    });
})();
