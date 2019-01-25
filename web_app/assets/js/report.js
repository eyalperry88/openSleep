// process file content
var thresh = 50;

var dataFlex = [];
var dataHR = [];
var dataEDA = [];
var dataWakeups = [];
var dataCalibrations = [];

var lines = content.split("|")
var firstName = lines[0];
var lastName = lines[1];
var age = lines[2];
var gender = lines[3];
var count = 0;
for (var i = 4; i < lines.length; i++) {
  var row = lines[i].split(",");
  if (row[0] == "EVENT") {
    console.log(row);
    switch (row[1]) {
      case "calibrate_start":
        dataCalibrations.push(count);
        // do something with the mean data
        break;
      case "calibrate_end":
        dataCalibrations.push(count);
        break;
      case "wakeup":
        dataWakeups.push(count);
        break;
    }
  } else {
    dataFlex.push(parseInt(row[0]));
    dataHR.push(parseInt(row[1]));
    dataEDA.push(parseInt(row[2]));
    count += 1;
  }
}

var bufferLen = 200;
var maxBufferLen = 600;
var tmpBuffer = dataHR.slice(0, bufferLen);
var dataBPM = new Array(bufferLen).fill(0);
for (var i = bufferLen; i < dataHR.length; i++) {
  dataBPM.push(processBPM(tmpBuffer, thresh));
  tmpBuffer.push(dataHR[i]);
  if (tmpBuffer.length >= maxBufferLen) {
    tmpBuffer.shift();
  }
}

console.log(dataBPM.length)
console.log(dataHR.length)


$(document).ready(function () {
  $("#first-name").val(firstName);
  $("#last-name").val(lastName);
  $("#age").val(age);
  $("#gender").val(gender);
  var n = dataFlex.length;
  var svg = d3.select("#big_plot"),
      margin = {top: 20, right: 40, bottom: 20, left: 40},
      width = parseInt(svg.style("width").slice(0, -2));
      width = width  - margin.left - margin.right,
      height = parseInt(svg.style("height").slice(0, -2));
      height = height - margin.top - margin.bottom,
      g = svg
        .call(d3.zoom().on("zoom", function () {
          svg.attr("transform", d3.event.transform)
        }))
        .append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleLinear()
    .domain([0, n - 1])
    .range([0, width]);

  var y = d3.scaleLinear()
    .domain([0, 1023])
    .range([height, 0]);

  var y2 = d3.scaleLinear()
    .domain([0, 1023])
    .range([height, 0]);

  var lineFlex = d3.line()
    .x(function(d, i) { return x(i); })
    .y(function(d, i) { return y(d); });
  var lineHR = d3.line()
    .x(function(d, i) { return x(i); })
    .y(function(d, i) { return y(d * 8); })
    .curve(d3.curveCardinal);
  var lineEDA = d3.line()
    .x(function(d, i) { return x(i); })
    .y(function(d, i) { return y(d * 25); });

  g.append("defs").append("clipPath")
  .attr("id", "clip")
  .append("rect")
  .attr("width", width)
  .attr("height", height);

  var xAxis = d3.axisBottom(x)
    .tickValues(d3.range(x.domain()[0], x.domain()[1], 600))
    .tickFormat(function (t) {
      var minutes = Math.floor(t / 600);
      var seconds = Math.floor(t % 600 / 10);

      return ("0"+minutes).slice(-2) + ":" + ("0"+seconds).slice(-2)
    });

  var yAxis = d3.axisLeft(y)
    .tickValues(d3.range(y.domain()[0], y.domain()[1], 40))
    .tickFormat(function (t) {
      return Math.floor(t / 8)
    });

  var yAxis2 = d3.axisRight(y2)
    .tickValues(d3.range(y2.domain()[0], y2.domain()[1], 50))
    .tickFormat(function (t) {
      return Math.floor(t / 25)
    });

  g.append("g")
  .attr("class", "axis axis--x")
  .attr("transform", "translate(0," + y(0) + ")")
  .call(xAxis);

  g.append("g")
  .attr("class", "axis axis--y axis-hr")
  .call(yAxis);

  g.append("g")
  .attr("class", "axis axis--y axis-eda")
  .attr("transform", "translate(" + width + " ,0)")
  .call(yAxis2);

  g.append("g")
    .attr("clip-path", "url(#clip)")
  .append("path")
    .datum(dataFlex)
    .attr("class", "line-flex")
    .attr("d", lineFlex);

  g.append("g")
    .attr("clip-path", "url(#clip)")
  .append("path")
    .datum(dataBPM)
    .attr("class", "line-hr")
    .attr("d", lineHR);

  g.append("g")
    .attr("clip-path", "url(#clip)")
  .append("path")
    .datum(dataEDA)
    .attr("class", "line-eda")
    .attr("d", lineEDA);

  for (wakeup of dataWakeups) {
    console.log(wakeup);
    g.append("line")
    .attr("x1", x(wakeup))  //<<== change your code here
    .attr("y1", 0)
    .attr("x2", x(wakeup))  //<<== and here
    .attr("y2", height)
    .attr("class", "line-wakeup")
  }

  for (calibration of dataCalibrations) {
    g.append("line")
    .attr("x1", x(calibration))  //<<== change your code here
    .attr("y1", 0)
    .attr("x2", x(calibration))  //<<== and here
    .attr("y2", height)
    .attr("class", "line-calibration")
  }
})
