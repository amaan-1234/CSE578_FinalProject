(function () {
    // Global variables
    let globalData = [];
    // Unique tooltip for this visualization
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .attr('id', 'tooltip-isha')
        .style('opacity', 0);

    // Load and process data
    d3.csv('Global_Space_Exploration_Dataset.csv').then(data => {
        console.log('Data loaded successfully!', data.length, 'rows');
        globalData = data;
        processData();
        initScrollEffects();
    }).catch(error => {
        console.error('Error loading data:', error);
        // alert('Error loading data file. Make sure Global_Space_Exploration_Dataset.csv is in the same folder as Isha_index.html');
    });

    // Process data for visualizations
    function processData() {
        console.log('Processing data...');

        // Calculate success and failure counts by country
        const countryStats = d3.rollup(
            globalData,
            v => ({
                total: v.length,
                successes: v.filter(d => +d['Success Rate (%)'] >= 70).length,
                failures: v.filter(d => +d['Success Rate (%)'] < 70).length,
                avgSuccessRate: d3.mean(v, d => +d['Success Rate (%)']),
                missions: v
            }),
            d => d.Country
        );

        console.log('Country stats calculated:', countryStats.size, 'countries');

        // Calculate failure rates by time period
        const periodStats = calculatePeriodStats();
        console.log('Period stats calculated:', periodStats.length, 'countries');

        // Create visualizations
        createDivergingChart(countryStats);
        createSlopeChart(periodStats);
        console.log('Visualizations created!');
    }

    // Calculate statistics by time period
    function calculatePeriodStats() {
        const period1 = globalData.filter(d => +d.Year >= 2000 && +d.Year <= 2012);
        const period2 = globalData.filter(d => +d.Year >= 2013 && +d.Year <= 2025);

        // Get all unique countries from the data
        const countries = [...new Set(globalData.map(d => d.Country))];
        const stats = [];

        countries.forEach(country => {
            const p1Data = period1.filter(d => d.Country === country);
            const p2Data = period2.filter(d => d.Country === country);

            // Only include countries that have at least 10 missions in each period
            if (p1Data.length >= 10 && p2Data.length >= 10) {
                const p1FailureRate = (p1Data.filter(d => +d['Success Rate (%)'] < 70).length / p1Data.length) * 100;
                const p2FailureRate = (p2Data.filter(d => +d['Success Rate (%)'] < 70).length / p2Data.length) * 100;

                stats.push({
                    country: country,
                    period1: p1FailureRate,
                    period2: p2FailureRate,
                    improved: p2FailureRate < p1FailureRate,
                    p1Count: p1Data.length,
                    p2Count: p2Data.length
                });
            }
        });

        console.log('Period stats for countries:', stats);
        return stats;
    }

    // Create highly interactive diverging bar chart
    function createDivergingChart(countryStats) {
        const container = d3.select('#diverging-chart');
        if (container.empty()) return;

        const margin = { top: 80, right: 60, bottom: 100, left: 140 };
        const containerWidth = container.node().getBoundingClientRect().width || container.node().offsetWidth || 800;
        const width = containerWidth - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = container.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Prepare data
        const data = Array.from(countryStats, ([country, stats]) => ({
            country,
            successes: stats.successes,
            failures: stats.failures,
            total: stats.total,
            avgSuccessRate: stats.avgSuccessRate,
            missions: stats.missions
        })).sort((a, b) => (b.successes + b.failures) - (a.successes + a.failures));

        // Scales
        const maxValue = d3.max(data, d => Math.max(d.successes, d.failures));
        const x = d3.scaleLinear()
            .domain([-maxValue * 1.1, maxValue * 1.1])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(data.map(d => d.country))
            .range([0, height])
            .padding(0.3);

        // Add title
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text('Diverging Chart - Success vs Failure of Space Missions by Country');

        // Add grid lines
        const gridLines = svg.append('g').attr('class', 'grid');

        x.ticks(10).forEach(tick => {
            gridLines.append('line')
                .attr('x1', x(tick))
                .attr('x2', x(tick))
                .attr('y1', 0)
                .attr('y2', height);
        });

        // Add center line
        svg.append('line')
            .attr('class', 'center-line')
            .attr('x1', x(0))
            .attr('x2', x(0))
            .attr('y1', 0)
            .attr('y2', height);

        // Create bar groups for interactivity
        const barGroups = svg.append('g');

        // Add failure bars (left side) with click interaction
        const failureBars = barGroups.selectAll('.failure-bar')
            .data(data)
            .join('rect')
            .attr('class', 'bar failure-bar')
            .attr('x', x(0))
            .attr('y', d => y(d.country))
            .attr('width', 0)
            .attr('height', y.bandwidth())
            .on('mouseover', function (event, d) {
                d3.select(this).classed('highlight', true);
                showTooltip(event, `
                    <strong>${d.country}</strong><br/>
                    Failures: ${d.failures} missions<br/>
                    Failure Rate: ${((d.failures / d.total) * 100).toFixed(1)}%
                `);
                // Dim other bars
                barGroups.selectAll('.bar').classed('dimmed', true);
                d3.select(this).classed('dimmed', false);
            })
            .on('mouseout', function () {
                d3.select(this).classed('highlight', false);
                hideTooltip();
                barGroups.selectAll('.bar').classed('dimmed', false);
            })
            .on('click', function (event, d) {
                showMissionDetails(d, 'failure');
            });

        // Add success bars (right side) with click interaction
        const successBars = barGroups.selectAll('.success-bar')
            .data(data)
            .join('rect')
            .attr('class', 'bar success-bar')
            .attr('x', x(0))
            .attr('y', d => y(d.country))
            .attr('width', 0)
            .attr('height', y.bandwidth())
            .on('mouseover', function (event, d) {
                d3.select(this).classed('highlight', true);
                showTooltip(event, `
                    <strong>${d.country}</strong><br/>
                    Successes: ${d.successes} missions<br/>
                    Success Rate: ${((d.successes / d.total) * 100).toFixed(1)}%
                `);
                // Dim other bars
                barGroups.selectAll('.bar').classed('dimmed', true);
                d3.select(this).classed('dimmed', false);
            })
            .on('mouseout', function () {
                d3.select(this).classed('highlight', false);
                hideTooltip();
                barGroups.selectAll('.bar').classed('dimmed', false);
            })
            .on('click', function (event, d) {
                showMissionDetails(d, 'success');
            });

        // Add axes
        const xAxis = d3.axisBottom(x)
            .tickFormat(d => Math.abs(d))
            .ticks(10);

        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(xAxis);

        const yAxis = d3.axisLeft(y);

        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(${x(0)},0)`)
            .call(yAxis)
            .selectAll('text')
            .style('font-size', '14px')
            .style('font-weight', '600');

        // Add x-axis label
        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', width / 2)
            .attr('y', height + 55)
            .attr('text-anchor', 'middle')
            .text('Number of Missions');

        // Add section labels
        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', x(-maxValue * 0.55))
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#dc3545')
            .text('← Failures');

        svg.append('text')
            .attr('class', 'axis-label')
            .attr('x', x(maxValue * 0.55))
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .attr('fill', '#28a745')
            .text('Successes →');

        // Add legend at the bottom center
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width / 2 - 250}, ${height + 65})`);

        const legendData = [
            { label: 'Failures (Success Rate < 70%)', color: '#dc3545' },
            { label: 'Successes (Success Rate ≥ 70%)', color: '#28a745' }
        ];

        legendData.forEach((item, i) => {
            const legendItem = legend.append('g')
                .attr('class', 'legend-item')
                .attr('transform', `translate(${i * 280}, 0)`);

            legendItem.append('rect')
                .attr('width', 22)
                .attr('height', 22)
                .attr('fill', item.color);

            legendItem.append('text')
                .attr('class', 'legend-text')
                .attr('x', 30)
                .attr('y', 16)
                .text(item.label);
        });

        // Animate bars on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Animate failure bars
                    failureBars.transition()
                        .duration(1200)
                        .delay((d, i) => i * 120)
                        .ease(d3.easeCubicOut)
                        .attr('x', d => x(-d.failures))
                        .attr('width', d => x(0) - x(-d.failures));

                    // Animate success bars
                    successBars.transition()
                        .duration(1200)
                        .delay((d, i) => i * 120)
                        .ease(d3.easeCubicOut)
                        .attr('width', d => x(d.successes) - x(0));

                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        const section = document.getElementById('viz1-section');
        if (section) observer.observe(section);
    }

    // Create highly interactive slope chart
    function createSlopeChart(data) {
        const container = d3.select('#slope-chart');
        if (container.empty()) return;

        const margin = { top: 80, right: 200, bottom: 80, left: 180 };
        const containerWidth = container.node().getBoundingClientRect().width || container.node().offsetWidth || 800;
        const width = containerWidth - margin.left - margin.right;
        const height = 800 - margin.top - margin.bottom;

        const svg = container.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Sort data by period1 to reduce overlap
        data.sort((a, b) => b.period1 - a.period1);

        // Scales
        const x = d3.scalePoint()
            .domain(['2000-2012', '2013-2025'])
            .range([0, width])
            .padding(0.5);

        const allRates = data.flatMap(d => [d.period1, d.period2]);
        const minRate = Math.floor(d3.min(allRates) - 5);
        const maxRate = Math.ceil(d3.max(allRates) + 5);

        const y = d3.scaleLinear()
            .domain([minRate, maxRate])
            .range([height, 0]);

        // Add title
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', -45)
            .attr('text-anchor', 'middle')
            .text('Mission Failure Rate Shift by Country');

        svg.append('text')
            .attr('class', 'chart-subtitle')
            .attr('x', width / 2)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .text('Green = Improved | Red = Worsened');

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .selectAll('line')
            .data(y.ticks(8))
            .join('line')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', d => y(d))
            .attr('y2', d => y(d));

        // Add axes
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('class', 'period-label');

        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(y).tickFormat(d => d + '%'));

        // Add y-axis label
        svg.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -70)
            .attr('text-anchor', 'middle')
            .text('Failure Rate (%)');

        // Create line generator
        const line = d3.line()
            .x((d, i) => x(i === 0 ? '2000-2012' : '2013-2025'))
            .y(d => y(d));

        // Add lines with enhanced interactivity
        const lines = svg.selectAll('.slope-line')
            .data(data)
            .join('path')
            .attr('class', d => `slope-line ${d.improved ? 'improved' : 'worsened'}`)
            .attr('d', d => line([d.period1, d.period1]))
            .style('opacity', 0.4)
            .on('mouseover', function (event, d) {
                // Highlight this line
                d3.select(this)
                    .raise()
                    .style('opacity', 1)
                    .style('stroke-width', '5px');

                // Dim all other elements
                svg.selectAll('.slope-line').style('opacity', 0.15);
                svg.selectAll('.slope-point').style('opacity', 0.15);
                svg.selectAll('.country-label').style('opacity', 0.2);
                svg.selectAll('.value-label').style('opacity', 0.2);

                // Highlight related elements
                d3.select(this).style('opacity', 1);
                svg.selectAll(`.point-${d.country.replace(/\s/g, '-')}`).style('opacity', 1);
                svg.selectAll(`.label-${d.country.replace(/\s/g, '-')}`).style('opacity', 1);

                showTooltip(event, `
                    <strong>${d.country}</strong><br/>
                    2000-2012: ${d.period1.toFixed(1)}% (${d.p1Count} missions)<br/>
                    2013-2025: ${d.period2.toFixed(1)}% (${d.p2Count} missions)<br/>
                    <strong>Change: ${d.improved ? '↓' : '↑'} ${Math.abs(d.period2 - d.period1).toFixed(1)}%</strong>
                `);
            })
            .on('mouseout', function () {
                d3.select(this).style('stroke-width', '3px');
                svg.selectAll('.slope-line').style('opacity', 0.4);
                svg.selectAll('.slope-point').style('opacity', 1);
                svg.selectAll('.country-label').style('opacity', 1);
                svg.selectAll('.value-label').style('opacity', 1);
                hideTooltip();
            })
            .on('click', function (event, d) {
                const change = d.period2 - d.period1;
                const direction = d.improved ? 'IMPROVED' : 'WORSENED';
                alert(`${d.country} - Detailed Analysis\n\n` +
                    `Status: ${direction}\n\n` +
                    `2000-2012:\n` +
                    `  • Failure Rate: ${d.period1.toFixed(1)}%\n` +
                    `  • Total Missions: ${d.p1Count}\n\n` +
                    `2013-2025:\n` +
                    `  • Failure Rate: ${d.period2.toFixed(1)}%\n` +
                    `  • Total Missions: ${d.p2Count}\n\n` +
                    `Change: ${change > 0 ? '+' : ''}${change.toFixed(1)}%`);
            });

        // Add points
        const points = svg.selectAll('.point-group')
            .data(data)
            .join('g')
            .attr('class', 'point-group');

        // Period 1 points
        points.append('circle')
            .attr('class', d => `slope-point point-${d.country.replace(/\s/g, '-')}`)
            .attr('cx', x('2000-2012'))
            .attr('cy', d => y(d.period1))
            .attr('r', 7)
            .attr('fill', d => d.improved ? '#28a745' : '#dc3545')
            .attr('stroke', 'white')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this).attr('r', 10);
                svg.selectAll('.slope-line').style('opacity', 0.15);
                svg.selectAll(`.slope-line`).filter(ld => ld.country === d.country).style('opacity', 1).raise();
                showTooltip(event, `
                    <strong>${d.country} (2000-2012)</strong><br/>
                    Failure Rate: ${d.period1.toFixed(1)}%<br/>
                    Total Missions: ${d.p1Count}
                `);
            })
            .on('mouseout', function () {
                d3.select(this).attr('r', 7);
                svg.selectAll('.slope-line').style('opacity', 0.4);
                hideTooltip();
            });

        // Period 2 points
        points.append('circle')
            .attr('class', d => `slope-point point-${d.country.replace(/\s/g, '-')}`)
            .attr('cx', x('2013-2025'))
            .attr('cy', d => y(d.period1))
            .attr('r', 7)
            .attr('fill', d => d.improved ? '#28a745' : '#dc3545')
            .attr('stroke', 'white')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this).attr('r', 10);
                svg.selectAll('.slope-line').style('opacity', 0.15);
                svg.selectAll(`.slope-line`).filter(ld => ld.country === d.country).style('opacity', 1).raise();
                showTooltip(event, `
                    <strong>${d.country} (2013-2025)</strong><br/>
                    Failure Rate: ${d.period2.toFixed(1)}%<br/>
                    Total Missions: ${d.p2Count}
                `);
            })
            .on('mouseout', function () {
                d3.select(this).attr('r', 7);
                svg.selectAll('.slope-line').style('opacity', 0.4);
                hideTooltip();
            });

        // Add country labels (left side) - Only country names
        const leftLabels = svg.selectAll('.left-label')
            .data(data)
            .join('text')
            .attr('class', d => `country-label label-${d.country.replace(/\s/g, '-')}`)
            .attr('x', x('2000-2012') - 15)
            .attr('y', d => y(d.period1))
            .attr('text-anchor', 'end')
            .attr('dy', '0.35em')
            .attr('opacity', 0)
            .text(d => `${d.country}`)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this).style('font-weight', 'bold').style('font-size', '15px');
                svg.selectAll('.slope-line').style('opacity', 0.15);
                svg.selectAll(`.slope-line`).filter(ld => ld.country === d.country).style('opacity', 1).raise();
                showTooltip(event, `Click to see ${d.country} details`);
            })
            .on('mouseout', function () {
                d3.select(this).style('font-weight', '600').style('font-size', '14px');
                svg.selectAll('.slope-line').style('opacity', 0.4);
                hideTooltip();
            })
            .on('click', function (event, d) {
                svg.selectAll(`.slope-line`).filter(ld => ld.country === d.country).dispatch('click');
            });

        // Add percentage labels on left
        const leftPercentLabels = svg.selectAll('.left-percent-label')
            .data(data)
            .join('text')
            .attr('class', d => `value-label label-${d.country.replace(/\s/g, '-')}`)
            .attr('x', x('2000-2012') + 15)
            .attr('y', d => y(d.period1))
            .attr('text-anchor', 'start')
            .attr('dy', '0.35em')
            .attr('opacity', 0)
            .attr('fill', '#e2e8f0')
            .text(d => `${d.period1.toFixed(1)}%`)
            .style('font-size', '12px');

        // Add value labels (right side) - Only percentages
        const rightLabels = svg.selectAll('.right-label')
            .data(data)
            .join('text')
            .attr('class', d => `value-label label-${d.country.replace(/\s/g, '-')}`)
            .attr('x', x('2013-2025') + 15)
            .attr('y', d => y(d.period1))
            .attr('text-anchor', 'start')
            .attr('dy', '0.35em')
            .attr('opacity', 0)
            .attr('fill', d => d.improved ? '#28a745' : '#dc3545')
            .attr('font-weight', '600')
            .text(d => `${d.period2.toFixed(1)}%`);

        // Function to detect and resolve label overlaps
        function resolveOverlaps(labels, isLeft = false) {
            const labelNodes = labels.nodes();
            const minGap = 18; // Minimum gap between labels

            const positions = labelNodes.map((node, i) => {
                return {
                    node: node,
                    y: parseFloat(d3.select(node).attr('y')),
                    originalY: parseFloat(d3.select(node).attr('y')),
                    index: i
                };
            });

            // Sort by y position
            positions.sort((a, b) => a.y - b.y);

            // Adjust overlapping labels
            for (let i = 1; i < positions.length; i++) {
                const curr = positions[i];
                const prev = positions[i - 1];

                if (curr.y - prev.y < minGap) {
                    curr.y = prev.y + minGap;
                }
            }

            // Apply adjusted positions with smooth transition
            positions.forEach(pos => {
                if (Math.abs(pos.y - pos.originalY) > 1) {
                    d3.select(pos.node)
                        .transition()
                        .duration(400)
                        .attr('y', pos.y);
                }
            });
        }

        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width / 2 - 160}, ${height + 50})`);

        const legendData = [
            { label: 'Improved (decreased failure)', color: '#28a745' },
            { label: 'Worsened (increased failure)', color: '#dc3545' }
        ];

        legendData.forEach((item, i) => {
            const legendItem = legend.append('g')
                .attr('class', 'legend-item')
                .attr('transform', `translate(${i * 190}, 0)`);

            legendItem.append('line')
                .attr('x1', 0)
                .attr('x2', 40)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('stroke', item.color)
                .attr('stroke-width', 3);

            legendItem.append('text')
                .attr('class', 'legend-text')
                .attr('x', 50)
                .attr('y', 0)
                .attr('dy', '0.35em')
                .text(item.label);
        });

        // Animate on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Show left labels first
                    leftLabels.transition()
                        .duration(600)
                        .delay((d, i) => i * 100)
                        .attr('opacity', 1);

                    leftPercentLabels.transition()
                        .duration(600)
                        .delay((d, i) => i * 100)
                        .attr('opacity', 1);

                    // Draw lines
                    lines.transition()
                        .duration(1200)
                        .delay((d, i) => 600 + i * 100)
                        .ease(d3.easeCubicInOut)
                        .attr('d', d => line([d.period1, d.period2]));

                    // Show period 1 points
                    points.selectAll('circle:nth-child(1)').transition()
                        .duration(500)
                        .delay((d, i) => 600 + i * 100)
                        .attr('opacity', 1);

                    // Update and show period 2 points
                    points.selectAll('circle:nth-child(2)').transition()
                        .duration(1200)
                        .delay((d, i) => 600 + i * 100)
                        .attr('cy', d => y(d.period2))
                        .attr('opacity', 1);

                    // Show right labels
                    rightLabels.transition()
                        .duration(600)
                        .delay((d, i) => 1800 + i * 100)
                        .attr('y', d => y(d.period2))
                        .attr('opacity', 1)
                        .on('end', function () {
                            // After animation completes, resolve overlaps
                            setTimeout(() => {
                                resolveOverlaps(rightLabels);
                                resolveOverlaps(leftLabels, true);
                            }, 200);
                        });

                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        const section = document.getElementById('viz2-section');
        if (section) observer.observe(section);
    }

    // Show mission details on click
    function showMissionDetails(countryData, type) {
        const missions = type === 'failure'
            ? countryData.missions.filter(m => +m['Success Rate (%)'] < 70)
            : countryData.missions.filter(m => +m['Success Rate (%)'] >= 70);

        const count = type === 'failure' ? countryData.failures : countryData.successes;
        const rate = ((count / countryData.total) * 100).toFixed(1);

        alert(`${countryData.country}\n\n` +
            `${type === 'failure' ? 'Failures' : 'Successes'}: ${count} missions\n` +
            `${type === 'failure' ? 'Failure' : 'Success'} Rate: ${rate}%\n` +
            `Total Missions: ${countryData.total}`);
    }

    // Tooltip functions
    function showTooltip(event, html) {
        tooltip
            .html(html)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .classed('show', true)
            .style('opacity', 1);
    }

    function hideTooltip() {
        tooltip.classed('show', false).style('opacity', 0);
    }

    // Scroll effects
    function initScrollEffects() {
        const sections = document.querySelectorAll('.viz-section');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, {
            threshold: 0.2
        });

        sections.forEach(section => {
            observer.observe(section);
        });
    }
})();