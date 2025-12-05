(function () {
  const origTip = d3.select('#aadiss-tooltip');

  function origNormalizeType(origS) {
    if (!origS) return '';
    origS = String(origS).toUpperCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
    if (origS === 'RB' || origS === 'ROCKETBODY' || origS === 'ROCKET  BODY') return 'ROCKET BODY';
    if (origS.includes('ROCKET') && origS.includes('BODY')) return 'ROCKET BODY';
    if (origS.includes('PAYLOAD')) return 'PAYLOAD';
    if (origS.includes('DEBRIS')) return 'DEBRIS';
    return origS;
  }

  function origParseAnyDate(origX) {
    if (!origX) return null;
    origX = String(origX).trim();
    if (/^\d{4}$/.test(origX)) {
      return new Date(+origX, 0, 1);
    }
    const origD = new Date(origX);
    if (!isNaN(origD)) return origD;
    const origM = String(origX).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (origM) return new Date(+origM[1], +origM[2] - 1, +origM[3]);
    return null;
  }

  function origYearFrom(origX) {
    const origD = origParseAnyDate(origX);
    return origD ? origD.getFullYear() : null;
  }

  function origFmt(origN) { return d3.format(',')(origN); }
  const origRound2 = d3.format('.2f');

  let origSatRows = null;

  d3.csv("space_decay.csv").then(origData => {
    origSatRows = origData;
    origBuildAll();
  }).catch(origErr => {
    console.error("Error loading space_decay.csv:", origErr);
  });

  const origFileInput = document.getElementById('aadiss-satCsv');
  if (origFileInput) {
    origFileInput.addEventListener('change', async (origE) => {
      const origFile = origE.target.files?.[0];
      if (!origFile) return;
      const origText = await origFile.text();
      origSatRows = d3.csvParse(origText);
      if (origSatRows) { origBuildAll(); }
    });
  }

  function origBuildAll() {
    if (!origSatRows) return;
    try {
      origBuildRatioChart(origSatRows);
    } catch (origErr) {
      console.error('buildAll: Error in buildRatioChart:', origErr);
    }
    try {
      origBuildTimeChart(origSatRows);
    } catch (origErr) {
      console.error('buildAll: Error in buildTimeChart:', origErr);
    }
  }

  function origBuildRatioChart(origRows) {
    const origSvg = d3.select('#aadiss-ratioSvg');
    if (origSvg.empty()) return;

    origSvg.selectAll('*').remove();
    const origContainer = origSvg.node().parentElement;
    const origContainerWidth = origContainer.getBoundingClientRect().width || origContainer.clientWidth || 900;
    const origW = origContainerWidth;
    const origH = +origSvg.attr('height') || 560;
    origSvg.attr('width', origW);
    const origMargin = { top: 30, right: 80, bottom: 40, left: 90 };
    const origInnerW = origW - origMargin.left - origMargin.right;
    const origInnerH = origH - origMargin.top - origMargin.bottom;
    const origG = origSvg.append('g').attr('transform', `translate(${origMargin.left},${origMargin.top})`);

    const origByCountry = d3.rollups(
      origRows,
      origV => {
        const origPayload = d3.sum(origV, origD => origNormalizeType(origD.OBJECT_TYPE) === 'PAYLOAD' ? 1 : 0);
        const origDebris = d3.sum(origV, origD => origNormalizeType(origD.OBJECT_TYPE) === 'DEBRIS' ? 1 : 0);
        const origTotal = origPayload + origDebris;
        const origRatio = origPayload > 0 ? (origDebris / origPayload) : NaN;
        return { payload: origPayload, debris: origDebris, total: origTotal, ratio: origRatio };
      },
      origD => (origD.COUNTRY_CODE || '').toString().trim()
    )
      .filter(([origCc, origM]) => origCc && isFinite(origM.ratio) && origM.payload > 0);

    const origTopNEl = document.getElementById('aadiss-topNSlider');
    const origTopNVal = document.getElementById('aadiss-topNVal');
    const origMinTotEl = document.getElementById('aadiss-minTotSlider');
    const origMinTotVal = document.getElementById('aadiss-minTotVal');
    const origSortSel = document.getElementById('aadiss-sortBy');

    function origDeriveData() {
      const origMinTot = origMinTotEl ? +origMinTotEl.value : 0;
      const origSortBy = origSortSel ? origSortSel.value : 'ratio';

      let origData = origByCountry
        .map(([origCc, origM]) => ({ code: origCc, ...origM }))
        .filter(origD => origD.total >= origMinTot);

      if (origSortBy === 'ratio') origData.sort((origA, origB) => d3.descending(origA.ratio, origB.ratio));
      else if (origSortBy === 'payload') origData.sort((origA, origB) => d3.descending(origA.payload, origB.payload));
      else if (origSortBy === 'debris') origData.sort((origA, origB) => d3.descending(origA.debris, origB.debris));
      else if (origSortBy === 'alpha') origData.sort((origA, origB) => d3.ascending(origA.code, origB.code));

      const origTopN = origTopNEl ? +origTopNEl.value : 15;
      origData = origData.slice(0, origTopN);
      return origData;
    }

    function origRender() {
      const origData = origDeriveData();
      const origXMax = d3.max(origData, origD => origD.ratio) || 1;
      const origX = d3.scaleLinear().domain([0, origXMax * 1.05]).range([0, origInnerW]);
      const origY = d3.scaleBand().domain(origData.map(origD => origD.code)).range([0, origInnerH]).padding(0.5);

      origG.selectAll('.aadiss-axis').remove();
      origG.append('g').attr('class', 'aadiss-axis').attr('transform', `translate(0,${origInnerH})`)
        .call(d3.axisBottom(origX).ticks(8).tickSizeOuter(0));
      origG.append('g').attr('class', 'aadiss-axis').call(d3.axisLeft(origY).tickSizeOuter(0));

      const origLines = origG.selectAll('.aadiss-row-line').data(origData, origD => origD.code);
      origLines.join(
        origEnter => origEnter.append('line')
          .attr('class', 'aadiss-row-line')
          .attr('x1', 0).attr('x2', 0)
          .attr('y1', origD => origY(origD.code)).attr('y2', origD => origY(origD.code))
          .transition().duration(450).attr('x2', origD => origX(origD.ratio)),
        origUpdate => origUpdate.transition().duration(450)
          .attr('y1', origD => origY(origD.code)).attr('y2', origD => origY(origD.code))
          .attr('x2', origD => origX(origD.ratio)),
        origExit => origExit.transition().duration(250).attr('x2', 0).remove()
      );

      const origDots = origG.selectAll('.aadiss-ratio-dot').data(origData, origD => origD.code);
      origDots.join(
        origEnter => origEnter.append('circle')
          .attr('class', 'aadiss-ratio-dot')
          .attr('r', 6.5)
          .attr('cx', 0)
          .attr('cy', origD => origY(origD.code))
          .style('cursor', 'pointer')
          .on('mouseenter', (origEv, origD) => {
            d3.select(origEv.currentTarget).attr('r', 8);
            origShowTip(origEv, origD);
          })
          .on('mousemove', (origEv) => origMoveTip(origEv))
          .on('mouseleave', (origEv) => {
            d3.select(origEv.currentTarget).attr('r', 6.5);
            origHideTip();
          })
          .on('click', (origEv) => {
            const origSel = d3.select(origEv.currentTarget.parentNode).selectAll('.aadiss-ratio-dot');
            origSel.classed('aadiss-highlight', false);
            d3.select(origEv.currentTarget).classed('aadiss-highlight', !d3.select(origEv.currentTarget).classed('aadiss-highlight'));
          })
          .transition().duration(450)
          .attr('cx', origD => origX(origD.ratio)),
        origUpdate => origUpdate.transition().duration(450)
          .attr('cy', origD => origY(origD.code))
          .attr('cx', origD => origX(origD.ratio)),
        origExit => origExit.transition().duration(250).attr('cx', 0).remove()
      );

      const origLabels = origG.selectAll('.aadiss-ratio-label').data(origData, origD => origD.code);
      origLabels.join(
        origEnter => origEnter.append('text')
          .attr('class', 'aadiss-ratio-label')
          .attr('x', origD => origX(origD.ratio) + 8)
          .attr('y', origD => origY(origD.code) + 4)
          .text(origD => origRound2(origD.ratio)),
        origUpdate => origUpdate.transition().duration(450)
          .attr('x', origD => origX(origD.ratio) + 8)
          .attr('y', origD => origY(origD.code) + 4)
          .text(origD => origRound2(origD.ratio)),
        origExit => origExit.remove()
      );

      origSvg.selectAll('.aadiss-headings').remove();
      const origHeads = origSvg.append('g').attr('class', 'aadiss-headings')
        .attr('transform', `translate(${origMargin.left},${16})`);
      origHeads.append('text').attr('x', origInnerW / 2).attr('text-anchor', 'middle')
        .attr('font-size', 18).attr('font-weight', 700).style('fill', 'var(--fg)')
        .text('Debris-to-Payload Ratio by Country (Top ' + origData.length + ')');
      origHeads.append('text').attr('x', origInnerW / 2).attr('y', 20).attr('text-anchor', 'middle')
        .style('fill', 'var(--muted)').attr('font-size', 13)
        .text('Higher ratios indicate more debris per operational payload');

      function origShowTip(origEv, origD) {
        if (origTip.empty()) return;
        origTip.style('display', 'block')
          .html(
            `<strong>${origD.code}</strong><br/>
             Debris: ${origFmt(origD.debris)}<br/>
             Payload: ${origFmt(origD.payload)}<br/>
             Ratio: <strong>${origRound2(origD.ratio)}</strong>`
          );
        origMoveTip(origEv);
      }

      function origMoveTip(origEv) {
        if (origTip.empty()) return;
        origTip.style('left', (origEv.pageX + 12) + 'px')
          .style('top', (origEv.pageY + 12) + 'px');
      }

      function origHideTip() { if (!origTip.empty()) origTip.style('display', 'none'); }
    }

    if (origTopNEl) origTopNEl.addEventListener('input', () => { if (origTopNVal) origTopNVal.textContent = origTopNEl.value; origRender(); });
    if (origMinTotEl) origMinTotEl.addEventListener('input', () => { if (origMinTotVal) origMinTotVal.textContent = origMinTotEl.value; origRender(); });
    if (origSortSel) origSortSel.addEventListener('change', origRender);

    if (origTopNVal && origTopNEl) origTopNVal.textContent = origTopNEl.value;
    if (origMinTotVal && origMinTotEl) origMinTotVal.textContent = origMinTotEl.value;

    const origRatioSection = document.getElementById('aadiss-ratioSec');
    if (origRatioSection) {
      const origScrollyContainer = origRatioSection.closest('.aadiss-scrolly-container-single');
      if (origScrollyContainer) {
        origScrollyContainer.addEventListener('aadiss-scrolly-inview', () => {
          console.log('Ratio chart coming into view - rendering with animation');
          origRender();
        }, { once: true });
      } else {
        origRender();
      }
    }
  }

  function origBuildTimeChart(origRows) {
    const origSvg = d3.select('#aadiss-timeSvg');
    const origBrushSvg = d3.select('#aadiss-brushSvg');
    if (origSvg.empty()) return;

    origSvg.selectAll('*').remove();
    origBrushSvg.selectAll('*').remove();

    const origContainer = origSvg.node().parentElement;
    const origContainerWidth = origContainer.getBoundingClientRect().width || origContainer.clientWidth || 900;
    const origW = origContainerWidth;
    const origH = +origSvg.attr('height') || 420;
    origSvg.attr('width', origW);
    origBrushSvg.attr('width', origW);
    const origMargin = { top: 50, right: 20, bottom: 30, left: 56 };
    const origInnerW = origW - origMargin.left - origMargin.right;
    const origInnerH = origH - origMargin.top - origMargin.bottom;
    const origG = origSvg.append('g').attr('transform', `translate(${origMargin.left},${origMargin.top})`);

    const origCleaned = origRows.map(origR => ({
      year: origYearFrom(origR.LAUNCH_DATE),
      type: origNormalizeType(origR.OBJECT_TYPE)
    })).filter(origD => origD.year && ['PAYLOAD', 'DEBRIS', 'ROCKET BODY'].includes(origD.type));

    const origCountsByYearType = d3.rollups(
      origCleaned,
      origV => origV.length,
      origD => origD.year,
      origD => origD.type
    );

    const origYears = Array.from(new Set(origCleaned.map(origD => origD.year))).sort((origA, origB) => origA - origB);
    const origTypes = ['PAYLOAD', 'DEBRIS', 'ROCKET BODY'];

    const origSeries = origTypes.map(origT => {
      let origCumulative = 0;
      return {
        key: origT,
        values: origYears.map(origY => {
          const origYearCount = (origCountsByYearType.find(([origYy]) => origYy === origY)?.[1].find(([origTt]) => origTt === origT)?.[1]) || 0;
          origCumulative += origYearCount;
          return { year: origY, count: origCumulative };
        })
      };
    });

    const origX = d3.scaleLinear().domain(d3.extent(origYears)).range([0, origInnerW]);
    const origY = d3.scaleLinear()
      .domain([0, d3.max(origSeries, origS => d3.max(origS.values, origD => origD.count)) * 1.1 || 10])
      .nice()
      .range([origInnerH, 0]);

    const origColor = d3.scaleOrdinal()
      .domain(origTypes)
      .range(['#3b82f6', '#f97316', '#10b981']);

    origG.append('g').attr('class', 'aadiss-axis')
      .attr('transform', `translate(0,${origInnerH})`)
      .call(d3.axisBottom(origX).ticks(10).tickFormat(d3.format('d')));
    origG.append('g').attr('class', 'aadiss-axis').call(d3.axisLeft(origY).ticks(6));

    origG.append('g').attr('class', 'aadiss-grid')
      .call(d3.axisLeft(origY).tickSize(-origInnerW).tickFormat(''))
      .selectAll('line').attr('stroke-opacity', 0.3);

    origSvg.append('defs').append('clipPath')
      .attr('id', 'aadiss-time-chart-clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', origInnerW)
      .attr('height', origInnerH);

    const origLine = d3.line()
      .x(origD => origX(origD.year))
      .y(origD => origY(origD.count))
      .curve(d3.curveMonotoneX);

    const origSeriesG = origG.append('g')
      .attr('clip-path', 'url(#aadiss-time-chart-clip)');

    const origPaths = origSeriesG.selectAll('.aadiss-series').data(origSeries, origD => origD.key).join(origEnter => {
      const origSg = origEnter.append('g').attr('class', 'aadiss-series aadiss-active').attr('data-key', origD => origD.key);
      origSg.append('path')
        .attr('fill', 'none')
        .attr('stroke', origD => origColor(origD.key))
        .attr('stroke-width', 2.5)
        .attr('d', origD => origLine(origD.values));
      return origSg;
    });

    const origHoverG = origG.append('g').attr('clip-path', 'url(#aadiss-time-chart-clip)');
    origSeries.forEach(origS => {
      const origHoverArea = origHoverG.append('g')
        .attr('class', 'aadiss-hover-area')
        .attr('data-key', origS.key);

      origS.values.forEach(origPoint => {
        origHoverArea.append('circle')
          .attr('cx', origX(origPoint.year))
          .attr('cy', origY(origPoint.count))
          .attr('r', 6)
          .attr('fill', 'transparent')
          .attr('stroke', 'transparent')
          .style('cursor', 'pointer')
          .on('mouseenter', function (origEv) {
            d3.select(this).attr('fill', origColor(origS.key)).attr('stroke', '#fff').attr('stroke-width', 2);
            if (!origTip.empty()) {
              origTip.style('display', 'block')
                .html(`<strong>${origS.key}</strong><br/>Year: ${origPoint.year}<br/>Count: ${origFmt(origPoint.count)}`);
              origTip.style('left', (origEv.pageX + 12) + 'px')
                .style('top', (origEv.pageY + 12) + 'px');
            }
          })
          .on('mousemove', function (origEv) {
            if (!origTip.empty()) {
              origTip.style('left', (origEv.pageX + 12) + 'px')
                .style('top', (origEv.pageY + 12) + 'px');
            }
          })
          .on('mouseleave', function () {
            d3.select(this).attr('fill', 'transparent').attr('stroke', 'transparent');
            if (!origTip.empty()) origTip.style('display', 'none');
          });
      });
    });

    const origLegend = origSvg.append('g').attr('class', 'aadiss-legend')
      .attr('transform', `translate(${origMargin.left + 20}, 20)`);

    origTypes.forEach((origT, origI) => {
      const origLg = origLegend.append('g').attr('class', 'aadiss-legend-item')
        .attr('transform', `translate(${origI * 160},0)`);

      const origCheckbox = origLg.append('foreignObject')
        .attr('width', 16)
        .attr('height', 16)
        .attr('y', -4)
        .html(`<input type="checkbox" checked style="cursor:pointer; width:14px; height:14px;" data-type="${origT}" />`);

      origCheckbox.select('input').on('change', function () {
        const origIsChecked = this.checked;
        const origSeriesPath = origSeriesG.select(`.aadiss-series[data-key="${origT}"]`);
        const origHoverArea = origHoverG.select(`.aadiss-hover-area[data-key="${origT}"]`);

        if (origIsChecked) {
          origSeriesPath.classed('aadiss-active', true).style('opacity', 1);
          origHoverArea.style('display', 'block');
        } else {
          origSeriesPath.classed('aadiss-active', false).style('opacity', 0);
          origHoverArea.style('display', 'none');
        }
      });

      origLg.append('rect').attr('x', 20).attr('y', 0).attr('width', 12).attr('height', 12).attr('rx', 2)
        .attr('fill', origColor(origT));

      origLg.append('text').attr('x', 36).attr('y', 10)
        .style('font-size', '12px')
        .style('fill', '#e2e8f0')
        .text(origT);
    });

    const origBrushH = 80;
    const origBrushMargin = { top: 10, right: 20, bottom: 20, left: 56 };
    const origBrushInnerH = origBrushH - origBrushMargin.top - origBrushMargin.bottom;

    const origBg = origBrushSvg.append('g').attr('transform', `translate(${origBrushMargin.left},${origBrushMargin.top})`);
    const origX2 = d3.scaleLinear().domain(origX.domain()).range([0, origInnerW]);
    const origY2 = d3.scaleLinear().domain(origY.domain()).range([origBrushInnerH, 0]);

    const origLine2 = d3.line().x(origD => origX2(origD.year)).y(origD => origY2(origD.count)).curve(d3.curveMonotoneX);

    origBg.selectAll('.aadiss-mini-series').data(origSeries).join('path')
      .attr('class', 'aadiss-mini-series')
      .attr('fill', 'none')
      .attr('stroke', origD => origColor(origD.key))
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.6)
      .attr('d', origD => origLine2(origD.values));

    origBg.append('g').attr('class', 'aadiss-axis').attr('transform', `translate(0,${origBrushInnerH})`)
      .call(d3.axisBottom(origX2).ticks(10).tickFormat(d3.format('d')));

    const origBrush = d3.brushX()
      .extent([[0, 0], [origInnerW, origBrushInnerH]])
      .on('brush end', origBrushed);

    origBg.append('g').attr('class', 'aadiss-brush').call(origBrush);

    function origBrushed(origEvent) {
      const origS = origEvent.selection;
      if (!origS) {
        origX.domain(d3.extent(origYears));
      } else {
        origX.domain([origX2.invert(origS[0]), origX2.invert(origS[1])]);
      }
      origG.select('.aadiss-axis').call(d3.axisBottom(origX).ticks(10).tickFormat(d3.format('d')));
      origPaths.select('path').attr('d', origD => origLine(origD.values));
      origSeries.forEach(origS => {
        origHoverG.select(`.aadiss-hover-area[data-key="${origS.key}"]`).selectAll('circle')
          .data(origS.values)
          .attr('cx', origD => origX(origD.year))
          .attr('cy', origD => origY(origD.count));
      });
    }
  }

})();
