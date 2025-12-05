(function () {
    let ishaGlobalData = [];
    const ishaTooltip = d3.select('body').append('div')
        .attr('class', 'aadiss-tooltip')
        .attr('id', 'aadiss-tooltip-isha')
        .style('opacity', 0);

    d3.csv('Global_Space_Exploration_Dataset.csv').then(ishaData => {
        console.log('Data loaded successfully!', ishaData.length, 'rows');
        ishaGlobalData = ishaData;
        ishaProcessData();
        ishaInitScrollEffects();
    }).catch(ishaError => {
        console.error('Error loading data:', ishaError);
    });

    function ishaProcessData() {
        console.log('Processing data...');

        const ishaCountryStats = d3.rollup(
            ishaGlobalData,
            ishaV => ({
                total: ishaV.length,
                successes: ishaV.filter(ishaD => +ishaD['Success Rate (%)'] >= 70).length,
                failures: ishaV.filter(ishaD => +ishaD['Success Rate (%)'] < 70).length,
                avgSuccessRate: d3.mean(ishaV, ishaD => +ishaD['Success Rate (%)']),
                missions: ishaV
            }),
            ishaD => ishaD.Country
        );

        console.log('Country stats calculated:', ishaCountryStats.size, 'countries');

        const ishaPeriodStats = ishaCalculatePeriodStats();
        console.log('Period stats calculated:', ishaPeriodStats.length, 'countries');

        ishaCreateDivergingChart(ishaCountryStats);
        ishaCreateSlopeChart(ishaPeriodStats);
        console.log('Visualizations created!');
    }

    function ishaCalculatePeriodStats() {
        const ishaPeriod1 = ishaGlobalData.filter(ishaD => +ishaD.Year >= 2000 && +ishaD.Year <= 2012);
        const ishaPeriod2 = ishaGlobalData.filter(ishaD => +ishaD.Year >= 2013 && +ishaD.Year <= 2025);

        const ishaCountries = [...new Set(ishaGlobalData.map(ishaD => ishaD.Country))];
        const ishaStats = [];

        ishaCountries.forEach(ishaCountry => {
            const ishaP1Data = ishaPeriod1.filter(ishaD => ishaD.Country === ishaCountry);
            const ishaP2Data = ishaPeriod2.filter(ishaD => ishaD.Country === ishaCountry);

            if (ishaP1Data.length >= 10 && ishaP2Data.length >= 10) {
                const ishaP1FailureRate = (ishaP1Data.filter(ishaD => +ishaD['Success Rate (%)'] < 70).length / ishaP1Data.length) * 100;
                const ishaP2FailureRate = (ishaP2Data.filter(ishaD => +ishaD['Success Rate (%)'] < 70).length / ishaP2Data.length) * 100;

                ishaStats.push({
                    country: ishaCountry,
                    period1: ishaP1FailureRate,
                    period2: ishaP2FailureRate,
                    improved: ishaP2FailureRate < ishaP1FailureRate,
                    p1Count: ishaP1Data.length,
                    p2Count: ishaP2Data.length
                });
            }
        });

        console.log('Period stats for countries:', ishaStats);
        return ishaStats;
    }

    function ishaCreateDivergingChart(ishaCountryStats) {
        const ishaContainer = d3.select('#aadiss-diverging-chart');
        if (ishaContainer.empty()) return;

        const ishaMargin = { top: 80, right: 60, bottom: 100, left: 140 };
        const ishaContainerWidth = ishaContainer.node().getBoundingClientRect().width || ishaContainer.node().offsetWidth || 800;
        const ishaWidth = ishaContainerWidth - ishaMargin.left - ishaMargin.right;
        const ishaHeight = 600 - ishaMargin.top - ishaMargin.bottom;

        const ishaSvg = ishaContainer.append('svg')
            .attr('width', ishaWidth + ishaMargin.left + ishaMargin.right)
            .attr('height', ishaHeight + ishaMargin.top + ishaMargin.bottom)
            .append('g')
            .attr('transform', `translate(${ishaMargin.left},${ishaMargin.top})`);

        const ishaData = Array.from(ishaCountryStats, ([ishaCountry, ishaStats]) => ({
            country: ishaCountry,
            successes: ishaStats.successes,
            failures: ishaStats.failures,
            total: ishaStats.total,
            avgSuccessRate: ishaStats.avgSuccessRate,
            missions: ishaStats.missions
        })).sort((ishaA, ishaB) => (ishaB.successes + ishaB.failures) - (ishaA.successes + ishaA.failures));

        const ishaMaxValue = d3.max(ishaData, ishaD => Math.max(ishaD.successes, ishaD.failures));
        const ishaX = d3.scaleLinear().domain([-ishaMaxValue * 1.1, ishaMaxValue * 1.1]).range([0, ishaWidth]);
        const ishaY = d3.scaleBand().domain(ishaData.map(ishaD => ishaD.country)).range([0, ishaHeight]).padding(0.3);

        ishaSvg.append('text')
            .attr('class', 'aadiss-chart-title')
            .attr('x', ishaWidth / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text('Diverging Chart - Success vs Failure of Space Missions by Country');

        const ishaGridLines = ishaSvg.append('g').attr('class', 'aadiss-grid');

        ishaX.ticks(10).forEach(ishaTick => {
            ishaGridLines.append('line')
                .attr('x1', ishaX(ishaTick))
                .attr('x2', ishaX(ishaTick))
                .attr('y1', 0)
                .attr('y2', ishaHeight);
        });

        ishaSvg.append('line')
            .attr('class', 'aadiss-center-line')
            .attr('x1', ishaX(0))
            .attr('x2', ishaX(0))
            .attr('y1', 0)
            .attr('y2', ishaHeight);

        const ishaBarGroups = ishaSvg.append('g');

        const ishaFailureBars = ishaBarGroups.selectAll('.aadiss-failure-bar')
            .data(ishaData)
            .join('rect')
            .attr('class', 'aadiss-bar aadiss-failure-bar')
            .attr('x', ishaX(0))
            .attr('y', ishaD => ishaY(ishaD.country))
            .attr('width', 0)
            .attr('height', ishaY.bandwidth())
            .on('mouseover', function (ishaEvent, ishaD) {
                d3.select(this).classed('aadiss-highlight', true);
                ishaShowTooltip(ishaEvent, `
                    <strong>${ishaD.country}</strong><br/>
                    Failures: ${ishaD.failures} missions<br/>
                    Failure Rate: ${((ishaD.failures / ishaD.total) * 100).toFixed(1)}%
                `);
                ishaBarGroups.selectAll('.aadiss-bar').classed('aadiss-dimmed', true);
                d3.select(this).classed('aadiss-dimmed', false);
            })
            .on('mouseout', function () {
                d3.select(this).classed('aadiss-highlight', false);
                ishaHideTooltip();
                ishaBarGroups.selectAll('.aadiss-bar').classed('aadiss-dimmed', false);
            })
            .on('click', function (ishaEvent, ishaD) {
                ishaShowMissionDetails(ishaD, 'failure');
            });

        const ishaSuccessBars = ishaBarGroups.selectAll('.aadiss-success-bar')
            .data(ishaData)
            .join('rect')
            .attr('class', 'aadiss-bar aadiss-success-bar')
            .attr('x', ishaX(0))
            .attr('y', ishaD => ishaY(ishaD.country))
            .attr('width', 0)
            .attr('height', ishaY.bandwidth())
            .on('mouseover', function (ishaEvent, ishaD) {
                d3.select(this).classed('aadiss-highlight', true);
                ishaShowTooltip(ishaEvent, `
                    <strong>${ishaD.country}</strong><br/>
                    Successes: ${ishaD.successes} missions<br/>
                    Success Rate: ${((ishaD.successes / ishaD.total) * 100).toFixed(1)}%
                `);
                ishaBarGroups.selectAll('.aadiss-bar').classed('aadiss-dimmed', true);
                d3.select(this).classed('aadiss-dimmed', false);
            })
            .on('mouseout', function () {
                d3.select(this).classed('aadiss-highlight', false);
                ishaHideTooltip();
                ishaBarGroups.selectAll('.aadiss-bar').classed('aadiss-dimmed', false);
            })
            .on('click', function (ishaEvent, ishaD) {
                ishaShowMissionDetails(ishaD, 'success');
            });

        const ishaXAxis = d3.axisBottom(ishaX)
            .tickFormat(ishaD => Math.abs(ishaD))
            .ticks(10);

        ishaSvg.append('g')
            .attr('class', 'aadiss-axis')
            .attr('transform', `translate(0,${ishaHeight})`)
            .call(ishaXAxis);

        const ishaYAxis = d3.axisLeft(ishaY);

        ishaSvg.append('g')
            .attr('class', 'aadiss-axis')
            .attr('transform', `translate(${ishaX(0)},0)`)
            .call(ishaYAxis)
            .selectAll('text')
            .style('font-size', '14px')
            .style('font-weight', '600');

        ishaSvg.append('text')
            .attr('class', 'aadiss-axis-label')
            .attr('x', ishaWidth / 2)
            .attr('y', ishaHeight + 55)
            .attr('text-anchor', 'middle')
            .text('Number of Missions');

        ishaSvg.append('text')
            .attr('class', 'aadiss-axis-label')
            .attr('x', ishaX(-ishaMaxValue * 0.55))
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#dc3545')
            .text('← Failures');

        ishaSvg.append('text')
            .attr('class', 'aadiss-axis-label')
            .attr('x', ishaX(ishaMaxValue * 0.55))
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#28a745')
            .text('Successes →');

        const ishaLegend = ishaSvg.append('g')
            .attr('class', 'aadiss-legend')
            .attr('transform', `translate(${ishaWidth / 2 - 250}, ${ishaHeight + 65})`);

        const ishaLegendData = [
            { label: 'Failures (Success Rate < 70%)', color: '#dc3545' },
            { label: 'Successes (Success Rate ≥ 70%)', color: '#28a745' }
        ];

        ishaLegendData.forEach((ishaItem, ishaI) => {
            const ishaLegendItem = ishaLegend.append('g')
                .attr('class', 'aadiss-legend-item')
                .attr('transform', `translate(${ishaI * 280}, 0)`);

            ishaLegendItem.append('rect')
                .attr('width', 22)
                .attr('height', 22)
                .attr('fill', ishaItem.color);

            ishaLegendItem.append('text')
                .attr('class', 'aadiss-legend-text')
                .attr('x', 30)
                .attr('y', 16)
                .text(ishaItem.label);
        });

        const ishaObserver = new IntersectionObserver((ishaEntries) => {
            ishaEntries.forEach(ishaEntry => {
                if (ishaEntry.isIntersecting) {
                    ishaFailureBars.transition()
                        .duration(1200)
                        .delay((ishaD, ishaI) => ishaI * 120)
                        .ease(d3.easeCubicOut)
                        .attr('x', ishaD => ishaX(-ishaD.failures))
                        .attr('width', ishaD => ishaX(0) - ishaX(-ishaD.failures));

                    ishaSuccessBars.transition()
                        .duration(1200)
                        .delay((ishaD, ishaI) => ishaI * 120)
                        .ease(d3.easeCubicOut)
                        .attr('width', ishaD => ishaX(ishaD.successes) - ishaX(0));

                    ishaObserver.unobserve(ishaEntry.target);
                }
            });
        }, { threshold: 0.3 });

        const ishaSection = document.getElementById('aadiss-viz1-section');
        if (ishaSection) ishaObserver.observe(ishaSection);
    }

    function ishaCreateSlopeChart(ishaData) {
        const ishaContainer = d3.select('#aadiss-slope-chart');
        if (ishaContainer.empty()) return;

        const ishaMargin = { top: 80, right: 200, bottom: 80, left: 180 };
        const ishaContainerWidth = ishaContainer.node().getBoundingClientRect().width || ishaContainer.node().offsetWidth || 800;
        const ishaWidth = ishaContainerWidth - ishaMargin.left - ishaMargin.right;
        const ishaHeight = 800 - ishaMargin.top - ishaMargin.bottom;

        const ishaSvg = ishaContainer.append('svg')
            .attr('width', ishaWidth + ishaMargin.left + ishaMargin.right)
            .attr('height', ishaHeight + ishaMargin.top + ishaMargin.bottom)
            .append('g')
            .attr('transform', `translate(${ishaMargin.left},${ishaMargin.top})`);

        ishaData.sort((ishaA, ishaB) => ishaB.period1 - ishaA.period1);

        const ishaX = d3.scalePoint()
            .domain(['2000-2012', '2013-2025'])
            .range([0, ishaWidth])
            .padding(0.5);

        const ishaAllRates = ishaData.flatMap(ishaD => [ishaD.period1, ishaD.period2]);
        const ishaMinRate = Math.floor(d3.min(ishaAllRates) - 5);
        const ishaMaxRate = Math.ceil(d3.max(ishaAllRates) + 5);

        const ishaY = d3.scaleLinear()
            .domain([ishaMinRate, ishaMaxRate])
            .range([ishaHeight, 0]);

        ishaSvg.append('text')
            .attr('class', 'aadiss-chart-title')
            .attr('x', ishaWidth / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text('Mission Failure Rate Shift by Country');

        ishaSvg.append('text')
            .attr('class', 'aadiss-chart-subtitle')
            .attr('x', ishaWidth / 2)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .text('Green = Improved | Red = Worsened');

        ishaSvg.append('g')
            .attr('class', 'aadiss-grid')
            .selectAll('line')
            .data(ishaY.ticks(8))
            .join('line')
            .attr('x1', 0)
            .attr('x2', ishaWidth)
            .attr('y1', ishaD => ishaY(ishaD))
            .attr('y2', ishaD => ishaY(ishaD));

        ishaSvg.append('g')
            .attr('class', 'aadiss-axis')
            .attr('transform', `translate(0,${ishaHeight})`)
            .call(d3.axisBottom(ishaX))
            .selectAll('text')
            .attr('class', 'aadiss-period-label');

        ishaSvg.append('g')
            .attr('class', 'aadiss-axis')
            .call(d3.axisLeft(ishaY).tickFormat(ishaD => ishaD + '%'));

        ishaSvg.append('text')
            .attr('class', 'aadiss-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -ishaHeight / 2)
            .attr('y', -70)
            .attr('text-anchor', 'middle')
            .text('Failure Rate (%)');

        const ishaLine = d3.line()
            .x((ishaD, ishaI) => ishaX(ishaI === 0 ? '2000-2012' : '2013-2025'))
            .y(ishaD => ishaY(ishaD));

        const ishaLines = ishaSvg.selectAll('.aadiss-slope-line')
            .data(ishaData)
            .join('path')
            .attr('class', ishaD => `aadiss-slope-line ${ishaD.improved ? 'aadiss-improved' : 'aadiss-worsened'}`)
            .attr('d', ishaD => ishaLine([ishaD.period1, ishaD.period1]))
            .style('opacity', 0.4)
            .on('mouseover', function (ishaEvent, ishaD) {
                d3.select(this)
                    .raise()
                    .style('opacity', 1)
                    .style('stroke-width', '5px');

                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.15);
                ishaSvg.selectAll('.aadiss-slope-point').style('opacity', 0.15);
                ishaSvg.selectAll('.aadiss-country-label').style('opacity', 0.2);
                ishaSvg.selectAll('.aadiss-value-label').style('opacity', 0.2);

                d3.select(this).style('opacity', 1);
                ishaSvg.selectAll(`.aadiss-point-${ishaD.country.replace(/\s/g, '-')}`).style('opacity', 1);
                ishaSvg.selectAll(`.aadiss-label-${ishaD.country.replace(/\s/g, '-')}`).style('opacity', 1);

                ishaShowTooltip(ishaEvent, `
                    <strong>${ishaD.country}</strong><br/>
                    2000-2012: ${ishaD.period1.toFixed(1)}% (${ishaD.p1Count} missions)<br/>
                    2013-2025: ${ishaD.period2.toFixed(1)}% (${ishaD.p2Count} missions)<br/>
                    <strong>Change: ${ishaD.improved ? '↓' : '↑'} ${Math.abs(ishaD.period2 - ishaD.period1).toFixed(1)}%</strong>
                `);
            })
            .on('mouseout', function () {
                d3.select(this).style('stroke-width', '3px');
                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.4);
                ishaSvg.selectAll('.aadiss-slope-point').style('opacity', 1);
                ishaSvg.selectAll('.aadiss-country-label').style('opacity', 1);
                ishaSvg.selectAll('.aadiss-value-label').style('opacity', 1);
                ishaHideTooltip();
            })
            .on('click', function (ishaEvent, ishaD) {
                const ishaChange = ishaD.period2 - ishaD.period1;
                const ishaDirection = ishaD.improved ? 'IMPROVED' : 'WORSENED';
                alert(`${ishaD.country} - Detailed Analysis\n\n` +
                    `Status: ${ishaDirection}\n\n` +
                    `2000-2012:\n` +
                    `  • Failure Rate: ${ishaD.period1.toFixed(1)}%\n` +
                    `  • Total Missions: ${ishaD.p1Count}\n\n` +
                    `2013-2025:\n` +
                    `  • Failure Rate: ${ishaD.period2.toFixed(1)}%\n` +
                    `  • Total Missions: ${ishaD.p2Count}\n\n` +
                    `Change: ${ishaChange > 0 ? '+' : ''}${ishaChange.toFixed(1)}%`);
            });

        const ishaPoints = ishaSvg.selectAll('.aadiss-point-group')
            .data(ishaData)
            .join('g')
            .attr('class', 'aadiss-point-group');

        ishaPoints.append('circle')
            .attr('class', ishaD => `aadiss-slope-point aadiss-point-${ishaD.country.replace(/\s/g, '-')}`)
            .attr('cx', ishaX('2000-2012'))
            .attr('cy', ishaD => ishaY(ishaD.period1))
            .attr('r', 7)
            .attr('fill', ishaD => ishaD.improved ? '#28a745' : '#dc3545')
            .attr('stroke', 'white')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', function (ishaEvent, ishaD) {
                d3.select(this).attr('r', 10);
                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.15);
                ishaSvg.selectAll(`.aadiss-slope-line`).filter(ishaLd => ishaLd.country === ishaD.country).style('opacity', 1).raise();
                ishaShowTooltip(ishaEvent, `
                    <strong>${ishaD.country} (2000-2012)</strong><br/>
                    Failure Rate: ${ishaD.period1.toFixed(1)}%<br/>
                    Total Missions: ${ishaD.p1Count}
                `);
            })
            .on('mouseout', function () {
                d3.select(this).attr('r', 7);
                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.4);
                ishaHideTooltip();
            });

        ishaPoints.append('circle')
            .attr('class', ishaD => `aadiss-slope-point aadiss-point-${ishaD.country.replace(/\s/g, '-')}`)
            .attr('cx', ishaX('2013-2025'))
            .attr('cy', ishaD => ishaY(ishaD.period1))
            .attr('r', 7)
            .attr('fill', ishaD => ishaD.improved ? '#28a745' : '#dc3545')
            .attr('stroke', 'white')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', function (ishaEvent, ishaD) {
                d3.select(this).attr('r', 10);
                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.15);
                ishaSvg.selectAll(`.aadiss-slope-line`).filter(ishaLd => ishaLd.country === ishaD.country).style('opacity', 1).raise();
                ishaShowTooltip(ishaEvent, `
                    <strong>${ishaD.country} (2013-2025)</strong><br/>
                    Failure Rate: ${ishaD.period2.toFixed(1)}%<br/>
                    Total Missions: ${ishaD.p2Count}
                `);
            })
            .on('mouseout', function () {
                d3.select(this).attr('r', 7);
                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.4);
                ishaHideTooltip();
            });

        const ishaLeftLabels = ishaSvg.selectAll('.aadiss-left-label')
            .data(ishaData)
            .join('text')
            .attr('class', ishaD => `aadiss-country-label aadiss-label-${ishaD.country.replace(/\s/g, '-')}`)
            .attr('x', ishaX('2000-2012') - 15)
            .attr('y', ishaD => ishaY(ishaD.period1))
            .attr('text-anchor', 'end')
            .attr('dy', '0.35em')
            .attr('opacity', 0)
            .text(ishaD => `${ishaD.country}`)
            .style('cursor', 'pointer')
            .on('mouseover', function (ishaEvent, ishaD) {
                d3.select(this).style('font-weight', 'bold').style('font-size', '15px');
                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.15);
                ishaSvg.selectAll(`.aadiss-slope-line`).filter(ishaLd => ishaLd.country === ishaD.country).style('opacity', 1).raise();
                ishaShowTooltip(ishaEvent, `Click to see ${ishaD.country} details`);
            })
            .on('mouseout', function () {
                d3.select(this).style('font-weight', '600').style('font-size', '14px');
                ishaSvg.selectAll('.aadiss-slope-line').style('opacity', 0.4);
                ishaHideTooltip();
            })
            .on('click', function (ishaEvent, ishaD) {
                ishaSvg.selectAll(`.aadiss-slope-line`).filter(ishaLd => ishaLd.country === ishaD.country).dispatch('click');
            });

        const ishaLeftPercentLabels = ishaSvg.selectAll('.aadiss-left-percent-label')
            .data(ishaData)
            .join('text')
            .attr('class', ishaD => `aadiss-value-label aadiss-label-${ishaD.country.replace(/\s/g, '-')}`)
            .attr('x', ishaX('2000-2012') + 15)
            .attr('y', ishaD => ishaY(ishaD.period1))
            .attr('text-anchor', 'start')
            .attr('dy', '0.35em')
            .attr('opacity', 0)
            .attr('fill', '#e2e8f0')
            .text(ishaD => `${ishaD.period1.toFixed(1)}%`)
            .style('font-size', '12px');

        const ishaRightLabels = ishaSvg.selectAll('.aadiss-right-label')
            .data(ishaData)
            .join('text')
            .attr('class', ishaD => `aadiss-value-label aadiss-label-${ishaD.country.replace(/\s/g, '-')}`)
            .attr('x', ishaX('2013-2025') + 15)
            .attr('y', ishaD => ishaY(ishaD.period1))
            .attr('text-anchor', 'start')
            .attr('dy', '0.35em')
            .attr('opacity', 0)
            .attr('fill', ishaD => ishaD.improved ? '#28a745' : '#dc3545')
            .attr('font-weight', '600')
            .text(ishaD => `${ishaD.period2.toFixed(1)}%`);

        function ishaResolveOverlaps(ishaLabels, ishaIsLeft = false) {
            const ishaLabelNodes = ishaLabels.nodes();
            const ishaMinGap = 18;

            const ishaPositions = ishaLabelNodes.map((ishaNode, ishaI) => {
                return {
                    node: ishaNode,
                    y: parseFloat(d3.select(ishaNode).attr('y')),
                    originalY: parseFloat(d3.select(ishaNode).attr('y')),
                    index: ishaI
                };
            });

            ishaPositions.sort((ishaA, ishaB) => ishaA.y - ishaB.y);

            for (let ishaI = 1; ishaI < ishaPositions.length; ishaI++) {
                const ishaCurr = ishaPositions[ishaI];
                const ishaPrev = ishaPositions[ishaI - 1];

                if (ishaCurr.y - ishaPrev.y < ishaMinGap) {
                    ishaCurr.y = ishaPrev.y + ishaMinGap;
                }
            }

            ishaPositions.forEach(ishaPos => {
                if (Math.abs(ishaPos.y - ishaPos.originalY) > 1) {
                    d3.select(ishaPos.node)
                        .transition()
                        .duration(400)
                        .attr('y', ishaPos.y);
                }
            });
        }

        const ishaLegend = ishaSvg.append('g')
            .attr('class', 'aadiss-legend')
            .attr('transform', `translate(${ishaWidth / 2 - 160}, ${ishaHeight + 50})`);

        const ishaLegendData = [
            { label: 'Improved (decreased failure)', color: '#28a745' },
            { label: 'Worsened (increased failure)', color: '#dc3545' }
        ];

        ishaLegendData.forEach((ishaItem, ishaI) => {
            const ishaLegendItem = ishaLegend.append('g')
                .attr('class', 'aadiss-legend-item')
                .attr('transform', `translate(${ishaI * 190}, 0)`);

            ishaLegendItem.append('line')
                .attr('x1', 0)
                .attr('x2', 40)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('stroke', ishaItem.color)
                .attr('stroke-width', 3);

            ishaLegendItem.append('text')
                .attr('class', 'aadiss-legend-text')
                .attr('x', 50)
                .attr('y', 0)
                .attr('dy', '0.35em')
                .text(ishaItem.label);
        });

        const ishaObserver = new IntersectionObserver((ishaEntries) => {
            ishaEntries.forEach(ishaEntry => {
                if (ishaEntry.isIntersecting) {
                    ishaLeftLabels.transition()
                        .duration(600)
                        .delay((ishaD, ishaI) => ishaI * 100)
                        .attr('opacity', 1);

                    ishaLeftPercentLabels.transition()
                        .duration(600)
                        .delay((ishaD, ishaI) => ishaI * 100)
                        .attr('opacity', 1);

                    ishaLines.transition()
                        .duration(1200)
                        .delay((ishaD, ishaI) => 600 + ishaI * 100)
                        .ease(d3.easeCubicInOut)
                        .attr('d', ishaD => ishaLine([ishaD.period1, ishaD.period2]));

                    ishaPoints.selectAll('circle:nth-child(1)').transition()
                        .duration(500)
                        .delay((ishaD, ishaI) => 600 + ishaI * 100)
                        .attr('opacity', 1);

                    ishaPoints.selectAll('circle:nth-child(2)').transition()
                        .duration(1200)
                        .delay((ishaD, ishaI) => 600 + ishaI * 100)
                        .attr('cy', ishaD => ishaY(ishaD.period2))
                        .attr('opacity', 1);

                    ishaRightLabels.transition()
                        .duration(600)
                        .delay((ishaD, ishaI) => 1800 + ishaI * 100)
                        .attr('y', ishaD => ishaY(ishaD.period2))
                        .attr('opacity', 1)
                        .on('end', function () {
                            setTimeout(() => {
                                ishaResolveOverlaps(ishaRightLabels);
                                ishaResolveOverlaps(ishaLeftLabels, true);
                            }, 200);
                        });

                    ishaObserver.unobserve(ishaEntry.target);
                }
            });
        }, { threshold: 0.3 });

        const ishaSection = document.getElementById('aadiss-viz2-section');
        if (ishaSection) ishaObserver.observe(ishaSection);
    }

    function ishaShowMissionDetails(ishaCountryData, ishaType) {
        const ishaMissions = ishaType === 'failure'
            ? ishaCountryData.missions.filter(ishaM => +ishaM['Success Rate (%)'] < 70)
            : ishaCountryData.missions.filter(ishaM => +ishaM['Success Rate (%)'] >= 70);

        const ishaCount = ishaType === 'failure' ? ishaCountryData.failures : ishaCountryData.successes;
        const ishaRate = ((ishaCount / ishaCountryData.total) * 100).toFixed(1);

        alert(`${ishaCountryData.country}\n\n` +
            `${ishaType === 'failure' ? 'Failures' : 'Successes'}: ${ishaCount} missions\n` +
            `${ishaType === 'failure' ? 'Failure' : 'Success'} Rate: ${ishaRate}%\n` +
            `Total Missions: ${ishaCountryData.total}`);
    }

    function ishaShowTooltip(ishaEvent, ishaHtml) {
        ishaTooltip
            .html(ishaHtml)
            .style('left', (ishaEvent.pageX + 15) + 'px')
            .style('top', (ishaEvent.pageY - 28) + 'px')
            .classed('aadiss-show', true)
            .style('opacity', 1);
    }

    function ishaHideTooltip() {
        ishaTooltip.classed('aadiss-show', false).style('opacity', 0);
    }

    function ishaInitScrollEffects() {
        const ishaSections = document.querySelectorAll('.aadiss-viz-section');

        const ishaObserver = new IntersectionObserver((ishaEntries) => {
            ishaEntries.forEach(ishaEntry => {
                if (ishaEntry.isIntersecting) {
                    ishaEntry.target.classList.add('aadiss-active');
                }
            });
        }, {
            threshold: 0.2
        });

        ishaSections.forEach(ishaSection => {
            ishaObserver.observe(ishaSection);
        });
    }
})();
