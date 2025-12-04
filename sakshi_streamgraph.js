(function () {
	// Company type mapping
	const companyTypeMapping = {
		// State organizations
		'CASC': 'State', 'Roscosmos': 'State', 'ISRO': 'State', 'JAXA': 'State',
		'VKS RF': 'State', 'ISA': 'State', 'IRGC': 'State', 'ESA': 'State',
		'KARI': 'State', 'CNSA': 'State', 'Khrunichev': 'State', 'KCST': 'State',
		'NASA': 'State', 'Kosmotras': 'State', 'Eurockot': 'State',

		// Private companies
		'SpaceX': 'Private', 'ULA': 'Private', 'Arianespace': 'Private',
		'Rocket Lab': 'Private', 'Blue Origin': 'Private', 'Virgin Orbit': 'Private',
		'Northrop': 'Private', 'MHI': 'Private', 'ExPace': 'Private',
		'i-Space': 'Private', 'OneSpace': 'Private', 'Exos': 'Private',
		'IAI': 'Private', 'Firefly': 'Private', 'Astra': 'Private',
		'Relativity': 'Private', 'ABL': 'Private', 'Sea Launch': 'Private',
		'ILS': 'Private', 'Land Launch': 'Private', 'Landspace': 'Private',
		'CASIC': 'Private'
	};

	// Set up dimensions
	const margin = { top: 40, right: 50, bottom: 60, left: 60 };
	// Use container width if available
	const container = d3.select("#viz-stream");
	const containerWidth = container.node() ? container.node().clientWidth : 1200;
	const width = containerWidth - margin.left - margin.right;
	const height = 600 - margin.top - margin.bottom;

	// Create SVG
	const svg = container
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	// Tooltip
	const tooltip = d3.select("#tooltip-stream");

	// Global variables (scoped to IIFE)
	let years, aggregated, series, xScale, yScale, layers;
	let selectedType = null;
	let allYears, allProcessedData;
	let startYearIndex = 0;
	let endYearIndex = 0;

	// Load and process data
	fetch("Space_Corrected.csv")
		.then(response => response.text())
		.then(csvText => {
			const data = d3.csvParse(csvText);
			processData(data);
		})
		.catch(error => {
			console.error("Error loading the CSV file:", error);
			d3.select("#viz-stream")
				.append("p")
				.style("color", "red")
				.text("Error loading data. Make sure 'Space_Corrected.csv' is in the same directory.");
		});

	function processData(data) {
		// Process data
		allProcessedData = data.map(d => {
			const dateString = d.Datum;
			let year = null;
			const yearMatch = dateString.match(/(\d{4})/);
			if (yearMatch) year = +yearMatch[1];

			const companyName = d['Company Name'];
			let companyType = 'Private';

			for (const [company, type] of Object.entries(companyTypeMapping)) {
				if (companyName && companyName.includes(company)) {
					companyType = type;
					break;
				}
			}

			return { year, companyType, company: companyName };
		}).filter(d => d.year !== null);

		const processedData = allProcessedData;

		// Aggregate by year and company type
		aggregated = d3.rollup(
			processedData,
			v => v.length,
			d => d.year,
			d => d.companyType
		);

		// Get all years and sort them
		allYears = Array.from(new Set(processedData.map(d => d.year))).sort((a, b) => a - b);
		years = [...allYears];

		// Update slider range
		const slider = d3.select("#yearSlider-stream");
		slider.attr("min", 0).attr("max", years.length - 1).attr("value", years.length - 1);

		// Initialize period sliders
		endYearIndex = allYears.length - 1;
		const rangeStart = d3.select("#rangeStart-stream");
		const rangeEnd = d3.select("#rangeEnd-stream");
		rangeStart.attr("min", 0).attr("max", allYears.length - 1).attr("value", 0);
		rangeEnd.attr("min", 0).attr("max", allYears.length - 1).attr("value", allYears.length - 1);
		d3.select("#rangeStartLabel-stream").text(allYears[0]);
		d3.select("#rangeEndLabel-stream").text(allYears[allYears.length - 1]);

		// Update stats
		updateStats(processedData, years);

		// Draw the visualization
		drawVisualization();
	}

	function updateStats(processedData, yearsArray) {
		const totalLaunches = processedData.length;
		const stateLaunches = processedData.filter(d => d.companyType === 'State').length;
		const privateLaunches = processedData.filter(d => d.companyType === 'Private').length;

		animateValue("totalLaunches-stream", 0, totalLaunches, 1000);
		animateValue("stateLaunches-stream", 0, stateLaunches, 1000);
		animateValue("privateLaunches-stream", 0, privateLaunches, 1000);
		d3.select("#yearRange-stream").text(`${yearsArray[0]} - ${yearsArray[yearsArray.length - 1]}`);
	}

	function animateValue(id, start, end, duration) {
		const element = d3.select(`#${id}`);
		if (element.empty()) return;
		const range = end - start;
		const increment = end > start ? 1 : -1;
		const stepTime = Math.abs(Math.floor(duration / range));
		let current = start;

		const timer = setInterval(() => {
			current += increment;
			element.text(current);
			if (current === end) clearInterval(timer);
		}, stepTime);
	}

	function drawVisualization() {
		const companyTypes = ['State', 'Private'];

		// Prepare data for stacking
		const stackData = years.map(year => {
			const obj = { year: year };
			companyTypes.forEach(type => {
				obj[type] = aggregated.get(year)?.get(type) || 0;
			});
			return obj;
		});

		// Stack the data
		const stack = d3.stack()
			.keys(companyTypes)
			.offset(d3.stackOffsetWiggle)
			.order(d3.stackOrderNone);

		series = stack(stackData);

		// Set up scales
		xScale = d3.scaleLinear()
			.domain(d3.extent(years))
			.range([0, width]);

		yScale = d3.scaleLinear()
			.domain([
				d3.min(series, s => d3.min(s, d => d[0])),
				d3.max(series, s => d3.max(s, d => d[1]))
			])
			.range([height, 0]);

		// Color scale with gradient
		const colorScale = d3.scaleOrdinal()
			.domain(['State', 'Private'])
			.range(['#4CAF50', '#FF6B35']); // Green for State, Orange for Private    // Area generator
		const area = d3.area()
			.x(d => xScale(d.data.year))
			.y0(d => yScale(d[0]))
			.y1(d => yScale(d[1]))
			.curve(d3.curveBasis);

		// Draw the streamgraph with animation
		layers = svg.selectAll(".layer")
			.data(series)
			.enter()
			.append("path")
			.attr("class", "layer")
			.attr("d", area)
			.attr("fill", d => colorScale(d.key))
			.attr("opacity", 0)
			.on("click", function (event, d) {
				toggleLayer(d.key);
			})
			.on("mouseover", function (event, d) {
				if (!selectedType || selectedType === d.key) {
					d3.select(this)
						.classed("highlighted", true)
						.attr("stroke", "#fff")
						.attr("stroke-width", 2);
				}
			})
			.on("mouseout", function (event, d) {
				d3.select(this)
					.classed("highlighted", false)
					.attr("stroke", "none");
			})
			.on("mousemove", function (event, d) {
				const [mouseX] = d3.pointer(event);
				const year = Math.round(xScale.invert(mouseX));
				const value = aggregated.get(year)?.get(d.key) || 0;
				const stateValue = aggregated.get(year)?.get('State') || 0;
				const privateValue = aggregated.get(year)?.get('Private') || 0;
				const total = stateValue + privateValue;
				const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

				tooltip
					.style("display", "block")
					.style("left", (event.pageX + 10) + "px")
					.style("top", (event.pageY - 20) + "px")
					.html(`
					<div style="border-bottom: 2px solid ${d.key === 'State' ? '#4CAF50' : '#FF6B35'}; padding-bottom: 5px; margin-bottom: 5px;">
						<strong style="font-size: 14px;">${d.key} Organizations</strong>
					</div>
					<div style="margin: 5px 0;"> <strong>Year:</strong> ${year}</div>
					<div style="margin: 5px 0;"> <strong>Launches:</strong> ${value}</div>
					<div style="margin: 5px 0;"> <strong>Share:</strong> ${percentage}% of total</div>
					<div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #444; font-size: 11px; color: #aaa;">
						Total launches in ${year}: ${total}
					</div>
				`);
			})
			.on("mouseleave", function () {
				tooltip.style("display", "none");
			});

		// Animate layers in
		layers.transition()
			.duration(1500)
			.delay((d, i) => i * 200)
			.attr("opacity", 0.8);

		// Add year line and label
		const yearLine = svg.append("line")
			.attr("class", "year-line")
			.attr("y1", 0)
			.attr("y2", height);

		const yearLabel = svg.append("text")
			.attr("class", "year-label")
			.attr("text-anchor", "middle");

		const overlay = svg.append("rect")
			.attr("width", width)
			.attr("height", height)
			.attr("fill", "none")
			.attr("pointer-events", "none")
			.lower(); // Move to back

		// Add hover zone for year tracking
		svg.on("mousemove", function (event) {
			const [mouseX] = d3.pointer(event);
			if (mouseX >= 0 && mouseX <= width) {
				const year = Math.round(xScale.invert(mouseX));

				yearLine
					.attr("x1", mouseX)
					.attr("x2", mouseX)
					.attr("opacity", 0.3);

				yearLabel
					.attr("x", mouseX)
					.attr("y", -10)
					.text(year)
					.attr("opacity", 0.8);
			}
		})
			.on("mouseleave", function () {
				yearLine.attr("opacity", 0);
				yearLabel.attr("opacity", 0);
			});

		// Add X axis
		const xAxis = d3.axisBottom(xScale)
			.tickFormat(d3.format("d"))
			.ticks(20);

		svg.append("g")
			.attr("class", "axis x-axis")
			.attr("transform", `translate(0,${height})`)
			.call(xAxis)
			.selectAll("text")
			.attr("transform", "rotate(-45)")
			.style("text-anchor", "end");

		// Add vertical year separator lines
		years.forEach(year => {
			svg.append("line")
				.attr("x1", xScale(year))
				.attr("x2", xScale(year))
				.attr("y1", 0)
				.attr("y2", height)
				.attr("stroke", "#444")
				.attr("stroke-width", 1)
				.attr("opacity", 0.3)
				.attr("stroke-dasharray", "2,4")
				.style("filter", "blur(0.5px)")
				.lower(); // Move to back
		});    // Add Y axis
		svg.append("g")
			.attr("class", "axis y-axis")
			.call(d3.axisLeft(yScale).ticks(10));

		// Add axis labels
		svg.append("text")
			.attr("transform", `translate(${width / 2},${height + 50})`)
			.style("text-anchor", "middle")
			.style("fill", "#888")
			.style("font-size", "14px")
			.text("Year");

		svg.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0 - margin.left)
			.attr("x", 0 - (height / 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style("fill", "#888")
			.style("font-size", "14px")
			.text("Launch Count (Streamgraph Offset)");

		setupControls();
	}

	function toggleLayer(type) {
		if (selectedType === type) {
			selectedType = null;
			layers.classed("dimmed", false);
			// Remove white outline
			layers.attr("stroke", "none").attr("stroke-width", 0);
		} else {
			selectedType = type;
			layers.each(function (d) {
				const isSelected = d.key === type;
				d3.select(this)
					.classed("dimmed", !isSelected)
					.attr("stroke", isSelected ? "#fff" : "none")
					.attr("stroke-width", isSelected ? 2 : 0);
			});
		}
	}

	function setupControls() {
		// Legend click
		d3.selectAll(".legend-item").on("click", function () {
			const type = d3.select(this).attr("data-type");
			toggleLayer(type);
		});

		// Period range sliders
		const rangeStart = d3.select("#rangeStart-stream");
		const rangeEnd = d3.select("#rangeEnd-stream");
		const rangeStartLabel = d3.select("#rangeStartLabel-stream");
		const rangeEndLabel = d3.select("#rangeEndLabel-stream");
		const rangeFill = d3.select("#rangeSliderFill-stream");

		function updateRangeFill() {
			const startPercent = (startYearIndex / (allYears.length - 1)) * 100;
			const endPercent = (endYearIndex / (allYears.length - 1)) * 100;
			rangeFill.style("left", startPercent + "%");
			rangeFill.style("width", (endPercent - startPercent) + "%");
		}

		rangeStart.on("input", function () {
			startYearIndex = +this.value;
			if (startYearIndex > endYearIndex) {
				startYearIndex = endYearIndex;
				this.value = startYearIndex;
			}
			rangeStartLabel.text(allYears[startYearIndex]);
			updateRangeFill();
			updatePeriod();
		});

		rangeEnd.on("input", function () {
			endYearIndex = +this.value;
			if (endYearIndex < startYearIndex) {
				endYearIndex = startYearIndex;
				this.value = endYearIndex;
			}
			rangeEndLabel.text(allYears[endYearIndex]);
			updateRangeFill();
			updatePeriod();
		});

		// Reset period button
		d3.select("#resetPeriodBtn-stream").on("click", function () {
			startYearIndex = 0;
			endYearIndex = allYears.length - 1;
			d3.select("#rangeStart-stream").property("value", 0);
			d3.select("#rangeEnd-stream").property("value", allYears.length - 1);
			d3.select("#rangeStartLabel-stream").text(allYears[0]);
			d3.select("#rangeEndLabel-stream").text(allYears[allYears.length - 1]);
			updateRangeFill();
			updatePeriod();
		});

		// Initialize range fill
		updateRangeFill();
	}

	function updatePeriod() {
		// Filter data to selected period
		const startYear = allYears[startYearIndex];
		const endYear = allYears[endYearIndex];

		const filteredData = allProcessedData.filter(d => d.year >= startYear && d.year <= endYear);
		years = allYears.slice(startYearIndex, endYearIndex + 1);

		// Reaggregate data
		aggregated = d3.rollup(
			filteredData,
			v => v.length,
			d => d.year,
			d => d.companyType
		);

		// Update stats
		updateStats(filteredData, years);

		// Redraw visualization
		redrawVisualization();
	}

	function redrawVisualization() {
		const companyTypes = ['State', 'Private'];

		// Prepare data for stacking
		const stackData = years.map(year => {
			const obj = { year: year };
			companyTypes.forEach(type => {
				obj[type] = aggregated.get(year)?.get(type) || 0;
			});
			return obj;
		});

		// Stack the data
		const stack = d3.stack()
			.keys(companyTypes)
			.offset(d3.stackOffsetWiggle)
			.order(d3.stackOrderNone);

		series = stack(stackData);

		// Update scales
		xScale.domain(d3.extent(years));
		yScale.domain([
			d3.min(series, s => d3.min(s, d => d[0])),
			d3.max(series, s => d3.max(s, d => d[1]))
		]);

		// Update axes
		svg.select(".x-axis")
			.transition()
			.duration(750)
			.call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(Math.min(20, years.length)));

		svg.select(".y-axis")
			.transition()
			.duration(750)
			.call(d3.axisLeft(yScale).ticks(10));

		// Update layers
		const colorScale = d3.scaleOrdinal()
			.domain(['State', 'Private'])
			.range(['#4CAF50', '#FF6B35']);

		const area = d3.area()
			.x(d => xScale(d.data.year))
			.y0(d => yScale(d[0]))
			.y1(d => yScale(d[1]))
			.curve(d3.curveBasis);

		layers.data(series)
			.transition()
			.duration(750)
			.attr("d", area);
	}

	// Scrollytelling functionality
	function updateVisualizationByPeriod(period) {
		console.log('Updating streamgraph for period:', period);

		// Always show full timeline (1957-2020), just change highlighting
		// Reset to show all years if we've filtered before
		startYearIndex = 0;
		endYearIndex = allYears.length - 1;

		// Update UI elements if they exist
		const rangeStart = d3.select("#rangeStart-stream");
		const rangeEnd = d3.select("#rangeEnd-stream");
		if (!rangeStart.empty()) rangeStart.property("value", startYearIndex);
		if (!rangeEnd.empty()) rangeEnd.property("value", endYearIndex);

		// Update the visualization to show full timeline
		updatePeriod();

		// Apply intelligent highlighting based on the story narrative
		if (period === 'intro') {
			// Introduction: Show both layers equally to set the stage
			layers.transition().duration(800)
				.attr("opacity", 0.8)
				.attr("stroke", 'none')
				.attr("stroke-width", 0);

		} else if (period === '2006-2010') {
			// Government-Led Era: Emphasize State dominance
			// State layer bright, Private layer very dim
			layers.transition().duration(800)
				.attr("opacity", d => d.key === 'State' ? 1.0 : 0.15)
				.attr("stroke", d => d.key === 'State' ? '#4ade80' : 'none')
				.attr("stroke-width", d => d.key === 'State' ? 2 : 0);

		} else if (period === '2011-2015') {
			// Commercial Expansion Begins: Both visible, Private growing
			// Show transition - both layers visible with Private starting to shine
			layers.transition().duration(800)
				.attr("opacity", d => d.key === 'Private' ? 0.9 : 0.6)
				.attr("stroke", d => d.key === 'Private' ? '#fb923c' : 'none')
				.attr("stroke-width", d => d.key === 'Private' ? 2 : 0);

		} else if (period === '2016-2020') {
			// The Turning Point: Private sector takeover
			// Private layer bright, State layer dim
			layers.transition().duration(800)
				.attr("opacity", d => d.key === 'Private' ? 1.0 : 0.15)
				.attr("stroke", d => d.key === 'Private' ? '#fb923c' : 'none')
				.attr("stroke-width", d => d.key === 'Private' ? 2 : 0);

		} else if (period === 'conclusion') {
			// Conclusion: Show both to demonstrate the complete transformation
			layers.transition().duration(800)
				.attr("opacity", 0.85)
				.attr("stroke", 'none')
				.attr("stroke-width", 0);
		}
	}

	// Setup scrollytelling
	function setupScrollytelling() {
		console.log('Setting up streamgraph scrollytelling...');

		// Find story steps in the first scrolly-container (streamgraph)
		const scrollyContainers = document.querySelectorAll('.scrolly-container');
		if (scrollyContainers.length === 0) {
			console.log('No scrolly-container found');
			return;
		}

		// Get the first scrolly-container (streamgraph section)
		const streamContainer = scrollyContainers[0];
		const storySteps = streamContainer.querySelectorAll('.story-step');

		console.log('Found streamgraph story steps:', storySteps.length);

		if (storySteps.length === 0) {
			console.log('No story steps found for streamgraph scrollytelling');
			return;
		}

		let currentStepIndex = -1;

		function handleScroll() {
			const windowHeight = window.innerHeight;
			let activeIndex = -1;

			storySteps.forEach((step, index) => {
				const rect = step.getBoundingClientRect();
				const stepMiddle = rect.top + rect.height / 2;
				const isInRange = stepMiddle >= 0 && stepMiddle <= windowHeight * 0.6;

				if (isInRange) {
					activeIndex = index;
				}
			});

			if (activeIndex !== currentStepIndex && activeIndex >= 0) {
				currentStepIndex = activeIndex;
				const newPeriod = storySteps[activeIndex].dataset.period;
				console.log('Streamgraph scroll: activating step', activeIndex, 'period:', newPeriod);

				// Update visual state of story steps
				storySteps.forEach((step, i) => {
					if (i === activeIndex) {
						step.classList.add('active');
					} else {
						step.classList.remove('active');
					}
				});

				// Update visualization
				updateVisualizationByPeriod(newPeriod);
			}
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		setTimeout(handleScroll, 100);
		setTimeout(handleScroll, 500);
		setTimeout(handleScroll, 1000);

		console.log('Streamgraph scrollytelling setup complete');
	}

	// Initialize scrollytelling after data is loaded
	setTimeout(setupScrollytelling, 1500);
})();
