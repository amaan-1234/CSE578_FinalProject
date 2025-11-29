(function () {
  document.addEventListener("DOMContentLoaded", function () {
    dataset();
  });

  function dataset() {
    // Assuming the CSV file is in the same directory or served correctly
    fetch("near earth objects.csv")
      .then(res => res.text())
      .then(csv => {
        var result = Papa.parse(csv, { header: true });
        var data = result.data;

        var yearList = [];
        var missDistances = [];
        var brightnessValues = [];
        var names = [];
        var dateStrs = [];

        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          if (!item["Close-Approach (CA) Date"]) continue;

          var cleanDate = item["Close-Approach (CA) Date"].split("±")[0].trim();
          var dObj = new Date(cleanDate);
          if (isNaN(dObj)) continue;

          yearList.push(dObj.getFullYear());
          dateStrs.push(cleanDate);
          names.push(item["Object"]);
          missDistances.push(parseFloat(item["CA Distance Nominal (LD | au)"]) || null);
          brightnessValues.push(parseFloat(item["H (mag)"]) || null);
        }

        var filteredYears = yearList.filter(y => y >= 2000 && y <= 2025);
        var byYear = {};
        filteredYears.forEach(y => byYear[y] = (byYear[y] || 0) + 1);

        var finalYears = Object.keys(byYear).map(Number).sort((a, b) => a - b);
        var finalCounts = finalYears.map(y => byYear[y]);

        var cumulative = [];
        var sum = 0;
        finalCounts.forEach(c => { sum += c; cumulative.push(sum); });

        makeBar(finalYears, cumulative);
        makeScatter(yearList, missDistances, brightnessValues, names, dateStrs);
      })
      .catch(err => console.error("Error loading NEO data:", err));
  }

  // bar plot function
  function makeBar(yearArr, countArr) {
    var xSmooth = [yearArr[0] - 1].concat(yearArr);
    var ySmooth = [0].concat(countArr);

    var barLayer = {
      x: yearArr,
      y: countArr,
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

    var trendLine = {
      x: xSmooth,
      y: ySmooth,
      mode: "lines",
      line: {
        color: "rgba(120,120,120,0.55)",
        width: 2.5,
        dash: "dot",
        shape: "spline"
      },
      hoverinfo: "skip"
    };

    var chartSettings = {
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

    Plotly.newPlot("barChart", [barLayer, trendLine], chartSettings);
  }

  // scatter plot
  function makeScatter(yList, distList, hList, objNames, dateLabels) {
    var points = [];

    for (var i = 0; i < yList.length; i++) {
      if (!distList[i]) continue;
      points.push({
        year: yList[i],
        dist: distList[i],
        h: hList[i],
        name: objNames[i],
        date: dateLabels[i]
      });
    }
    points.sort((a, b) => a.dist - b.dist);
    points = points.slice(0, 20);

    var trace = {
      x: points.map(p => p.h),
      y: points.map(p => p.dist),
      mode: "markers",
      marker: {
        size: points.map(p => Math.max(12, 28 - p.h)),
        color: points.map(p => p.h),
        colorscale: "Viridis",
        opacity: 0.9,
        line: { width: 1, color: "black" }
      },
      text: points.map(p =>
        `<b>${p.name}</b><br>H-mag: ${p.h}<br>Miss Dist: ${p.dist} LD<br>Year: ${p.year}`
      ),
      hovertemplate: "%{text}<extra></extra>"
    };

    var layout = {
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
    Plotly.newPlot("scatterPlot", [trace], layout);
  }
})();
