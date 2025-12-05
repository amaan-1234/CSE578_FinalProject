(function () {
	const sakshiSquareSize = 18;
	const sakshiSquaresPerRow = 15;
	const sakshiSquaresPerColumn = 10;
	const sakshiMissionsPerSquare = 10;
	const sakshiMaxSquares = sakshiSquaresPerRow * sakshiSquaresPerColumn;

	const sakshiColorScale = d3.scaleSequential(d3.interpolateRainbow);

	const sakshiTooltip = d3.select("#aadiss-tooltip-waffle");

	let sakshiAllData = [];
	let sakshiDecadeCounts = new Map();
	let sakshiCurrentDecade = 'all';

	fetch("Space_Corrected.csv")
		.then(sakshiResponse => sakshiResponse.text())
		.then(sakshiCsvText => {
			const sakshiData = d3.csvParse(sakshiCsvText);
			sakshiProcessData(sakshiData);
		})
		.catch(sakshiError => {
			console.error("Error loading the CSV file:", sakshiError);
			d3.select("#aadiss-viz-waffle")
				.append("p")
				.style("color", "red")
				.text("Error loading data. Make sure 'Space_Corrected.csv' is in the same directory.");
		});

	function sakshiProcessData(sakshiData) {
		const sakshiProcessedData = sakshiData.map(sakshiD => {
			const sakshiDateString = sakshiD.Datum;
			const sakshiYearMatch = sakshiDateString.match(/(\d{4})/);
			if (sakshiYearMatch) {
				const sakshiYear = +sakshiYearMatch[1];
				const sakshiDecade = Math.floor(sakshiYear / 10) * 10;
				return { year: sakshiYear, decade: sakshiDecade };
			}
			return null;
		}).filter(sakshiD => sakshiD !== null);

		sakshiAllData = sakshiProcessedData;

		sakshiDecadeCounts = d3.rollup(
			sakshiProcessedData,
			sakshiV => sakshiV.length,
			sakshiD => sakshiD.decade
		);

		const sakshiDecades = Array.from(sakshiDecadeCounts.keys()).sort((sakshiA, sakshiB) => sakshiA - sakshiB);

		sakshiColorScale.domain([sakshiDecades[0], sakshiDecades[sakshiDecades.length - 1] + 9]);

		sakshiPopulateDropdown(sakshiDecades);

		sakshiCreateWaffleChart('all');
		sakshiCreateLegend(sakshiDecades);

		d3.select("#aadiss-yearSelect-waffle").on("change", function () {
			const sakshiSelectedDecade = this.value;
			sakshiCurrentDecade = sakshiSelectedDecade;
			sakshiUpdateWaffleChart(sakshiSelectedDecade);
		});

		document.addEventListener('keydown', function (sakshiE) {
			const sakshiDropdown = document.getElementById('aadiss-yearSelect-waffle');
			if (!sakshiDropdown) return;
			const sakshiOptions = Array.from(sakshiDropdown.options);
			let sakshiIdx = sakshiOptions.findIndex(sakshiOpt => sakshiOpt.value === sakshiDropdown.value);
			if (sakshiE.key === 'ArrowLeft') {
				if (sakshiIdx > 0) {
					sakshiDropdown.value = sakshiOptions[sakshiIdx - 1].value;
					sakshiDropdown.dispatchEvent(new Event('change'));
				}
			} else if (sakshiE.key === 'ArrowRight') {
				if (sakshiIdx < sakshiOptions.length - 1) {
					sakshiDropdown.value = sakshiOptions[sakshiIdx + 1].value;
					sakshiDropdown.dispatchEvent(new Event('change'));
				}
			}
		});
	}

	function sakshiPopulateDropdown(sakshiDecades) {
		const sakshiDropdown = d3.select("#aadiss-yearSelect-waffle");
		if (sakshiDropdown.empty()) return;

		sakshiDecades.forEach(sakshiDecade => {
			sakshiDropdown.append("option")
				.attr("value", sakshiDecade)
				.text(`${sakshiDecade}s (${sakshiDecadeCounts.get(sakshiDecade)} missions)`);
		});
	}

	function sakshiCreateWaffleChart(sakshiDecade) {
		const sakshiContainer = d3.select("#aadiss-viz-waffle");
		if (sakshiContainer.empty()) return;
		sakshiContainer.html("");

		const sakshiWaffleContainer = sakshiContainer.append("div")
			.attr("class", "aadiss-waffle-container");

		let sakshiCount;
		let sakshiDisplayLabel;

		if (sakshiDecade === 'all') {
			sakshiCount = sakshiAllData.length;
			sakshiDisplayLabel = "All Decades Combined";
		} else {
			sakshiCount = sakshiDecadeCounts.get(+sakshiDecade);
			sakshiDisplayLabel = `${sakshiDecade}s`;
		}

		sakshiAnimateCount(sakshiCount);

		let sakshiNumSquares = Math.ceil(sakshiCount / sakshiMissionsPerSquare);
		sakshiNumSquares = Math.min(sakshiNumSquares, sakshiMaxSquares);

		const sakshiSvg = sakshiWaffleContainer.append("svg")
			.attr("width", sakshiSquaresPerRow * (sakshiSquareSize + 3))
			.attr("height", sakshiSquaresPerColumn * (sakshiSquareSize + 3));

		const sakshiSquares = [];
		const sakshiFractional = sakshiCount % sakshiMissionsPerSquare;
		for (let sakshiI = 0; sakshiI < sakshiMaxSquares; sakshiI++) {
			const sakshiRow = Math.floor(sakshiI / sakshiSquaresPerRow);
			const sakshiCol = sakshiI % sakshiSquaresPerRow;
			const sakshiIsActive = sakshiI < sakshiNumSquares;
			const sakshiIsFractional = sakshiIsActive && (sakshiI === sakshiNumSquares - 1) && (sakshiFractional !== 0);
			sakshiSquares.push({
				id: sakshiI,
				x: sakshiCol * (sakshiSquareSize + 3),
				y: sakshiRow * (sakshiSquareSize + 3),
				active: sakshiIsActive,
				missions: sakshiIsActive ? (sakshiI === sakshiNumSquares - 1 ? sakshiCount - (sakshiI * sakshiMissionsPerSquare) : sakshiMissionsPerSquare) : 0,
				fractional: sakshiIsFractional,
				fraction: sakshiIsFractional ? sakshiFractional / sakshiMissionsPerSquare : 1
			});
		}

		const sakshiDefs = sakshiSvg.selectAll('defs').data([null]);
		sakshiDefs.join('defs').html(`
		<pattern id="aadiss-diagonalMask" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
			<rect x="0" y="0" width="8" height="8" fill="white" opacity="0.5"/>
			<line x1="0" y1="0" x2="8" y2="8" stroke="#888" stroke-width="1" opacity="0.3"/>
		</pattern>
	`);

		let sakshiDecadeColor = (sakshiDecade === 'all') ? '#4CAF50' : sakshiColorScale(+sakshiDecade + 5);

		const sakshiSquaresSel = sakshiSvg.selectAll(".aadiss-waffle-square")
			.data(sakshiSquares, sakshiD => sakshiD.id)
			.join("rect")
			.attr("class", "aadiss-waffle-square")
			.attr("x", sakshiD => sakshiD.x)
			.attr("y", sakshiD => sakshiD.y)
			.attr("width", sakshiSquareSize)
			.attr("height", sakshiSquareSize)
			.attr("rx", 2)
			.style("fill", sakshiD => {
				if (!sakshiD.active) return '#2a2a2a';
				if (sakshiD.fractional) return d3.color(sakshiDecadeColor).brighter(1.5);
				return sakshiDecadeColor;
			})
			.style("opacity", sakshiD => sakshiD.active ? 0 : 0.2)
			.style("cursor", sakshiD => sakshiD.active ? "pointer" : "default")
			.on("mouseover", function (sakshiEvent, sakshiD) {
				if (sakshiD.active) {
					d3.select(this)
						.transition()
						.duration(200)
						.style("opacity", 1)
						.attr("width", sakshiSquareSize * 1.2)
						.attr("height", sakshiSquareSize * 1.2)
						.attr("x", sakshiD.x - sakshiSquareSize * 0.1)
						.attr("y", sakshiD.y - sakshiSquareSize * 0.1);

					let sakshiStartMission = sakshiD.id * sakshiMissionsPerSquare + 1;
					let sakshiEndMission = sakshiD.id * sakshiMissionsPerSquare + sakshiD.missions;
					if (sakshiD.missions === 0) {
						sakshiStartMission = 0;
						sakshiEndMission = 0;
					}

					sakshiTooltip
						.style("display", "block")
						.html(`
						<div class="aadiss-tooltip-decade"><strong>${sakshiDisplayLabel}</strong></div>
						<div class="aadiss-tooltip-info">
							<strong>Square #${sakshiD.id + 1}</strong><br>
							Missions: <strong>${sakshiD.missions}</strong><br>
							Range: <strong>${sakshiStartMission}${sakshiD.missions > 1 ? ' - ' + sakshiEndMission : ''}</strong>
							${sakshiD.fractional ? `<br><span style='color:#888;'>Partial square: ${sakshiD.missions}/${sakshiMissionsPerSquare}</span>` : ''}
						</div>
						<div class="aadiss-tooltip-info" style="margin-top: 5px;">
							Total in period: <strong>${sakshiCount}</strong>
						</div>
					`);
				}
			})
			.on("mousemove", function (sakshiEvent) {
				sakshiTooltip
					.style("left", (sakshiEvent.pageX + 15) + "px")
					.style("top", (sakshiEvent.pageY - 30) + "px");
			})
			.on("mouseleave", function (sakshiEvent, sakshiD) {
				if (sakshiD.active) {
					d3.select(this)
						.transition()
						.duration(200)
						.style("opacity", 0.9)
						.attr("width", sakshiSquareSize)
						.attr("height", sakshiSquareSize)
						.attr("x", sakshiD.x)
						.attr("y", sakshiD.y);
				}
				sakshiTooltip.style("display", "none");
			})
			.transition().delay((sakshiD, sakshiI) => sakshiI * 2)
			.duration(500)
			.style("opacity", sakshiD => sakshiD.active ? 0.9 : 0.2);

		sakshiSquaresSel.filter(sakshiD => sakshiD.fractional)
			.attr('clip-path', (sakshiD, sakshiI) => {
				const sakshiW = sakshiSquareSize * sakshiD.fraction;
				const sakshiId = `aadiss-clip-fraction-${sakshiD.id}`;
				sakshiSvg.append('clipPath')
					.attr('id', sakshiId)
					.append('rect')
					.attr('x', sakshiD.x)
					.attr('y', sakshiD.y)
					.attr('width', sakshiW)
					.attr('height', sakshiSquareSize);
				return `url(#${sakshiId})`;
			})
			.attr('fill', `url(#aadiss-diagonalMask)`);
	}

	function sakshiUpdateWaffleChart(sakshiDecade) {
		let sakshiCount;
		let sakshiDisplayLabel;

		if (sakshiDecade === 'all') {
			sakshiCount = sakshiAllData.length;
			sakshiDisplayLabel = "All Decades Combined";
		} else {
			sakshiCount = sakshiDecadeCounts.get(+sakshiDecade);
			sakshiDisplayLabel = `${sakshiDecade}s`;
		}

		sakshiAnimateCount(sakshiCount);

		let sakshiNumSquares = Math.ceil(sakshiCount / sakshiMissionsPerSquare);
		sakshiNumSquares = Math.min(sakshiNumSquares, sakshiMaxSquares);

		const sakshiSvg = d3.select("#aadiss-viz-waffle svg");

		const sakshiSquares = [];
		for (let sakshiI = 0; sakshiI < sakshiMaxSquares; sakshiI++) {
			const sakshiRow = Math.floor(sakshiI / sakshiSquaresPerRow);
			const sakshiCol = sakshiI % sakshiSquaresPerRow;
			const sakshiIsActive = sakshiI < sakshiNumSquares;

			sakshiSquares.push({
				id: sakshiI,
				x: sakshiCol * (sakshiSquareSize + 3),
				y: sakshiRow * (sakshiSquareSize + 3),
				active: sakshiIsActive,
				missions: sakshiIsActive ? (sakshiI === sakshiNumSquares - 1 ? sakshiCount - (sakshiI * sakshiMissionsPerSquare) : sakshiMissionsPerSquare) : 0
			});
		}

		const sakshiT = sakshiSvg.transition().duration(800);
		sakshiSvg.selectAll(".aadiss-waffle-square")
			.data(sakshiSquares, sakshiD => sakshiD.id)
			.join(
				sakshiEnter => sakshiEnter.append("rect")
					.attr("class", "aadiss-waffle-square")
					.attr("x", sakshiD => sakshiD.x)
					.attr("y", sakshiD => sakshiD.y)
					.attr("width", sakshiSquareSize)
					.attr("height", sakshiSquareSize)
					.attr("rx", 2)
					.style("fill", sakshiD => sakshiD.active ? (sakshiDecade === 'all' ? '#4CAF50' : sakshiColorScale(+sakshiDecade + 5)) : '#2a2a2a')
					.style("opacity", 0)
					.style("cursor", sakshiD => sakshiD.active ? "pointer" : "default")
					.call(sakshiEnter => sakshiEnter.transition(sakshiT)
						.delay((sakshiD, sakshiI) => sakshiI * 10)
						.style("opacity", sakshiD => sakshiD.active ? 0.9 : 0.2)
					),
				sakshiUpdate => sakshiUpdate.call(sakshiUpdate => sakshiUpdate.transition(sakshiT)
					.delay((sakshiD, sakshiI) => sakshiI * 10)
					.style("fill", sakshiD => sakshiD.active ? (sakshiDecade === 'all' ? '#4CAF50' : sakshiColorScale(+sakshiDecade + 5)) : '#2a2a2a')
					.style("opacity", sakshiD => sakshiD.active ? 0.9 : 0.2)
					.style("cursor", sakshiD => sakshiD.active ? "pointer" : "default")
				),
				sakshiExit => sakshiExit.call(sakshiExit => sakshiExit.transition(sakshiT)
					.delay((sakshiD, sakshiI) => sakshiI * 10)
					.style("opacity", 0)
					.remove()
				)
			);
	}

	function sakshiAnimateCount(sakshiTargetCount) {
		const sakshiElement = d3.select("#aadiss-currentCount-waffle");
		if (sakshiElement.empty()) return;
		const sakshiStartCount = +sakshiElement.text() || 0;
		const sakshiDuration = 1000;
		const sakshiSteps = 50;
		const sakshiIncrement = (sakshiTargetCount - sakshiStartCount) / sakshiSteps;
		const sakshiStepDuration = sakshiDuration / sakshiSteps;

		let sakshiCurrent = sakshiStartCount;
		let sakshiStep = 0;

		const sakshiTimer = setInterval(() => {
			sakshiStep++;
			sakshiCurrent += sakshiIncrement;

			if (sakshiStep >= sakshiSteps) {
				sakshiElement.text(sakshiTargetCount);
				clearInterval(sakshiTimer);
			} else {
				sakshiElement.text(Math.round(sakshiCurrent));
			}
		}, sakshiStepDuration);
	}

	function sakshiCreateLegend(sakshiDecades) {
		const sakshiLegend = d3.select("#aadiss-legend-waffle");
		if (sakshiLegend.empty()) return;
		sakshiLegend.html("");

		const sakshiLegendItem = sakshiLegend.append("div")
			.attr("class", "aadiss-legend-item")
			.style("flex-direction", "column")
			.style("align-items", "flex-start");

		sakshiLegendItem.append("div")
			.style("font-weight", "bold")
			.style("margin-bottom", "10px")
			.text("Decade Color Scale:");

		const sakshiGradientContainer = sakshiLegendItem.append("div")
			.style("display", "flex")
			.style("align-items", "center")
			.style("gap", "10px");

		const sakshiGradientSvg = sakshiGradientContainer.append("svg")
			.attr("width", 200)
			.attr("height", 20);

		const sakshiDefs = sakshiGradientSvg.append("defs");
		const sakshiGradient = sakshiDefs.append("linearGradient")
			.attr("id", "aadiss-year-gradient")
			.attr("x1", "0%")
			.attr("y1", "0%")
			.attr("x2", "100%")
			.attr("y2", "0%");

		sakshiGradient.append("stop")
			.attr("offset", "0%")
			.attr("stop-color", sakshiColorScale(sakshiDecades[0] + 5));

		sakshiGradient.append("stop")
			.attr("offset", "100%")
			.attr("stop-color", sakshiColorScale(sakshiDecades[sakshiDecades.length - 1] + 5));

		sakshiGradientSvg.append("rect")
			.attr("width", 200)
			.attr("height", 20)
			.attr("rx", 3)
			.style("fill", "url(#aadiss-year-gradient)");

		sakshiGradientContainer.append("span")
			.style("font-size", "12px")
			.style("color", "#888")
			.text(`${sakshiDecades[0]}s  0 ${sakshiDecades[sakshiDecades.length - 1]}s`);

		const sakshiInfoItem = sakshiLegend.append("div")
			.attr("class", "aadiss-legend-item")
			.style("margin-top", "10px");

		sakshiInfoItem.append("div")
			.attr("class", "aadiss-legend-color")
			.style("background-color", "#4CAF50")
			.style("width", "15px")
			.style("height", "15px");

		sakshiInfoItem.append("span")
			.attr("class", "aadiss-legend-label")
			.text("Each square = 10 missions");
	}
})();
