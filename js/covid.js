colors = ['black','#377eb8','#4daf4a','#984ea3','#ff7f00','darkblue','#a65628','#f781bf','#999999',
        '#a3c56e','#377eb8','#4daf4a','#984ea3','#ff7f00','darkblue','#a65628','#f781bf','#999999',
        'black','#377eb8','#4daf4a','#984ea3','#ff7f00','darkblue','#a65628','#f781bf','#999999'];
var forecastIdx;
var forecastDays = 10
var totalForecast = new Array(forecastDays+1).fill(0);

var countryPlots = {};
var dangerList = []
let isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;

  // converts the legend into a simple tooltip
  function legendAsTooltipPlugin({ className, style = { backgroundColor:"rgba(255, 249, 196, 0.92)", color: "black" } } = {}) {
    let legendEl;

    function init(u, opts) {
      legendEl = u.root.querySelector(".legend");
              
      legendEl.classList.remove("inline");
      //legendEl.classList.add("hidden");
      className && legendEl.classList.add(className);
    
      Object.assign(legendEl.style, {
        pointerEvents: "none",
        display: "none",
        position: "absolute",
        left: 0,
        top: 0,
        zIndex: 100,
        boxShadow: "2px 2px 10px rgba(0,0,0,0.5)",
        ...style
      });

      // hide series color markers
      const idents = legendEl.querySelectorAll(".ident");
      //for (let i = 0; i < idents.length; i++) {idents[i].style.display = "none";}

      // hide trend series
      const series_ = legendEl.querySelectorAll(".series");
      for (let i = 0; i < series_.length; i++) {series_[i].style.display = "block";}

      const plotEl = u.ctx.canvas.parentNode;

      // move legend into plot bounds
      plotEl.appendChild(legendEl);

      // show/hide tooltip on enter/exit
      plotEl.addEventListener("mouseenter", () => {
        u.root.querySelector(".legend").style.display = null;
      });
      plotEl.addEventListener("mouseleave", () => {u.root.querySelector(".legend").style.display = "none";});

      // let tooltip exit plot
      plotEl.style.overflow = "visible";
    }

    function update(u) {
      const { left, top, idx } = u.cursor;
      legendEl = u.root.querySelector(".legend");
      const series_ = legendEl.querySelectorAll(".series");
      hideforecast = false;
      for (var i=1; i< series_.length; i++) {
        if (hideforecast && i == 4) { 
          series_[i].style.display = "none";
          continue;
        }

        if (isNaN(u.data[i][idx]) || u.data[i][idx] == null) {
          series_[i].style.display = "none";
        } else {
          hideforecast = true;
          series_[i].style.display = "block";
        }
      }
      u.root.querySelector(".legend").style.transform = "translate(" + left + "px, " + top + "px)";
    }

    return {
      hooks: {
        init: init,
        setCursor: update,
      }
    };
  } 

  function seriesPointsPlugin({ outerRadius = 2, innerRadius = 2} = {}) {
 
    function addLabel(ctx, cx, cy, series_label) {
      ctx.font = screen.width > 500 ? '1em serif' : '3em serif';
      ctx.textAlign = 'start'
      ctx.fillText(series_label , cx+7, cy);
    }

    function drawPoint(ctx, cx, cy, s) {
      ctx.beginPath();
      ctx.arc(cx, cy, screen.width > 500 ? 4 : 6, 0, Math.PI*2, true);
      ctx.globalAlpha = s.alpha;
      ctx.closePath();
      ctx.fill();
    }

    function drawFinalPoint(u, i) {
      let { ctx } = u;
      let { stroke, scale } = u.series[i];

      ctx.fillStyle = u.series[i].stroke;
      
      //let j = u.series[i].idxs[0]; // all points
      //let j = u.series[i].idxs[1]; // final
      let j = u.data[i].length-1;

      while (j < u.series[0].idxs[1] + 1) {
        let val = u.data[i][j];
        let cx = Math.round(u.valToPos(u.data[0][j], 'x', true));
        let cy = Math.round(u.valToPos(val, scale, true));
        //drawStar(ctx, cx, cy);
        drawPoint(ctx, cx, cy, u.series[i]);
        addLabel(ctx, cx, cy, u.series[i].label + ' (n=' + Number(val).toLocaleString() +')');
        j++;
      };
      ctx.globalAlpha = 1;
    }

    return {
      opts: (u, opts) => {
        opts.series.forEach((s, i) => {
          if (i > 0) {
            uPlot.assign(s, {
              points: {
                show: drawFinalPoint,
              }
            });
          }
        });
      }
    }
  }

  function getOpts(title_, width_ = 500, height_ = 250) {
    return {
      title: title_,
      width: width_, //screen.width > 500 ? width_ : 500,
      height: height_, //screen.width > 500 ? height_ : 250,
      legend: {
        show: true,
      },
      plugins: [
      ],
      scales: {
        "x": {
          time: true,
        },
        "confirmed" : {
          auto:true,
        },
        "casesperday" : {
          auto:true,
        },
        "deaths" : {
          auto:true,
          range: (u, dataMin, dataMax) => {
            let [min, max] = uPlot.rangeNum(dataMin, dataMax, 0.2, true);
            return [
              Math.min(0, dataMin),
              Math.max(1, dataMax*2),
            ];
          }
        }
      },
      series: [
        {
          label: "Date",
          value: "{YYYY}-{MM}-{DD}"
        },
        ],
      axes: [
        {
          grid: {show: true}
        },
        {
          scale: 'confirmed',
          label: 'Cumulative cases',
          labelSize: 30,
          size: 60,
          side: 3,
          grid: {show: true},
        },
        {
          scale: 'deaths',
          label: 'Deaths',
          labelSize: 20,
          size: 45,
          side: 1,
          grid: {show: false},
          stroke: "red",
        },            
        {
          scale: 'casesperday',
          label: 'Cases per Day',
          labelSize: 20,
          size: 50,
          side: 1,
          grid: {show: false},
          stroke: "blue",
        },
      ],
    };
  }

