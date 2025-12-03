(function () {
  const tip = d3.select('#tooltip');

  // --- Helpers --------------------------------------------------------------
  function normalizeType(s) {
    if (!s) return '';
    s = String(s).toUpperCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
    if (s === 'RB' || s === 'ROCKETBODY' || s === 'ROCKET  BODY') return 'ROCKET BODY';
    if (s.includes('ROCKET') && s.includes('BODY')) return 'ROCKET BODY';
    if (s.includes('PAYLOAD')) return 'PAYLOAD';
    if (s.includes('DEBRIS')) return 'DEBRIS';
    return s;
  }

  function parseAnyDate(x) {
    if (!x) return null;
    x = String(x).trim();
    // Handle 4-digit year directly
    if (/^\d{4}$/.test(x)) {
      return new Date(+x, 0, 1);
    }
    // Common formats: 2005-06-12, 2012/03/01, 3/1/2012, etc.
    const d = new Date(x);
    if (!isNaN(d)) return d;
    // try YYYY-MM-DD fallback
    const m = String(x).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }

  function yearFrom(x) {
    const d = parseAnyDate(x);
    return d ? d.getFullYear() : null;
  }

  function fmt(n) { return d3.format(',')(n); }
  const round2 = d3.format('.2f');

  // --- Data Loading ----------------------------------------------------------
  let satRows = null;

  // Load default dataset
  d3.csv("space_decay.csv").then(data => {
    satRows = data;
    buildAll();
  }).catch(err => {
    console.error("Error loading space_decay.csv:", err);
  });

  // Optional: File input listener if user wants to override
  const fileInput = document.getElementById('satCsv');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      satRows = d3.csvParse(text);
      if (satRows) { buildAll(); }
    });
  }

  // --- Build both charts ----------------------------------------------------
  function buildAll() {
    if (!satRows) return;
    try {
      buildRatioChart(satRows);
    } catch (err) {
      console.error('buildAll: Error in buildRatioChart:', err);
    }
    try {
      buildTimeChart(satRows);
    } catch (err) {
      console.error('buildAll: Error in buildTimeChart:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Chart 1 — Cleveland Dot Plot: Debris-to-Payload ratio by COUNTRY_CODE
  // --------------------------------------------------------------------------
  function buildRatioChart(rows) {
    const svg = d3.select('#ratioSvg');
    if (svg.empty()) return;

    svg.selectAll('*').remove();
    const container = svg.node().parentElement;
    const containerWidth = container.getBoundingClientRect().width || container.clientWidth || 900;
    const W = containerWidth;
    const H = +svg.attr('height') || 560;
    svg.attr('width', W);
    const margin = { top: 30, right: 80, bottom: 40, left: 90 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Compute payload & debris counts per country code
    const byCountry = d3.rollups(
      rows,
      v => {
        const payload = d3.sum(v, d => normalizeType(d.OBJECT_TYPE) === 'PAYLOAD' ? 1 : 0);
        const debris = d3.sum(v, d => normalizeType(d.OBJECT_TYPE) === 'DEBRIS' ? 1 : 0);
        const total = payload + debris;
        const ratio = payload > 0 ? (debris / payload) : NaN;
        return { payload, debris, total, ratio };
      },
      d => (d.COUNTRY_CODE || '').toString().trim()
    )
      .filter(([cc, m]) => cc && isFinite(m.ratio) && m.payload > 0);

    // Controls
    const topNEl = document.getElementById('topNSlider');
    const topNVal = document.getElementById('topNVal');
    const minTotEl = document.getElementById('minTotSlider');
    const minTotVal = document.getElementById('minTotVal');
    const sortSel = document.getElementById('sortBy');

    function deriveData() {
      const minTot = minTotEl ? +minTotEl.value : 0;
      const sortBy = sortSel ? sortSel.value : 'ratio';

      let data = byCountry
        .map(([cc, m]) => ({ code: cc, ...m }))
        .filter(d => d.total >= minTot);

      if (sortBy === 'ratio') data.sort((a, b) => d3.descending(a.ratio, b.ratio));
      else if (sortBy === 'payload') data.sort((a, b) => d3.descending(a.payload, b.payload));
      else if (sortBy === 'debris') data.sort((a, b) => d3.descending(a.debris, b.debris));
      else if (sortBy === 'alpha') data.sort((a, b) => d3.ascending(a.code, b.code));

      const topN = topNEl ? +topNEl.value : 15;
      data = data.slice(0, topN);
      return data;
    }

    function render() {
      const data = deriveData();
      const xMax = d3.max(data, d => d.ratio) || 1;
      const x = d3.scaleLinear().domain([0, xMax * 1.05]).range([0, innerW]);
      const y = d3.scaleBand().domain(data.map(d => d.code)).range([0, innerH]).padding(0.5);

      // Axes
      g.selectAll('.axis').remove();
      g.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).ticks(8).tickSizeOuter(0));
      g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSizeOuter(0));

      // Row guide lines
      const lines = g.selectAll('.row-line').data(data, d => d.code);
      lines.join(
        enter => enter.append('line')
          .attr('class', 'row-line')
          .attr('x1', 0).attr('x2', 0)
          .attr('y1', d => y(d.code)).attr('y2', d => y(d.code))
          .transition().duration(450).attr('x2', d => x(d.ratio)),
        update => update.transition().duration(450)
          .attr('y1', d => y(d.code)).attr('y2', d => y(d.code))
          .attr('x2', d => x(d.ratio)),
        exit => exit.transition().duration(250).attr('x2', 0).remove()
      );

      // Dots
      const dots = g.selectAll('.ratio-dot').data(data, d => d.code);
      dots.join(
        enter => enter.append('circle')
          .attr('class', 'ratio-dot')
          .attr('r', 6.5)
          .attr('cx', 0)
          .attr('cy', d => y(d.code))
          .style('cursor', 'pointer')
          .on('mouseenter', (ev, d) => {
            d3.select(ev.currentTarget).attr('r', 8);
            showTip(ev, d);
          })
          .on('mousemove', (ev, d) => moveTip(ev))
          .on('mouseleave', (ev) => {
            d3.select(ev.currentTarget).attr('r', 6.5);
            hideTip();
          })
          .on('click', (ev, d) => {
            const sel = d3.select(ev.currentTarget.parentNode).selectAll('.ratio-dot');
            sel.classed('highlight', false);
            d3.select(ev.currentTarget).classed('highlight', !d3.select(ev.currentTarget).classed('highlight'));
          })
          .transition().duration(450)
          .attr('cx', d => x(d.ratio)),
        update => update.transition().duration(450)
          .attr('cy', d => y(d.code))
          .attr('cx', d => x(d.ratio)),
        exit => exit.transition().duration(250).attr('cx', 0).remove()
      );

      // Labels
      const labels = g.selectAll('.ratio-label').data(data, d => d.code);
      labels.join(
        enter => enter.append('text')
          .attr('class', 'ratio-label')
          .attr('x', d => x(d.ratio) + 8)
          .attr('y', d => y(d.code) + 4)
          .text(d => round2(d.ratio)),
        update => update.transition().duration(450)
          .attr('x', d => x(d.ratio) + 8)
          .attr('y', d => y(d.code) + 4)
          .text(d => round2(d.ratio)),
        exit => exit.remove()
      );

      // Title & subtitle
      svg.selectAll('.headings').remove();
      const heads = svg.append('g').attr('class', 'headings')
        .attr('transform', `translate(${margin.left},${16})`);
      heads.append('text').attr('x', innerW / 2).attr('text-anchor', 'middle')
        .attr('font-size', 18).attr('font-weight', 700).style('fill', 'var(--fg)')
        .text('Debris-to-Payload Ratio by Country (Top ' + data.length + ')');
      heads.append('text').attr('x', innerW / 2).attr('y', 20).attr('text-anchor', 'middle')
        .style('fill', 'var(--muted)').attr('font-size', 13)
        .text('Higher ratios indicate more debris per operational payload');

      function showTip(ev, d) {
        if (tip.empty()) return;
        tip.style('display', 'block')
          .html(
            `<strong>${d.code}</strong><br/>
             Debris: ${fmt(d.debris)}<br/>
             Payload: ${fmt(d.payload)}<br/>
             Ratio: <strong>${round2(d.ratio)}</strong>`
          );
        moveTip(ev);
      }

      function moveTip(ev) {
        if (tip.empty()) return;
        tip.style('left', (ev.pageX + 12) + 'px')
          .style('top', (ev.pageY + 12) + 'px');
      }

      function hideTip() { if (!tip.empty()) tip.style('display', 'none'); }
    }

    // Bind control events
    if (topNEl) topNEl.addEventListener('input', () => { if (topNVal) topNVal.textContent = topNEl.value; render(); });
    if (minTotEl) minTotEl.addEventListener('input', () => { if (minTotVal) minTotVal.textContent = minTotEl.value; render(); });
    if (sortSel) sortSel.addEventListener('change', render);

    // Initial
    if (topNVal && topNEl) topNVal.textContent = topNEl.value;
    if (minTotVal && minTotEl) minTotVal.textContent = minTotEl.value;
    render();
  }

  // --------------------------------------------------------------------------
  // Chart 2 — Time Series by Type (PAYLOAD / DEBRIS / ROCKET BODY)
  // --------------------------------------------------------------------------
  function buildTimeChart(rows) {
    const svg = d3.select('#timeSvg');
    const brushSvg = d3.select('#brushSvg');
    if (svg.empty()) return;

    svg.selectAll('*').remove();
    brushSvg.selectAll('*').remove();

    const container = svg.node().parentElement;
    const containerWidth = container.getBoundingClientRect().width || container.clientWidth || 900;
    const W = containerWidth;
    const H = +svg.attr('height') || 420;
    svg.attr('width', W);
    brushSvg.attr('width', W);
    const margin = { top: 50, right: 20, bottom: 30, left: 56 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Normalize & group by year × type
    const cleaned = rows.map(r => ({
      year: yearFrom(r.LAUNCH_DATE),
      type: normalizeType(r.OBJECT_TYPE)
    })).filter(d => d.year && ['PAYLOAD', 'DEBRIS', 'ROCKET BODY'].includes(d.type));

    const countsByYearType = d3.rollups(
      cleaned,
      v => v.length,
      d => d.year,
      d => d.type
    );

    const years = Array.from(new Set(cleaned.map(d => d.year))).sort((a, b) => a - b);
    const types = ['PAYLOAD', 'DEBRIS', 'ROCKET BODY'];

    const series = types.map(t => {
      let cumulative = 0;
      return {
        key: t,
        values: years.map(y => {
          const yearCount = (countsByYearType.find(([yy]) => yy === y)?.[1].find(([tt]) => tt === t)?.[1]) || 0;
          cumulative += yearCount;
          return { year: y, count: cumulative };
        })
      };
    });

    const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerW]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s.values, d => d.count)) * 1.1 || 10])
      .nice()
      .range([innerH, 0]);

    // Use hex codes directly to ensure visibility
    const color = d3.scaleOrdinal()
      .domain(types)
      .range(['#3b82f6', '#f97316', '#10b981']);

    // Axes
    g.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')));
    g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(6));

    // Grid
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(''))
      .selectAll('line').attr('stroke-opacity', 0.3);

    // Add clip path to prevent lines from crossing axes
    svg.append('defs').append('clipPath')
      .attr('id', 'time-chart-clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', innerW)
      .attr('height', innerH);

    // Lines
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    const seriesG = g.append('g')
      .attr('clip-path', 'url(#time-chart-clip)');

    const paths = seriesG.selectAll('.series').data(series, d => d.key).join(enter => {
      const sg = enter.append('g').attr('class', 'series active').attr('data-key', d => d.key);
      sg.append('path')
        .attr('fill', 'none')
        .attr('stroke', d => color(d.key))
        .attr('stroke-width', 2.5)
        .attr('d', d => line(d.values));
      return sg;
    });

    // Add invisible hover areas for tooltips
    const hoverG = g.append('g').attr('clip-path', 'url(#time-chart-clip)');
    series.forEach(s => {
      const hoverArea = hoverG.append('g')
        .attr('class', 'hover-area')
        .attr('data-key', s.key);

      s.values.forEach(point => {
        hoverArea.append('circle')
          .attr('cx', x(point.year))
          .attr('cy', y(point.count))
          .attr('r', 6)
          .attr('fill', 'transparent')
          .attr('stroke', 'transparent')
          .style('cursor', 'pointer')
          .on('mouseenter', function (ev) {
            d3.select(this).attr('fill', color(s.key)).attr('stroke', '#fff').attr('stroke-width', 2);
            if (!tip.empty()) {
              tip.style('display', 'block')
                .html(`<strong>${s.key}</strong><br/>Year: ${point.year}<br/>Count: ${fmt(point.count)}`);
              tip.style('left', (ev.pageX + 12) + 'px')
                .style('top', (ev.pageY + 12) + 'px');
            }
          })
          .on('mousemove', function (ev) {
            if (!tip.empty()) {
              tip.style('left', (ev.pageX + 12) + 'px')
                .style('top', (ev.pageY + 12) + 'px');
            }
          })
          .on('mouseleave', function () {
            d3.select(this).attr('fill', 'transparent').attr('stroke', 'transparent');
            if (!tip.empty()) tip.style('display', 'none');
          });
      });
    });

    // Legend with checkboxes
    const legend = svg.append('g').attr('class', 'legend')
      .attr('transform', `translate(${margin.left + 20}, 20)`);

    types.forEach((t, i) => {
      const lg = legend.append('g').attr('class', 'legend-item')
        .attr('transform', `translate(${i * 160},0)`);

      // Checkbox
      const checkbox = lg.append('foreignObject')
        .attr('width', 16)
        .attr('height', 16)
        .attr('y', -4)
        .html(`<input type="checkbox" checked style="cursor:pointer; width:14px; height:14px;" data-type="${t}" />`);

      checkbox.select('input').on('change', function () {
        const isChecked = this.checked;
        const seriesPath = seriesG.select(`.series[data-key="${t}"]`);
        const hoverArea = hoverG.select(`.hover-area[data-key="${t}"]`);

        if (isChecked) {
          seriesPath.classed('active', true).style('opacity', 1);
          hoverArea.style('display', 'block');
        } else {
          seriesPath.classed('active', false).style('opacity', 0);
          hoverArea.style('display', 'none');
        }
      });

      // Color indicator
      lg.append('rect').attr('x', 20).attr('y', 0).attr('width', 12).attr('height', 12).attr('rx', 2)
        .attr('fill', color(t));

      // Label
      lg.append('text').attr('x', 36).attr('y', 10)
        .style('font-size', '12px')
        .style('fill', '#e2e8f0')
        .text(t);
    });

    // Brush (Mini chart)
    const brushH = 80;
    const brushMargin = { top: 10, right: 20, bottom: 20, left: 56 };
    const brushInnerH = brushH - brushMargin.top - brushMargin.bottom;

    const bg = brushSvg.append('g').attr('transform', `translate(${brushMargin.left},${brushMargin.top})`);
    const x2 = d3.scaleLinear().domain(x.domain()).range([0, innerW]);
    const y2 = d3.scaleLinear().domain(y.domain()).range([brushInnerH, 0]);

    const line2 = d3.line().x(d => x2(d.year)).y(d => y2(d.count)).curve(d3.curveMonotoneX);

    bg.selectAll('.mini-series').data(series).join('path')
      .attr('class', 'mini-series')
      .attr('fill', 'none')
      .attr('stroke', d => color(d.key))
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6)
      .attr('d', d => line2(d.values));

    bg.append('g').attr('class', 'axis').attr('transform', `translate(0,${brushInnerH})`)
      .call(d3.axisBottom(x2).ticks(10).tickFormat(d3.format('d')));

    const brush = d3.brushX()
      .extent([[0, 0], [innerW, brushInnerH]])
      .on('brush end', brushed);

    bg.append('g').attr('class', 'brush').call(brush);

    function brushed(event) {
      const s = event.selection;
      if (!s) {
        x.domain(d3.extent(years));
      } else {
        x.domain([x2.invert(s[0]), x2.invert(s[1])]);
      }
      g.select('.axis').call(d3.axisBottom(x).ticks(10).tickFormat(d3.format('d')));
      paths.select('path').attr('d', d => line(d.values));
      // Update hover circles positions
      series.forEach(s => {
        hoverG.select(`.hover-area[data-key="${s.key}"]`).selectAll('circle')
          .data(s.values)
          .attr('cx', d => x(d.year))
          .attr('cy', d => y(d.count));
      });
    }
  }

})();
