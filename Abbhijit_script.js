(function () {
  document.addEventListener("DOMContentLoaded", function () {
    abbhijitDataset();
  });

  function abbhijitDataset() {
    fetch("near earth objects.csv")
      .then(abbhijitRes => abbhijitRes.text())
      .then(abbhijitCsv => {
        var abbhijitResult = Papa.parse(abbhijitCsv, { header: true });
        var abbhijitData = abbhijitResult.data;

        var abbhijitYearList = [];
        var abbhijitMissDistances = [];
        var abbhijitBrightnessValues = [];
        var abbhijitNames = [];
        var abbhijitDateStrs = [];

        for (var abbhijitI = 0; abbhijitI < abbhijitData.length; abbhijitI++) {
          var abbhijitItem = abbhijitData[abbhijitI];
          if (!abbhijitItem["Close-Approach (CA) Date"]) continue;

          var abbhijitCleanDate = abbhijitItem["Close-Approach (CA) Date"].split("±")[0].trim();
          var abbhijitDObj = new Date(abbhijitCleanDate);
          if (isNaN(abbhijitDObj)) continue;

          abbhijitYearList.push(abbhijitDObj.getFullYear());
          abbhijitDateStrs.push(abbhijitCleanDate);
          abbhijitNames.push(abbhijitItem["Object"]);
          abbhijitMissDistances.push(parseFloat(abbhijitItem["CA Distance Nominal (LD | au)"]) || null);
          abbhijitBrightnessValues.push(parseFloat(abbhijitItem["H (mag)"]) || null);
        }

        var abbhijitFilteredYears = abbhijitYearList.filter(abbhijitY => abbhijitY >= 2000 && abbhijitY <= 2025);
        var abbhijitByYear = {};
        abbhijitFilteredYears.forEach(abbhijitY => abbhijitByYear[abbhijitY] = (abbhijitByYear[abbhijitY] || 0) + 1);

        var abbhijitFinalYears = Object.keys(abbhijitByYear).map(Number).sort((abbhijitA, abbhijitB) => abbhijitA - abbhijitB);
        var abbhijitFinalCounts = abbhijitFinalYears.map(abbhijitY => abbhijitByYear[abbhijitY]);

        var abbhijitCumulative = [];
        var abbhijitSum = 0;
        abbhijitFinalCounts.forEach(abbhijitC => { abbhijitSum += abbhijitC; abbhijitCumulative.push(abbhijitSum); });

        abbhijitMakeBar(abbhijitFinalYears, abbhijitCumulative);
        abbhijitMakeScatter(abbhijitYearList, abbhijitMissDistances, abbhijitBrightnessValues, abbhijitNames, abbhijitDateStrs);
      })
      .catch(abbhijitErr => console.error("Error loading NEO data:", abbhijitErr));
  }

  function abbhijitMakeBar(abbhijitYearArr, abbhijitCountArr) {
    var abbhijitXSmooth = [abbhijitYearArr[0] - 1].concat(abbhijitYearArr);
    var abbhijitYSmooth = [0].concat(abbhijitCountArr);

    var abbhijitBarLayer = {
      x: abbhijitYearArr,
      y: abbhijitCountArr,
      type: "bar",
      marker: {
        color: "#5b8ee6",
        line: {
          color: "#2d4ea0",
          width: 1.2
        }
      },
      hovertemplate: "Year: %{x}<br>Count: %{y}<extra></extra>"
    };

    var abbhijitTrendLine = {
      x: abbhijitXSmooth,
      y: abbhijitYSmooth,
      mode: "lines",
      line: {
        color: "rgba(120,120,120,0.55)",
        width: 2.5,
        dash: "dot",
        shape: "spline"
      },
      hoverinfo: "skip"
    };

    var abbhijitChartSettings = {
      font: { color: "#ffffff" },
      title: {
        text: "NEO Approaches (Cumulative, 2000-2025)",
        font: { color: "#ffffff" }
      },
      xaxis: {
        title: { text: "Year", font: { color: "#ffffff" } },
        tickfont: { color: "#ffffff" },
        gridcolor: "#e2e6f5"
      },
      yaxis: {
        title: { text: "Cumulative Count", font: { color: "#ffffff" } },
        tickfont: { color: "#ffffff" },
        gridcolor: "#e2e6f5"
      },
      legend: {
        font: { color: "#ffffff" }
      },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      hoverlabel: {
        font: {
          size: 16,
          color: "#333"
        },
        bgcolor: "#f2f2f2",
        bordercolor: "#999",
        namelength: -1
      }
    };

    Plotly.newPlot("barChart", [abbhijitBarLayer, abbhijitTrendLine], abbhijitChartSettings);
  }

  function abbhijitMakeScatter(abbhijitYList, abbhijitDistList, abbhijitHList, abbhijitObjNames, abbhijitDateLabels) {
    var abbhijitPoints = [];

    for (var abbhijitI = 0; abbhijitI < abbhijitYList.length; abbhijitI++) {
      if (!abbhijitDistList[abbhijitI]) continue;
      abbhijitPoints.push({
        year: abbhijitYList[abbhijitI],
        dist: abbhijitDistList[abbhijitI],
        h: abbhijitHList[abbhijitI],
        name: abbhijitObjNames[abbhijitI],
        date: abbhijitDateLabels[abbhijitI]
      });
    }
    abbhijitPoints.sort((abbhijitA, abbhijitB) => abbhijitA.dist - abbhijitB.dist);
    abbhijitPoints = abbhijitPoints.slice(0, 20);

    var abbhijitTrace = {
      x: abbhijitPoints.map(abbhijitP => abbhijitP.h),
      y: abbhijitPoints.map(abbhijitP => abbhijitP.dist),
      mode: "markers",
      marker: {
        size: abbhijitPoints.map(abbhijitP => Math.max(12, 28 - abbhijitP.h)),
        color: abbhijitPoints.map(abbhijitP => abbhijitP.h),
        colorscale: "Viridis",
        opacity: 0.9,
        line: { width: 1, color: "black" }
      },
      text: abbhijitPoints.map(abbhijitP =>
        `<b>${abbhijitP.name}</b><br>H-mag: ${abbhijitP.h}<br>Miss Dist: ${abbhijitP.dist} LD<br>Year: ${abbhijitP.year}`
      ),
      hovertemplate: "%{text}<extra></extra>"
    };

    var abbhijitLayout = {
      font: { color: "#ffffff" },
      title: {
        text: "Closest 20 Near-Earth Approaches",
        font: { color: "#ffffff" }
      },
      xaxis: {
        title: { text: "H (Magnitude) — Smaller = Larger Object", font: { color: "#ffffff" } },
        tickfont: { color: "#ffffff" }
      },
      yaxis: {
        title: { text: "Miss Distance (Lunar Distance)", font: { color: "#ffffff" } },
        tickfont: { color: "#ffffff" }
      },
      legend: {
        font: { color: "#ffffff" }
      },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      hoverlabel: {
        font: { size: 16, color: "#333" },
        bgcolor: "#f2f2f2",
        bordercolor: "#999",
        namelength: -1
      }
    };
    Plotly.newPlot("scatterPlot", [abbhijitTrace], abbhijitLayout);
  }
})();