function newSeries(opts_, x, scale_ = "confirmed", stroke_ = "black", dash_=[1,0], show_=true, width_=2) {
  opts_.series.push({
          show: show_,
          spanGaps: true,
          label: x,
          value: (self, rawValue) => Number(rawValue).toLocaleString(),
          scale: scale_,
          stroke: stroke_,
          width: width_,
          points: {show: false},
          dash: dash_,
        })
  return opts_;
}

Promise.all([
  fetch("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv").then(res => {return res.text()}),
  fetch("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv").then(res => {return res.text()}),
  fetch("https://raw.githubusercontent.com/AnthonyEbert/COVID-19_ISO-3166/master/JohnsHopkins-to-A3.csv").then(res => {return res.text()}),
  fetch("../data/country-lockdown.csv").then(res => {return res.text()}),
])
.then(data => {

  let ret = prepPlotData(data);
  setTimeout(() => makePlotNormalised(ret));

}).then(d=> {
  $("#totals").append(`Today (est): <strong>${Number(totalForecast[0]).toLocaleString()}</strong>. +7days <strong>${Number(totalForecast[8]).toLocaleString()}</strong>`)
  
  dangerList.sort().reverse();
  for (var i=0; i<dangerList.length && i <10; i++) {
    $("#atrisk").append(`${dangerList[i][1]} - ${(dangerList[i][0] * 100).toFixed()}%<br>`)
  }
 
  $('#countryplots').before(`<div>
    <h5 class="title">Country cumulative cases, deaths and cases per day plots </h5> 
    <small> The top few countries are shown, select from alphabetical or total lists to view other countries</small>
    <br>  
      <form-label>Ordered alphabetically: </form-label>
      <select onchange="viewCountryPlot(this)" id="selectCountry">
        <option value=-1>Select country chart to view</option>
      </select>
      <br>
      <form-label>Ordered by total: </form-label>
      <select onchange="viewCountryPlot(this)" id="selectCountryTotal">
        <option value=-1>Select country chart to view</option>
      </select>
      </div>
      <hr>`
    )
    createDropDownList()


}) 

function createDropDownList() {
  var select = document.getElementById("selectCountry"); 
  var select2 = document.getElementById("selectCountryTotal"); 

  var keys = Object.keys(countryPlots)
  for (var i=0; i < keys.length; i++) {
    var el = document.createElement("option");
    var number = countryPlots[keys[i]][3];
    el.textContent = `${keys[i]} (n=${number})`;
    el.value = keys[i];
    select2.appendChild(el);
  }

  keys.sort();
  for (var i=0; i < keys.length; i++) {
    var el = document.createElement("option");
    el.textContent = keys[i];
    el.value = keys[i];
    select.appendChild(el);
  }
}

