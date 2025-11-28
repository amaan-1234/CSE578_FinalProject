(function () {
	// Configuration
	const squareSize = 18;
	const squaresPerRow = 15;
	const squaresPerColumn = 10;
	const missionsPerSquare = 10;
	const maxSquares = squaresPerRow * squaresPerColumn; // 150 squares max

	// Color scale for decades
	const colorScale = d3.scaleSequential(d3.interpolateRainbow);

	// Tooltip
	const tooltip = d3.select("#tooltip-waffle");

	// Global variables (scoped)
	let allData = [];
	let decadeCounts = new Map();
	let currentDecade = 'all';

	// Load and process data
	fetch("Space_Corrected.csv")
		.then(response => response.text())
		.then(csvText => {
			const data = d3.csvParse(csvText);
			processData(data);
		})
		.catch(error => {
			console.error("Error loading the CSV file:", error);
			d3.select("#viz-waffle")
				.append("p")
				.style("color", "red")
				.text("Error loading data. Make sure 'Space_Corrected.csv' is in the same directory.");
		});

	function processData(data) {
		// Extract years and decades
		const processedData = data.map(d => {
			const dateString = d.Datum;
			const yearMatch = dateString.match(/(\d{4})/);
			if (yearMatch) {
				const year = +yearMatch[1];
				const decade = Math.floor(year / 10) * 10; // e.g., 2015 -> 2010
				return { year, decade };
			}
			return null;
		}).filter(d => d !== null);

		allData = processedData;

		// Aggregate by decade
		decadeCounts = d3.rollup(
			processedData,
			v => v.length,
			d => d.decade
		);

		// Get sorted decades
		const decades = Array.from(decadeCounts.keys()).sort((a, b) => a - b);

		// Set up color scale domain
		colorScale.domain([decades[0], decades[decades.length - 1] + 9]);

		// Populate dropdown
		populateDropdown(decades);

		// Initialize with all years
		createWaffleChart('all');
		createLegend(decades);

		// Setup dropdown listener
		d3.select("#yearSelect-waffle").on("change", function () {
			const selectedDecade = this.value;
			currentDecade = selectedDecade;
			updateWaffleChart(selectedDecade);
		});

		// Keyboard support for left/right arrows
		document.addEventListener('keydown', function (e) {
			const dropdown = document.getElementById('yearSelect-waffle');
			if (!dropdown) return;
			const options = Array.from(dropdown.options);
			let idx = options.findIndex(opt => opt.value === dropdown.value);
			if (e.key === 'ArrowLeft') {
				if (idx > 0) {
					dropdown.value = options[idx - 1].value;
					dropdown.dispatchEvent(new Event('change'));
				}
			} else if (e.key === 'ArrowRight') {
				if (idx < options.length - 1) {
					dropdown.value = options[idx + 1].value;
					dropdown.dispatchEvent(new Event('change'));
				}
			}
		});
	}

	function populateDropdown(decades) {
		const dropdown = d3.select("#yearSelect-waffle");
		if (dropdown.empty()) return;

		decades.forEach(decade => {
			dropdown.append("option")
				.attr("value", decade)
				.text(`${decade}s (${decadeCounts.get(decade)} missions)`);
		});
	}

	function createWaffleChart(decade) {
		const container = d3.select("#viz-waffle");
		if (container.empty()) return;
		container.html(""); // Clear existing

		const waffleContainer = container.append("div")
			.attr("class", "waffle-container");

		// Calculate count for selected decade
		let count;
		let displayLabel;

		if (decade === 'all') {
			count = allData.length;
			displayLabel = "All Decades Combined";
		} else {
			count = decadeCounts.get(+decade);
			displayLabel = `${decade}s`;
		}

		// Update stats
		animateCount(count);

		// Calculate number of squares needed
		let numSquares = Math.ceil(count / missionsPerSquare);
		numSquares = Math.min(numSquares, maxSquares); // Cap at max

		// Create SVG for waffle
		const svg = waffleContainer.append("svg")
			.attr("width", squaresPerRow * (squareSize + 3))
			.attr("height", squaresPerColumn * (squareSize + 3));

		// Create squares
		const squares = [];
		const fractional = count % missionsPerSquare;
		for (let i = 0; i < maxSquares; i++) {
			const row = Math.floor(i / squaresPerRow);
			const col = i % squaresPerRow;
			const isActive = i < numSquares;
			const isFractional = isActive && (i === numSquares - 1) && (fractional !== 0);
			squares.push({
				id: i,
				x: col * (squareSize + 3),
				y: row * (squareSize + 3),
				active: isActive,
				missions: isActive ? (i === numSquares - 1 ? count - (i * missionsPerSquare) : missionsPerSquare) : 0,
				fractional: isFractional,
				fraction: isFractional ? fractional / missionsPerSquare : 1
			});
		}

		// Draw squares with improved tooltips and partial-filling
		const defs = svg.selectAll('defs').data([null]);
		defs.join('defs').html(`
		<pattern id="diagonalMask" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
			<rect x="0" y="0" width="8" height="8" fill="white" opacity="0.5"/>
			<line x1="0" y1="0" x2="8" y2="8" stroke="#888" stroke-width="1" opacity="0.3"/>
		</pattern>
	`);

		// Compute a single color for the selected decade
		let decadeColor = (decade === 'all') ? '#4CAF50' : colorScale(+decade + 5);

		const squaresSel = svg.selectAll(".waffle-square")
			.data(squares, d => d.id)
			.join("rect")
			.attr("class", "waffle-square")
			.attr("x", d => d.x)
			.attr("y", d => d.y)
			.attr("width", squareSize)
			.attr("height", squareSize)
			.attr("rx", 2)
			.style("fill", d => {
				if (!d.active) return '#2a2a2a';
				if (d.fractional) return d3.color(decadeColor).brighter(1.5);
				return decadeColor;
			})
			.style("opacity", d => d.active ? 0 : 0.2)
			.style("cursor", d => d.active ? "pointer" : "default")
			.on("mouseover", function (event, d) {
				if (d.active) {
					d3.select(this)
						.transition()
						.duration(200)
						.style("opacity", 1)
						.attr("width", squareSize * 1.2)
						.attr("height", squareSize * 1.2)
						.attr("x", d.x - squareSize * 0.1)
						.attr("y", d.y - squareSize * 0.1);

					// Calculate mission range for this square
					let startMission = d.id * missionsPerSquare + 1;
					let endMission = d.id * missionsPerSquare + d.missions;
					if (d.missions === 0) {
						startMission = 0;
						endMission = 0;
					}

					tooltip
						.style("display", "block")
						.html(`
						<div class="tooltip-decade"><strong>${displayLabel}</strong></div>
						<div class="tooltip-info">
							<strong>Square #${d.id + 1}</strong><br>
							Missions: <strong>${d.missions}</strong><br>
							Range: <strong>${startMission}${d.missions > 1 ? ' - ' + endMission : ''}</strong>
							${d.fractional ? `<br><span style='color:#888;'>Partial square: ${d.missions}/${missionsPerSquare}</span>` : ''}
						</div>
						<div class="tooltip-info" style="margin-top: 5px;">
							Total in period: <strong>${count}</strong>
						</div>
					`);
				}
			})
			.on("mousemove", function (event) {
				tooltip
					.style("left", (event.pageX + 15) + "px")
					.style("top", (event.pageY - 30) + "px");
			})
			.on("mouseleave", function (event, d) {
				if (d.active) {
					d3.select(this)
						.transition()
						.duration(200)
						.style("opacity", 0.9)
						.attr("width", squareSize)
						.attr("height", squareSize)
						.attr("x", d.x)
						.attr("y", d.y);
				}
				tooltip.style("display", "none");
			})
			.transition()
			.delay((d, i) => i * 2)
			.duration(500)
			.style("opacity", d => d.active ? 0.9 : 0.2);

		// Add diagonal mask for fractional squares
		squaresSel.filter(d => d.fractional)
			.attr('clip-path', (d, i) => {
				// Clip to fraction
				const w = squareSize * d.fraction;
				const id = `clip-fraction-${d.id}`;
				svg.append('clipPath')
					.attr('id', id)
					.append('rect')
					.attr('x', d.x)
					.attr('y', d.y)
					.attr('width', w)
					.attr('height', squareSize);
				return `url(#${id})`;
			})
			.attr('fill', `url(#diagonalMask)`);
	}

	function updateWaffleChart(decade) {
		// Calculate count for selected decade
		let count;
		let displayLabel;

		if (decade === 'all') {
			count = allData.length;
			displayLabel = "All Decades Combined";
		} else {
			count = decadeCounts.get(+decade);
			displayLabel = `${decade}s`;
		}

		// Update stats
		animateCount(count);

		// Calculate number of squares needed
		let numSquares = Math.ceil(count / missionsPerSquare);
		numSquares = Math.min(numSquares, maxSquares);

		const svg = d3.select("#viz-waffle svg");

		// Update square data
		const squares = [];
		for (let i = 0; i < maxSquares; i++) {
			const row = Math.floor(i / squaresPerRow);
			const col = i % squaresPerRow;
			const isActive = i < numSquares;

			squares.push({
				id: i,
				x: col * (squareSize + 3),
				y: row * (squareSize + 3),
				active: isActive,
				missions: isActive ? (i === numSquares - 1 ? count - (i * missionsPerSquare) : missionsPerSquare) : 0
			});
		}

		// Morph the squares with staggered enter/exit animation
		const t = svg.transition().duration(800);
		svg.selectAll(".waffle-square")
			.data(squares, d => d.id)
			.join(
				enter => enter.append("rect")
					.attr("class", "waffle-square")
					.attr("x", d => d.x)
					.attr("y", d => d.y)
					.attr("width", squareSize)
					.attr("height", squareSize)
					.attr("rx", 2)
					.style("fill", d => d.active ? (decade === 'all' ? '#4CAF50' : colorScale(+decade + 5)) : '#2a2a2a')
					.style("opacity", 0)
					.style("cursor", d => d.active ? "pointer" : "default")
					.call(enter => enter.transition(t)
						.delay((d, i) => i * 10)
						.style("opacity", d => d.active ? 0.9 : 0.2)
					),
				update => update.call(update => update.transition(t)
					.delay((d, i) => i * 10)
					.style("fill", d => d.active ? (decade === 'all' ? '#4CAF50' : colorScale(+decade + 5)) : '#2a2a2a')
					.style("opacity", d => d.active ? 0.9 : 0.2)
					.style("cursor", d => d.active ? "pointer" : "default")
				),
				exit => exit.call(exit => exit.transition(t)
					.delay((d, i) => i * 10)
					.style("opacity", 0)
					.remove()
				)
			);
	}

	function animateCount(targetCount) {
		const element = d3.select("#currentCount-waffle");
		if (element.empty()) return;
		const startCount = +element.text() || 0;
		const duration = 1000;
		const steps = 50;
		const increment = (targetCount - startCount) / steps;
		const stepDuration = duration / steps;

		let current = startCount;
		let step = 0;

		const timer = setInterval(() => {
			step++;
			current += increment;

			if (step >= steps) {
				element.text(targetCount);
				clearInterval(timer);
			} else {
				element.text(Math.round(current));
			}
		}, stepDuration);
	}

	function createLegend(decades) {
		const legend = d3.select("#legend-waffle");
		if (legend.empty()) return;
		legend.html(""); // Clear existing

		// Create gradient legend
		const legendItem = legend.append("div")
			.attr("class", "legend-item")
			.style("flex-direction", "column")
			.style("align-items", "flex-start");

		legendItem.append("div")
			.style("font-weight", "bold")
			.style("margin-bottom", "10px")
			.text("Decade Color Scale:");

		const gradientContainer = legendItem.append("div")
			.style("display", "flex")
			.style("align-items", "center")
			.style("gap", "10px");

		// Create gradient bar
		const gradientSvg = gradientContainer.append("svg")
			.attr("width", 200)
			.attr("height", 20);

		const defs = gradientSvg.append("defs");
		const gradient = defs.append("linearGradient")
			.attr("id", "year-gradient")
			.attr("x1", "0%")
			.attr("y1", "0%")
			.attr("x2", "100%")
			.attr("y2", "0%");

		gradient.append("stop")
			.attr("offset", "0%")
			.attr("stop-color", colorScale(decades[0] + 5));

		gradient.append("stop")
			.attr("offset", "100%")
			.attr("stop-color", colorScale(decades[decades.length - 1] + 5));

		gradientSvg.append("rect")
			.attr("width", 200)
			.attr("height", 20)
			.attr("rx", 3)
			.style("fill", "url(#year-gradient)");

		gradientContainer.append("span")
			.style("font-size", "12px")
			.style("color", "#888")
			.text(`${decades[0]}s  0 ${decades[decades.length - 1]}s`);

		// Add info about squares
		const infoItem = legend.append("div")
			.attr("class", "legend-item")
			.style("margin-top", "10px");

		infoItem.append("div")
			.attr("class", "legend-color")
			.style("background-color", "#4CAF50")
			.style("width", "15px")
			.style("height", "15px");

		infoItem.append("span")
			.attr("class", "legend-label")
			.text("Each square = 10 missions");
	}
})();
