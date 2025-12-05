(function () {
	const sakshiTypeMap = {
		'CASC': 'State', 'Roscosmos': 'State', 'ISRO': 'State', 'JAXA': 'State',
		'VKS RF': 'State', 'ISA': 'State', 'IRGC': 'State', 'ESA': 'State',
		'KARI': 'State', 'CNSA': 'State', 'Khrunichev': 'State', 'KCST': 'State',
		'NASA': 'State', 'Kosmotras': 'State', 'Eurockot': 'State',
		'SpaceX': 'Private', 'ULA': 'Private', 'Arianespace': 'Private',
		'Rocket Lab': 'Private', 'Blue Origin': 'Private', 'Virgin Orbit': 'Private',
		'Northrop': 'Private', 'MHI': 'Private', 'ExPace': 'Private',
		'i-Space': 'Private', 'OneSpace': 'Private', 'Exos': 'Private',
		'IAI': 'Private', 'Firefly': 'Private', 'Astra': 'Private',
		'Relativity': 'Private', 'ABL': 'Private', 'Sea Launch': 'Private',
		'ILS': 'Private', 'Land Launch': 'Private', 'Landspace': 'Private',
		'CASIC': 'Private'
	};

	const sakshiMargin = { top: 40, right: 50, bottom: 60, left: 60 };
	const sakshiContainer = d3.select("#aadiss-viz-stream");
	const sakshiContainerWidth = sakshiContainer.node() ? sakshiContainer.node().clientWidth : 1200;
	const sakshiWidth = sakshiContainerWidth - sakshiMargin.left - sakshiMargin.right;
	const sakshiHeight = 600 - sakshiMargin.top - sakshiMargin.bottom;

	const sakshiSvg = sakshiContainer
		.append("svg")
		.attr("width", sakshiWidth + sakshiMargin.left + sakshiMargin.right)
		.attr("height", sakshiHeight + sakshiMargin.top + sakshiMargin.bottom)
		.append("g")
		.attr("transform", `translate(${sakshiMargin.left},${sakshiMargin.top})`);

	const sakshiTooltip = d3.select("#aadiss-tooltip-stream");

	let sakshiYears, sakshiAggregated, sakshiSeries, sakshiXScale, sakshiYScale, sakshiLayers;
	let sakshiSelectedType = null;
	let sakshiAllYears, sakshiAllProcessedData;
	let sakshiStartYearIndex = 0;
	let sakshiEndYearIndex = 0;

	fetch("Space_Corrected.csv")
		.then(sakshiResponse => sakshiResponse.text())
		.then(sakshiCsvText => {
			const sakshiData = d3.csvParse(sakshiCsvText);
			sakshiProcessData(sakshiData);
		})
		.catch(sakshiError => {
			console.error("Error loading the CSV file:", sakshiError);
			d3.select("#aadiss-viz-stream")
				.append("p")
				.style("color", "red")
				.text("Error loading data. Make sure 'Space_Corrected.csv' is in the same directory.");
		});

	function sakshiProcessData(sakshiData) {
		sakshiAllProcessedData = sakshiData.map(sakshiD => {
			const sakshiDateString = sakshiD.Datum;
			let sakshiYear = null;
			const sakshiYearMatch = sakshiDateString.match(/(\d{4})/);
			if (sakshiYearMatch) sakshiYear = +sakshiYearMatch[1];

			const sakshiCompanyName = sakshiD['Company Name'];
			let sakshiCompanyType = 'Private';

			for (const [sakshiCompany, sakshiType] of Object.entries(sakshiTypeMap)) {
				if (sakshiCompanyName && sakshiCompanyName.includes(sakshiCompany)) {
					sakshiCompanyType = sakshiType;
					break;
				}
			}

			return { year: sakshiYear, companyType: sakshiCompanyType, company: sakshiCompanyName };
		}).filter(sakshiD => sakshiD.year !== null);

		const sakshiProcessedData = sakshiAllProcessedData;

		sakshiAggregated = d3.rollup(
			sakshiProcessedData,
			sakshiV => sakshiV.length,
			sakshiD => sakshiD.year,
			sakshiD => sakshiD.companyType
		);

		sakshiAllYears = Array.from(new Set(sakshiProcessedData.map(sakshiD => sakshiD.year))).sort((sakshiA, sakshiB) => sakshiA - sakshiB);
		sakshiYears = [...sakshiAllYears];

		const sakshiSlider = d3.select("#aadiss-yearSlider-stream");
		sakshiSlider.attr("min", 0).attr("max", sakshiYears.length - 1).attr("value", sakshiYears.length - 1);

		sakshiEndYearIndex = sakshiAllYears.length - 1;
		const sakshiRangeStart = d3.select("#aadiss-rangeStart-stream");
		const sakshiRangeEnd = d3.select("#aadiss-rangeEnd-stream");
		sakshiRangeStart.attr("min", 0).attr("max", sakshiAllYears.length - 1).attr("value", 0);
		sakshiRangeEnd.attr("min", 0).attr("max", sakshiAllYears.length - 1).attr("value", sakshiAllYears.length - 1);
		d3.select("#aadiss-rangeStartLabel-stream").text(sakshiAllYears[0]);
		d3.select("#aadiss-rangeEndLabel-stream").text(sakshiAllYears[sakshiAllYears.length - 1]);

		sakshiUpdateStats(sakshiProcessedData, sakshiYears);

		sakshiDrawVisualization();
	}

	function sakshiUpdateStats(sakshiProcessedData, sakshiYearsArray) {
		const sakshiTotalLaunches = sakshiProcessedData.length;
		const sakshiStateLaunches = sakshiProcessedData.filter(sakshiD => sakshiD.companyType === 'State').length;
		const sakshiPrivateLaunches = sakshiProcessedData.filter(sakshiD => sakshiD.companyType === 'Private').length;

		sakshiAnimateValue("aadiss-totalLaunches-stream", 0, sakshiTotalLaunches, 1000);
		sakshiAnimateValue("aadiss-stateLaunches-stream", 0, sakshiStateLaunches, 1000);
		sakshiAnimateValue("aadiss-privateLaunches-stream", 0, sakshiPrivateLaunches, 1000);
		d3.select("#aadiss-yearRange-stream").text(`${sakshiYearsArray[0]} - ${sakshiYearsArray[sakshiYearsArray.length - 1]}`);
	}

	function sakshiAnimateValue(sakshiId, sakshiStart, sakshiEnd, sakshiDuration) {
		const sakshiElement = d3.select(`#${sakshiId}`);
		if (sakshiElement.empty()) return;
		const sakshiRange = sakshiEnd - sakshiStart;
		const sakshiIncrement = sakshiEnd > sakshiStart ? 1 : -1;
		const sakshiStepTime = Math.abs(Math.floor(sakshiDuration / sakshiRange));
		let sakshiCurrent = sakshiStart;

		const sakshiTimer = setInterval(() => {
			sakshiCurrent += sakshiIncrement;
			sakshiElement.text(sakshiCurrent);
			if (sakshiCurrent === sakshiEnd) clearInterval(sakshiTimer);
		}, sakshiStepTime);
	}

	function sakshiDrawVisualization() {
		const sakshiCompanyTypes = ['State', 'Private'];

		const sakshiStackData = sakshiYears.map(sakshiYear => {
			const sakshiObj = { year: sakshiYear };
			sakshiCompanyTypes.forEach(sakshiType => {
				sakshiObj[sakshiType] = sakshiAggregated.get(sakshiYear)?.get(sakshiType) || 0;
			});
			return sakshiObj;
		});

		const sakshiStack = d3.stack()
			.keys(sakshiCompanyTypes)
			.offset(d3.stackOffsetWiggle)
			.order(d3.stackOrderNone);

		sakshiSeries = sakshiStack(sakshiStackData);

		sakshiXScale = d3.scaleLinear()
			.domain(d3.extent(sakshiYears))
			.range([0, sakshiWidth]);

		sakshiYScale = d3.scaleLinear()
			.domain([
				d3.min(sakshiSeries, sakshiS => d3.min(sakshiS, sakshiD => sakshiD[0])),
				d3.max(sakshiSeries, sakshiS => d3.max(sakshiS, sakshiD => sakshiD[1]))
			])
			.range([sakshiHeight, 0]);

		const sakshiColorScale = d3.scaleOrdinal()
			.domain(['State', 'Private'])
			.range(['#4CAF50', '#FF6B35']);
		const sakshiArea = d3.area()
			.x(sakshiD => sakshiXScale(sakshiD.data.year))
			.y0(sakshiD => sakshiYScale(sakshiD[0]))
			.y1(sakshiD => sakshiYScale(sakshiD[1]))
			.curve(d3.curveBasis);

		sakshiLayers = sakshiSvg.selectAll(".aadiss-layer")
			.data(sakshiSeries)
			.enter()
			.append("path")
			.attr("class", "aadiss-layer")
			.attr("d", sakshiArea)
			.attr("fill", sakshiD => sakshiColorScale(sakshiD.key))
			.attr("opacity", 0)
			.on("click", function (sakshiEvent, sakshiD) {
				sakshiToggleLayer(sakshiD.key);
			})
			.on("mouseover", function (sakshiEvent, sakshiD) {
				if (!sakshiSelectedType || sakshiSelectedType === sakshiD.key) {
					d3.select(this)
						.classed("aadiss-highlighted", true)
						.attr("stroke", "#fff")
						.attr("stroke-width", 2);
				}
			})
			.on("mouseout", function (sakshiEvent, sakshiD) {
				d3.select(this)
					.classed("aadiss-highlighted", false)
					.attr("stroke", "none");
			})
			.on("mousemove", function (sakshiEvent, sakshiD) {
				const [sakshiMouseX] = d3.pointer(sakshiEvent);
				const sakshiYear = Math.round(sakshiXScale.invert(sakshiMouseX));
				const sakshiValue = sakshiAggregated.get(sakshiYear)?.get(sakshiD.key) || 0;
				const sakshiStateValue = sakshiAggregated.get(sakshiYear)?.get('State') || 0;
				const sakshiPrivateValue = sakshiAggregated.get(sakshiYear)?.get('Private') || 0;
				const sakshiTotal = sakshiStateValue + sakshiPrivateValue;
				const sakshiPercentage = sakshiTotal > 0 ? ((sakshiValue / sakshiTotal) * 100).toFixed(1) : 0;

				sakshiTooltip
					.style("display", "block")
					.style("left", (sakshiEvent.pageX + 10) + "px")
					.style("top", (sakshiEvent.pageY - 20) + "px")
					.html(`
					<div style="border-bottom: 2px solid ${sakshiD.key === 'State' ? '#4CAF50' : '#FF6B35'}; padding-bottom: 5px; margin-bottom: 5px;">
						<strong style="font-size: 14px;">${sakshiD.key} Organizations</strong>
					</div>
					<div style="margin: 5px 0;"> <strong>Year:</strong> ${sakshiYear}</div>
					<div style="margin: 5px 0;"> <strong>Launches:</strong> ${sakshiValue}</div>
					<div style="margin: 5px 0;"> <strong>Share:</strong> ${sakshiPercentage}% of total</div>
					<div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #444; font-size: 11px; color: #aaa;">
						Total launches in ${sakshiYear}: ${sakshiTotal}
					</div>
				`);
			})
			.on("mouseleave", function () {
				sakshiTooltip.style("display", "none");
			});

		sakshiLayers.transition()
			.duration(1500)
			.delay((sakshiD, sakshiI) => sakshiI * 200)
			.attr("opacity", 0.8);

		const sakshiYearLine = sakshiSvg.append("line")
			.attr("class", "aadiss-year-line")
			.attr("y1", 0)
			.attr("y2", sakshiHeight);

		const sakshiYearLabel = sakshiSvg.append("text")
			.attr("class", "aadiss-year-label")
			.attr("text-anchor", "middle");

		const sakshiOverlay = sakshiSvg.append("rect")
			.attr("width", sakshiWidth)
			.attr("height", sakshiHeight)
			.attr("fill", "none")
			.attr("pointer-events", "none")
			.lower();

		sakshiSvg.on("mousemove", function (sakshiEvent) {
			const [sakshiMouseX] = d3.pointer(sakshiEvent);
			if (sakshiMouseX >= 0 && sakshiMouseX <= sakshiWidth) {
				const sakshiYear = Math.round(sakshiXScale.invert(sakshiMouseX));

				sakshiYearLine
					.attr("x1", sakshiMouseX)
					.attr("x2", sakshiMouseX)
					.attr("opacity", 0.3);

				sakshiYearLabel
					.attr("x", sakshiMouseX)
					.attr("y", -10)
					.text(sakshiYear)
					.attr("opacity", 0.8);
			}
		})
			.on("mouseleave", function () {
				sakshiYearLine.attr("opacity", 0);
				sakshiYearLabel.attr("opacity", 0);
			});

		const sakshiXAxis = d3.axisBottom(sakshiXScale)
			.tickFormat(d3.format("d"))
			.ticks(20);

		sakshiSvg.append("g")
			.attr("class", "aadiss-axis aadiss-x-axis")
			.attr("transform", `translate(0,${sakshiHeight})`)
			.call(sakshiXAxis)
			.selectAll("text")
			.attr("transform", "rotate(-45)")
			.style("text-anchor", "end");

		sakshiYears.forEach(sakshiYear => {
			sakshiSvg.append("line")
				.attr("x1", sakshiXScale(sakshiYear))
				.attr("x2", sakshiXScale(sakshiYear))
				.attr("y1", 0)
				.attr("y2", sakshiHeight)
				.attr("stroke", "#444")
				.attr("stroke-width", 1)
				.attr("opacity", 0.3)
				.attr("stroke-dasharray", "2,4")
				.style("filter", "blur(0.5px)")
				.lower();
		});
		sakshiSvg.append("g")
			.attr("class", "aadiss-axis aadiss-y-axis")
			.call(d3.axisLeft(sakshiYScale).ticks(10));

		sakshiSvg.append("text")
			.attr("transform", `translate(${sakshiWidth / 2},${sakshiHeight + 50})`)
			.style("text-anchor", "middle")
			.style("fill", "#888")
			.style("font-size", "14px")
			.text("Year");

		sakshiSvg.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0 - sakshiMargin.left)
			.attr("x", 0 - (sakshiHeight / 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style("fill", "#888")
			.style("font-size", "14px")
			.text("Launch Count (Streamgraph Offset)");

		sakshiSetupControls();
	}

	function sakshiToggleLayer(sakshiType) {
		if (sakshiSelectedType === sakshiType) {
			sakshiSelectedType = null;
			sakshiLayers.classed("aadiss-dimmed", false);
			sakshiLayers.attr("stroke", "none").attr("stroke-width", 0);
		} else {
			sakshiSelectedType = sakshiType;
			sakshiLayers.each(function (sakshiD) {
				const sakshiIsSelected = sakshiD.key === sakshiType;
				d3.select(this)
					.classed("aadiss-dimmed", !sakshiIsSelected)
					.attr("stroke", sakshiIsSelected ? "#fff" : "none")
					.attr("stroke-width", sakshiIsSelected ? 2 : 0);
			});
		}
	}

	function sakshiSetupControls() {
		d3.selectAll(".aadiss-legend-item").on("click", function () {
			const sakshiType = d3.select(this).attr("data-type");
			sakshiToggleLayer(sakshiType);
		});

		const sakshiRangeStart = d3.select("#aadiss-rangeStart-stream");
		const sakshiRangeEnd = d3.select("#aadiss-rangeEnd-stream");
		const sakshiRangeStartLabel = d3.select("#aadiss-rangeStartLabel-stream");
		const sakshiRangeEndLabel = d3.select("#aadiss-rangeEndLabel-stream");
		const sakshiRangeFill = d3.select("#aadiss-rangeSliderFill-stream");

		function sakshiUpdateRangeFill() {
			const sakshiStartPercent = (sakshiStartYearIndex / (sakshiAllYears.length - 1)) * 100;
			const sakshiEndPercent = (sakshiEndYearIndex / (sakshiAllYears.length - 1)) * 100;
			sakshiRangeFill.style("left", sakshiStartPercent + "%");
			sakshiRangeFill.style("width", (sakshiEndPercent - sakshiStartPercent) + "%");
		}

		sakshiRangeStart.on("input", function () {
			sakshiStartYearIndex = +this.value;
			if (sakshiStartYearIndex > sakshiEndYearIndex) {
				sakshiStartYearIndex = sakshiEndYearIndex;
				this.value = sakshiStartYearIndex;
			}
			sakshiRangeStartLabel.text(sakshiAllYears[sakshiStartYearIndex]);
			sakshiUpdateRangeFill();
			sakshiUpdatePeriod();
		});

		sakshiRangeEnd.on("input", function () {
			sakshiEndYearIndex = +this.value;
			if (sakshiEndYearIndex < sakshiStartYearIndex) {
				sakshiEndYearIndex = sakshiStartYearIndex;
				this.value = sakshiEndYearIndex;
			}
			sakshiRangeEndLabel.text(sakshiAllYears[sakshiEndYearIndex]);
			sakshiUpdateRangeFill();
			sakshiUpdatePeriod();
		});

		d3.select("#aadiss-resetPeriodBtn-stream").on("click", function () {
			sakshiStartYearIndex = 0;
			sakshiEndYearIndex = sakshiAllYears.length - 1;
			d3.select("#aadiss-rangeStart-stream").property("value", 0);
			d3.select("#aadiss-rangeEnd-stream").property("value", sakshiAllYears.length - 1);
			d3.select("#aadiss-rangeStartLabel-stream").text(sakshiAllYears[0]);
			d3.select("#aadiss-rangeEndLabel-stream").text(sakshiAllYears[sakshiAllYears.length - 1]);
			sakshiUpdateRangeFill();
			sakshiUpdatePeriod();
		});

		sakshiUpdateRangeFill();
	}

	function sakshiUpdatePeriod() {
		const sakshiStartYear = sakshiAllYears[sakshiStartYearIndex];
		const sakshiEndYear = sakshiAllYears[sakshiEndYearIndex];

		const sakshiFilteredData = sakshiAllProcessedData.filter(sakshiD => sakshiD.year >= sakshiStartYear && sakshiD.year <= sakshiEndYear);
		sakshiYears = sakshiAllYears.slice(sakshiStartYearIndex, sakshiEndYearIndex + 1);

		sakshiAggregated = d3.rollup(
			sakshiFilteredData,
			sakshiV => sakshiV.length,
			sakshiD => sakshiD.year,
			sakshiD => sakshiD.companyType
		);

		sakshiUpdateStats(sakshiFilteredData, sakshiYears);

		sakshiRedrawVisualization();
	}

	function sakshiRedrawVisualization() {
		const sakshiCompanyTypes = ['State', 'Private'];

		const sakshiStackData = sakshiYears.map(sakshiYear => {
			const sakshiObj = { year: sakshiYear };
			sakshiCompanyTypes.forEach(sakshiType => {
				sakshiObj[sakshiType] = sakshiAggregated.get(sakshiYear)?.get(sakshiType) || 0;
			});
			return sakshiObj;
		});

		const sakshiStack = d3.stack()
			.keys(sakshiCompanyTypes)
			.offset(d3.stackOffsetWiggle)
			.order(d3.stackOrderNone);

		sakshiSeries = sakshiStack(sakshiStackData);

		sakshiXScale.domain(d3.extent(sakshiYears));
		sakshiYScale.domain([
			d3.min(sakshiSeries, sakshiS => d3.min(sakshiS, sakshiD => sakshiD[0])),
			d3.max(sakshiSeries, sakshiS => d3.max(sakshiS, sakshiD => sakshiD[1]))
		]);

		sakshiSvg.select(".aadiss-x-axis")
			.transition()
			.duration(750)
			.call(d3.axisBottom(sakshiXScale).tickFormat(d3.format("d")).ticks(Math.min(20, sakshiYears.length)));

		sakshiSvg.select(".aadiss-y-axis")
			.transition()
			.duration(750)
			.call(d3.axisLeft(sakshiYScale).ticks(10));

		const sakshiColorScale = d3.scaleOrdinal()
			.domain(['State', 'Private'])
			.range(['#4CAF50', '#FF6B35']);

		const sakshiArea = d3.area()
			.x(sakshiD => sakshiXScale(sakshiD.data.year))
			.y0(sakshiD => sakshiYScale(sakshiD[0]))
			.y1(sakshiD => sakshiYScale(sakshiD[1]))
			.curve(d3.curveBasis);

		sakshiLayers.data(sakshiSeries)
			.transition()
			.duration(750)
			.attr("d", sakshiArea);
	}

	function sakshiUpdateVisualizationByPeriod(sakshiPeriod) {
		console.log('Updating streamgraph for period:', sakshiPeriod);

		sakshiStartYearIndex = 0;
		sakshiEndYearIndex = sakshiAllYears.length - 1;

		const sakshiRangeStart = d3.select("#aadiss-rangeStart-stream");
		const sakshiRangeEnd = d3.select("#aadiss-rangeEnd-stream");
		if (!sakshiRangeStart.empty()) sakshiRangeStart.property("value", sakshiStartYearIndex);
		if (!sakshiRangeEnd.empty()) sakshiRangeEnd.property("value", sakshiEndYearIndex);

		sakshiUpdatePeriod();

		if (sakshiPeriod === 'intro') {
			sakshiLayers.transition().duration(800)
				.attr("opacity", 0.8)
				.attr("stroke", 'none')
				.attr("stroke-width", 0);

		} else if (sakshiPeriod === '2006-2010') {
			sakshiLayers.transition().duration(800)
				.attr("opacity", sakshiD => sakshiD.key === 'State' ? 1.0 : 0.15)
				.attr("stroke", sakshiD => sakshiD.key === 'State' ? '#4ade80' : 'none')
				.attr("stroke-width", sakshiD => sakshiD.key === 'State' ? 2 : 0);

		} else if (sakshiPeriod === '2011-2015') {
			sakshiLayers.transition().duration(800)
				.attr("opacity", sakshiD => sakshiD.key === 'Private' ? 0.9 : 0.6)
				.attr("stroke", sakshiD => sakshiD.key === 'Private' ? '#fb923c' : 'none')
				.attr("stroke-width", sakshiD => sakshiD.key === 'Private' ? 2 : 0);

		} else if (sakshiPeriod === '2016-2020') {
			sakshiLayers.transition().duration(800)
				.attr("opacity", sakshiD => sakshiD.key === 'Private' ? 1.0 : 0.15)
				.attr("stroke", sakshiD => sakshiD.key === 'Private' ? '#fb923c' : 'none')
				.attr("stroke-width", sakshiD => sakshiD.key === 'Private' ? 2 : 0);

		} else if (sakshiPeriod === 'conclusion') {
			sakshiLayers.transition().duration(800)
				.attr("opacity", 0.85)
				.attr("stroke", 'none')
				.attr("stroke-width", 0);
		}
	}

	function sakshiSetupScrollytelling() {
		console.log('Setting up streamgraph scrollytelling...');

		const sakshiScrollyContainers = document.querySelectorAll('.aadiss-scrolly-container');
		if (sakshiScrollyContainers.length === 0) {
			console.log('No scrolly-container found');
			return;
		}

		const sakshiStreamContainer = sakshiScrollyContainers[0];
		const sakshiStorySteps = sakshiStreamContainer.querySelectorAll('.aadiss-story-step');

		console.log('Found streamgraph story steps:', sakshiStorySteps.length);

		if (sakshiStorySteps.length === 0) {
			console.log('No story steps found for streamgraph scrollytelling');
			return;
		}

		let sakshiCurrentStepIndex = -1;

		function sakshiHandleScroll() {
			const sakshiWindowHeight = window.innerHeight;
			let sakshiActiveIndex = -1;

			sakshiStorySteps.forEach((sakshiStep, sakshiIndex) => {
				const sakshiRect = sakshiStep.getBoundingClientRect();
				const sakshiStepMiddle = sakshiRect.top + sakshiRect.height / 2;
				const sakshiIsInRange = sakshiStepMiddle >= 0 && sakshiStepMiddle <= sakshiWindowHeight * 0.6;

				if (sakshiIsInRange) {
					sakshiActiveIndex = sakshiIndex;
				}
			});

			if (sakshiActiveIndex !== sakshiCurrentStepIndex && sakshiActiveIndex >= 0) {
				sakshiCurrentStepIndex = sakshiActiveIndex;
				const sakshiNewPeriod = sakshiStorySteps[sakshiActiveIndex].dataset.period;
				console.log('Streamgraph scroll: activating step', sakshiActiveIndex, 'period:', sakshiNewPeriod);

				sakshiStorySteps.forEach((sakshiStep, sakshiI) => {
					if (sakshiI === sakshiActiveIndex) {
						sakshiStep.classList.add('aadiss-active');
					} else {
						sakshiStep.classList.remove('aadiss-active');
					}
				});

				sakshiUpdateVisualizationByPeriod(sakshiNewPeriod);
			}
		}

		window.addEventListener('scroll', sakshiHandleScroll, { passive: true });
		setTimeout(sakshiHandleScroll, 100);
		setTimeout(sakshiHandleScroll, 500);
		setTimeout(sakshiHandleScroll, 1000);

		console.log('Streamgraph scrollytelling setup complete');
	}

	setTimeout(sakshiSetupScrollytelling, 1500);
})();