function viewCountryPlot(e) {
  var val = e.options[e.selectedIndex].value;

  if (val) {
    var plotData = countryPlots[val];
    if (plotData) {
      new uPlot(plotData[0], plotData[1], plotData[2]);

      $('html, body').animate({
        scrollTop: $(`#${val}`).offset().top
      }, 2000);

    }
    e.selectedIndex = 0;


  }

}


function prepPlotData(data) {

  var countryConfirmedData = {};
  var countryConfirmedPerDayData = {};
  var countryDeathData = {};
  var countryNormalised = [];

  var dataConfirmed = data[0].replace("Korea, South", "South Korea").split('\n');
  var dataDeaths = data[1].replace("Korea, South", "South Korea").split('\n')
  var dataCountryLookup = data[2].split('\n');
  var countryLookup = {};


  var AustraliaConfirmed = {};
  var AustraliaDeaths = {};
  var dataCountryLockdown = data[3].replace("Korea, South", "South Korea").split('\n');
  var countryLockdown = {};

  // Country Lockdown
  for (var i=1; i<dataCountryLockdown.length; i++) {
    d_ = dataCountryLockdown[i].split(',');
    if (d_[1] && d_[1].length < 2) {
      continue;
    }
    countryLockdown[d_[0].replace(/[|&;$'%@"<>*()+,]/g, "")] = d_[1];
  }

  // Country Flag Look  ups
  for (var i=1; i < dataCountryLookup.length; i++) {
    d_ = dataCountryLookup[i].split(',');
    countryLookup[d_[0]] = d_[1];
  }

  colDateStart = 4;

  numCols = dataConfirmed[0].split(',').length
  dateList = dataConfirmed[0].split(',').slice(colDateStart, numCols).map(a => {return new Date(a).getTime() /1000}); 
  
  // Forecast x days
  for (var i=1; i < forecastDays; i++) {
    dateList.push(dateList[dateList.length-1] + 86400)
  }

  numDates = dateList.length;
  forecastIdx = numDates - forecastDays;

  for (var i=1; i<dataConfirmed.length; i++) {
    rowConfirmed_ = dataConfirmed[i].split(",")
    rowDeaths_ = dataDeaths[i].split(",")
    var county = false; 

    if (rowConfirmed_[1] == 'Australia' && rowConfirmed_[0] != 'From Diamond Princess') {
      AustraliaConfirmed[rowConfirmed_[0].replace("Australian Capital Territory", "ACT")] = rowConfirmed_.slice(colDateStart, numCols);
      AustraliaDeaths[rowConfirmed_[0]] = rowDeaths_.slice(colDateStart, numCols);
    }
    
    // Remove States/Towns
    if(rowConfirmed_.length == numCols + 1) {
      rowConfirmed_.shift();
      rowDeaths_.shift();
      county = true;
    }

    if (!rowConfirmed_[1]) {
      continue;
    } 


    country = rowConfirmed_[1].replace(/[|&;$'%@"<>*()+,]/g, "");
    

    if (country in countryConfirmedData) {
      for (var ee=colDateStart; ee<numCols; ee++) {
        if (county) {
          if (ee > 51) {continue;}
        }
        countryConfirmedData[country][ee-colDateStart] = Number(countryConfirmedData[country][ee-colDateStart]) + Number(rowConfirmed_[ee])
      }
    } else {
      countryConfirmedData[country] = rowConfirmed_.slice(colDateStart, numCols)
    }

    if (country in countryDeathData) {
      for (var ee=colDateStart; ee<numCols; ee++) {
        if (county) {
          if (ee > 51) {continue;}
        }
        countryDeathData[country][ee-colDateStart] = Number(countryDeathData[country][ee-colDateStart]) + Number(rowDeaths_[ee])
      }
    } else {
      countryDeathData[country] = rowDeaths_.slice(colDateStart, numCols)
    }
  }

  // Fix Errors 50 = March 12
  try {
    countryConfirmedData['Italy'][50] = 15133;
    countryConfirmedData['Spain'][50] = 3146;
    countryConfirmedData['Netherlands'][50] = 614;
    countryConfirmedData['United Kingdom'][50] = 594;
    countryConfirmedData['United Kingdom'][53] = 1395;
    countryConfirmedData['Belgium'][50] = 314;
    countryConfirmedData['Switzerland'][50] = 858;
    countryConfirmedData['Switzerland'][53] = 1600;
    countryConfirmedData['Japan'][50] = 675;
    countryConfirmedData['France'][50] = 2860;
    countryConfirmedData['France'][53] = 5380;
    countryConfirmedData['Australia'][50] = 140;
    countryConfirmedData['Germany'][50] = 2369;

  } catch (error) {
    console.log("Error Fixing 12 March Data")
  }

  totals = [];
  for (c in countryConfirmedData) {
    d = countryConfirmedData[c];
    if (c == "Cruise Ship") {
      continue;
    }
    totals.push({country: c, total:Number(d[d.length-1])})

    countryConfirmedPerDayData[c] = [];
    for (var ee=0; ee<numCols-colDateStart; ee++) {
      countryConfirmedPerDayData[c][ee] = Number(countryConfirmedData[c][ee]) - (ee == 0 ? 0 : Number(countryConfirmedData[c][ee - 1]))
    }

  }

  //Sort totals
  totals.sort(function(a, b) {
      return ((a.total > b.total) ? -1 : ((a.total == b.total) ? 0 : 1));
  });

  // GLOBAL PLOT
  plotDiv = $(`#globalPlot`)[0]
  optsGlobal = getOpts('Top 10 countries by number of confirmed cases', 750, 400);
  delete optsGlobal.axes[2];
  delete optsGlobal.axes[3];
  delete optsGlobal.scales['deaths'];
  delete optsGlobal.scales['casesperday'];
  optsGlobal.lock = true;
  optsGlobal.cursor = {
      focus: {
        alpha: 0.3,
        prox: 30,
      }
    };
  labels = []
  data = [dateList.slice(0, dateList.length-forecastDays+2)]

  for (var i=0; i< 10; i++) {
    c = totals[i].country
    labels.push(c);
    data.push(countryConfirmedData[c]);
    optsGlobal = newSeries(optsGlobal, c, "confirmed", colors[i-1],[1,0], c != "China");
  }

  //optsGlobal.legend['show'] = false;
  //let uplotGlobal = new uPlot(optsGlobal, data, plotDiv);

  $("#globalPlot .legend").removeClass("inline")
  $("#globalPlot .legend").css("text-align", "left")

  //return;

  // Australia Plot
  plotDiv = $(`#auPlot`)[0]
  var optsAu = getOpts('Australia cases by State', 750, 400);
  optsAu.gutters = {y:0, x:200}

  optsAu.plugins.push(seriesPointsPlugin());
  delete optsAu.axes[2];
  delete optsAu.axes[3];
  delete optsAu.scales['deaths'];
  delete optsAu.scales['casesperday'];
  optsAu.lock = true;
  optsAu.cursor = {
      focus: {
        alpha: 0.3,
        prox: 30,
      }
    };
  labels = []
  data = [dateList.slice(0, dateList.length-forecastDays+2)]

  i = 0;
  for (c in AustraliaConfirmed) {
    labels.push(c);
    data.push(AustraliaConfirmed[c]);
    optsAu = newSeries(optsAu, c, "confirmed", colors[i],[1,0]);
    i ++;
  }

  //optsAu.legend['show'] = false;
  let uplotAu = new uPlot(optsAu, data, plotDiv);
  
  $("#auPlot .legend").removeClass("inline")
  $("#auPlot .legend").css("text-align", "left")

  // COUNTRY SPECIFIC PLOTS
  for (var i=0; i<totals.length; i++) {

    if (isNaN(totals[i].total)) {
      continue;
    }

    let c = totals[i].country;
    var d = countryConfirmedData[c];
    var dd = countryDeathData[c]
    var ddd = countryConfirmedPerDayData[c];

    // Normalise
    var ii = 0;
    var d_norm = [];
    for (var ee=0; ee<d.length-1; ee++) {
      if (d[ee] > 99) {
        d_norm.push(Number(d[ee]))
      }
    }

    if (d_norm.length > 0) {
      countryNormalised.push({country: c, c_norm: d_norm});
    }

    if (c != "Australia") {
      //continue;
    }

    var currentNum = Number(d[d.length-1]);

    var optsCountry = getOpts(`${c} (n=${Number(currentNum).toLocaleString()})`, 550,300);
    optsCountry.plugins.push(legendAsTooltipPlugin());

    optsCountry = newSeries(optsCountry, c + " Confirmed");
    optsCountry = newSeries(optsCountry, c + " Deaths", "deaths", "red");
    optsCountry = newSeries(optsCountry, "Cases per day", "casesperday", "blue", [1,0], true, 1);

    if (Number(dd[dd.length-1]) == 0) {
      // optsCountry.scales.Deaths.range = [0,1];
      // optsCountry.scales.Deaths.auto = false;
    }

    // Forecast
    var forecastCases = new Array(numDates).fill(null); //JSON.parse(JSON.stringify(d)); //
    var optsCountry = newSeries(optsCountry, `${c} forecast cases`, "confirmed", "grey", [5,2])

    var linear_ = ((Number(d[d.length-1]) - Number(d[d.length-2])) + 
                (Number(d[d.length-2]) - Number(d[d.length-3])))/2

    var multiplier = ((Number(d[d.length-1]) / Number(d[d.length-2])) + 
                      (Number(d[d.length-3]) / Number(d[d.length-4])))/2

    if (multiplier > 1.3 || multiplier < 0.5 || isNaN(multiplier)) {multiplier = 1.05}

    if (currentNum > 500) {
      dangerList.push([linear_/ currentNum, c])
    }

    for (var ee=0; ee<forecastDays+1; ee++) {
      idx = numDates-forecastDays + ee;
      //var forecast_ = Number(Number(d[d.length-1])*(Math.pow(Number(multiplier),ee)))
      var forecast_ = Number(Number(d[d.length-1])+(linear_*ee));
      forecastCases[idx] = forecast_.toFixed(0);
      if (!isNaN(forecast_)) {
        totalForecast[ee] = Number(totalForecast[ee]) + forecast_;
      };
    }

    if (currentNum > 5) {
      plotDiv = $(`#countryplots`)[0]

      //var countryCode = countryLookup[c]
      //if (countryCode) {
      //  var flag = countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))
      //  $(`#${c}flag`).append(flag);
      //}
      optsCountry.id = c;
      var data = [dateList, d, dd, ddd, forecastCases]

      if (!isMobile || currentNum > 8000 || c == "Australia") {
        let country_uplot = new uPlot(optsCountry, data, plotDiv);
      } else {
        countryPlots[c] = [optsCountry, data, plotDiv, currentNum];
      }
      // }

    }
  } 
  
  return countryNormalised;

}

function makePlotNormalised(countryNormalised) {
  
  //Normalised plot
  // GLOBAL PLOT
  plotDiv = $(`#normPlot`)[0]
  var optsGlobal2 = getOpts('Cumulative cases per country in days since first reached 100th case', 750, 750);
  //optsGlobal2.height = 750;
  //optsGlobal2.width = 500;
  delete optsGlobal2.axes[2];
  delete optsGlobal2.axes[3];
  delete optsGlobal2.scales['deaths'];
  delete optsGlobal2.scales['casesperday'];
  optsGlobal2.plugins.push(seriesPointsPlugin());
  optsGlobal2.scales['x'].time = false;
  optsGlobal2.axes[0].label = "Days since 100th case"
  optsGlobal2.lock = true;
  optsGlobal2.cursor = {
      focus: {
        alpha: 0.3,
        prox: 30,
      }
    };

  //optsGlobal2.axes[1].values = (u, vals, space) => {return vals.map(v => Math.pow(10, Number(v).toFixed(2)));}
  var data = [Array.from(Array(50).keys())]

  for (var i=0; i< Math.min(30,countryNormalised.length); i++) {
    c = countryNormalised[i].country  
    data.push(countryNormalised[i].c_norm) //.map(Math.log10));
    optsGlobal2 = newSeries(optsGlobal2, c, "confirmed", colors[i], [1,0], 
    (c == "Italy" 
    || c == "Germany" 
    || c == "South Korea" 
    || c == "US"  
    || c == "Australia" 
    || c == "United Kingdom"
    || c == "France"
    || c == "Turkey")
    );
  }

  optsGlobal2.series[0] = {label: 'Days since 100th case'}
  let uplotNorm = new uPlot(optsGlobal2, data, plotDiv);
  $($(`#normPlot .uplot .legend`)[0]).css("width", screen.width > 750 ? "750px" : "500px") 
}
