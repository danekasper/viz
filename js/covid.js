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
          for (var i=1; i< series_.length; i++) {
            if (isNaN(u.data[i][idx]) || u.data[i][idx] == null) {
              series_[i].style.display = "none";
            } else {
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

      function seriesPointsPlugin({ spikes = 8, outerRadius = 2, innerRadius = 2} = {}) {
        outerRadius *= devicePixelRatio;
        innerRadius *= devicePixelRatio;

        function drawStar(ctx, cx, cy) {
          let rot = Math.PI / 2 * 3;
          let x = cx;
          let y = cy;
          let step = Math.PI / spikes;

          ctx.beginPath();
          ctx.moveTo(cx, cy - outerRadius);

          for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
          }

          ctx.lineTo(cx, cy - outerRadius);
          ctx.closePath();
        }

        function drawPointsAsStars(u, i) {
          let { ctx } = u;
          let { stroke, scale } = u.series[i];

          ctx.fillStyle = "grey";

          let j = u.idxs[0];

          while (j < u.idxs[1] + 1) {
            let val = u.data[i][j];
            let cx = Math.round(u.valToPos(u.data[0][j], 'x', true));
            let cy = Math.round(u.valToPos(val, scale, true));
            if (j > 43) {
              drawStar(ctx, cx, cy);
              ctx.fill();
            }
            j++;
          };
        }

        function test(u,i) {
          console.log(u)
        }

        return {
          opts: (u, opts) => {
            opts.series.forEach((s, i) => {
              if (i > 0) {
                uPlot.assign(s, {
                  points: {
                    show: drawPointsAsStars,
                  }
                });
              }
            });
          }
        }
      }

      function getOpts(width_ = 500, height_ = 250) {
        return {
          width: screen.width > 500 ? width_ : 500,
          height: screen.width > 500 ? height_ : 250,
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
            "deaths" : {
              auto:true,
              range: (u, dataMin, dataMax) => {
                let [min, max] = uPlot.rangeNum(dataMin, dataMax, 0.2, true);
                return [
                  Math.min(0, dataMin),
                  Math.max(1, dataMax*1.2),
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
              label: 'Confirmed cases',
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
          ],
        };
      }

    function newSeries(opts_, x, scale_ = "confirmed", stroke_ = "black", dash_ = [1,0], show_=true) {
      opts_.series.push({
              show: show_,
              spanGaps: true,
              label: x,
              value: (self, rawValue) => Number(rawValue).toLocaleString(),
              scale: scale_,
              stroke: stroke_,
              width: 2,
              points: {show: false},
              dash: dash_,
            })
      return opts_;
    }

    colors = ['black','#377eb8','#4daf4a','#984ea3','#ff7f00','darkblue','#a65628','#f781bf','#999999',
            'black','#377eb8','#4daf4a','#984ea3','#ff7f00','darkblue','#a65628','#f781bf','#999999',
            'black','#377eb8','#4daf4a','#984ea3','#ff7f00','darkblue','#a65628','#f781bf','#999999'];
    var forecastIdx;
    var forecastDays = 10
    var totalForecast = new Array(forecastDays+1).fill(0);

    var countryConfirmedData = {};
    var countryDeathData = {};
    var countryNormalised = [];

    Promise.all([
      fetch("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv").then(res => {return res.text()}),
      fetch("https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Deaths.csv").then(res => {return res.text()}),
      ])
    .then(data => {
      dataConfirmed = data[0].replace("Korea, South", "South Korea").split('\n');
      dataDeaths = data[1].replace("Korea, South", "South Korea").split('\n')

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
        
        // Remove States/Towns
        if(rowConfirmed_.length == numCols + 1) {
          continue;
          rowConfirmed_.shift();
          rowDeaths_.shift();
        }

        if (!rowConfirmed_[1]) {
          continue;
        }


        country = rowConfirmed_[1].replace(/[|&;$%@"<>()+,]/g, "");
        

        if (country in countryConfirmedData) {
          for (var ee=colDateStart; ee<numCols; ee++) {
            countryConfirmedData[country][ee-colDateStart] = Number(countryConfirmedData[country][ee-colDateStart]) + Number(rowConfirmed_[ee])
          }
        } else {
          countryConfirmedData[country] = rowConfirmed_.slice(colDateStart, numCols)
        }

        if (country in countryDeathData) {
          for (var ee=colDateStart; ee<numCols; ee++) {
            countryDeathData[country][ee-colDateStart] = Number(countryDeathData[country][ee-colDateStart]) + Number(rowDeaths_[ee])
          }
        } else {
          countryDeathData[country] = rowDeaths_.slice(colDateStart, numCols)
        }

      }

      totals = [];
      for (c in countryConfirmedData) {
        d = countryConfirmedData[c];
        if (c == "Cruise Ship") {
          continue;
        }
        totals.push({country: c, total:Number(d[d.length-1])})
      }

      //Sort totals
      totals.sort(function(a, b) {
          return ((a.total > b.total) ? -1 : ((a.total == b.total) ? 0 : 1));
      });

      // GLOBAL PLOT
      $("#globalPlot").append(`<h5>Top 10 countries by number of confirmed cases (excl China)</h5>`)
      plotDiv = $(`#globalPlot`)[0]
      optsGlobal = getOpts(750, 400);
      delete optsGlobal.axes[2];
      delete optsGlobal.scales['deaths'];
      optsGlobal.lock = true;
      optsGlobal.cursor = {
          focus: {
            alpha: 0.3,
            prox: 30,
          }
        };
      labels = []
      data = [dateList.slice(0, dateList.length-forecastDays+1)]

      for (var i=1; i< 11; i++) {

        c = totals[i].country
        labels.push(c);
        data.push(countryConfirmedData[c]);
        optsGlobal = newSeries(optsGlobal, c, "confirmed", colors[i-1]);
      }

      //optsGlobal.legend['show'] = false;
      var uplot = new uPlot(optsGlobal, data, plotDiv);

      $("#globalPlot .legend").removeClass("inline")
      $("#globalPlot .legend").css("text-align", "left")

      //return;

      // COUNTRY SPECIFIC PLOTS
      for (var i=0; i<totals.length; i++) {

        if (isNaN(totals[i].total)) {
          continue;
        }

        c = totals[i].country;
        d = countryConfirmedData[c];
        dd = countryDeathData[c]

        // Normalise
        var ii = 0;
        var d_norm = [];
        for (var ee=0; ee<d.length-1; ee++) {
          if (d[ee] > 50) {
            d_norm.push(Number(d[ee]))
          }
        }

        if (d_norm.length > 0) {
          countryNormalised.push({country: c, c_norm: d_norm});
        }


        if (c != "Australia") {
          //continue;
        }

        optsCountry = getOpts();
        optsCountry.plugins.push(legendAsTooltipPlugin());

        optsCountry = newSeries(optsCountry, c + " Confirmed")
        optsCountry = newSeries(optsCountry, c + " Deaths", "deaths", "red")
        if (Number(dd[dd.length-1]) == 0) {
         // optsCountry.scales.Deaths.range = [0,1];
         // optsCountry.scales.Deaths.auto = false;
        }

        // Forecast
        forecastCases = new Array(numDates).fill(null); //JSON.parse(JSON.stringify(d)); //
        optsCountry = newSeries(optsCountry, `${c} forecast cases`, "confirmed", "grey", [5,2])

        linear_ = ((Number(d[d.length-1]) - Number(d[d.length-2])) + 
                   (Number(d[d.length-2]) - Number(d[d.length-3])))/2

        var multiplier = ((Number(d[d.length-1]) / Number(d[d.length-2])) + 
                         (Number(d[d.length-3]) / Number(d[d.length-4])))/2

        if (multiplier > 1.3 || multiplier < 0.5 || isNaN(multiplier)) {multiplier = 1.05}

        for (var ee=0; ee<forecastDays+1; ee++) {
          idx = numDates-forecastDays + ee;
          //var forecast_ = Number(Number(d[d.length-1])*(Math.pow(Number(multiplier),ee)))
          var forecast_ = Number(Number(d[d.length-1])+(linear_*ee));

          forecastCases[idx] = forecast_.toFixed(0);
          if (!isNaN(forecast_)) {
            totalForecast[ee] = Number(totalForecast[ee]) + forecast_;
          };
        }

        var currentNum = d[d.length-1];
        if (currentNum > 5) {
          $("#countryplots").append(`<div id="plot_${c.replace(/ /g,'')}"><h6 class="text-center mb-0">${c} <small>(n=${currentNum})</small></h6></div>`)
          plotDiv = $(`#plot_${c.replace(/ /g,'')}`)[0]

          data = [dateList, d, dd, forecastCases]
          
          let country_uplot = new uPlot(optsCountry, data, plotDiv);
        }
      } 
   
    }).then(d=> {

      //Normalised plot
      // GLOBAL PLOT
      $("#globalPlot").append(`<p></p><hr><div id="plot_norm"><h5>Normalised infection. Days post 50 cases</h5></div>`)

      plotDiv = $(`#plot_norm`)[0]
      optsGlobal2 = getOpts(750, 400);
      delete optsGlobal2.axes[2];
      delete optsGlobal2.scales['deaths'];

      optsGlobal2.scales['x'].time = false;
      optsGlobal2.lock = true;
      optsGlobal2.cursor = {
          focus: {
            alpha: 0.3,
            prox: 30,
          }
        };

      //optsGlobal2.axes[1].values = (u, vals, space) => {return vals.map(v => Math.pow(10, Number(v).toFixed(2)));}

      //optsGlobal2.plugins.push(legendAsTooltipPlugin());
      data = [Array.from(Array(50).keys())]

      for (var i=1; i< countryNormalised.length-1; i++) {
        c = countryNormalised[i].country  
        data.push(countryNormalised[i].c_norm) //.map(Math.log10));
        optsGlobal2 = newSeries(optsGlobal2, c, "confirmed", colors[i-1], [1,0], true);
      }

      //optsGlobal2.legend['show'] = false;
      optsGlobal2.series[0] = {label: 'Days since 50'}
      var uplot = new uPlot(optsGlobal2, data, plotDiv);
      plotDiv = $(`#plot_norm .uplot`)[0]
      $(plotDiv).css("width", "750px")

      

    }).then(d=> {
      $("#totals").append(`Today (est): <strong>${Number(totalForecast[0]).toLocaleString()}</strong>. +7days <strong>${Number(totalForecast[8]).toLocaleString()}</strong>`)
    }) 


