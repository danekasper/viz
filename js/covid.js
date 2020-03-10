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


