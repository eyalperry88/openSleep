// RFduino Node Example

// Discover and read temperature from RFduinos running the Temperature Sketch
// https://github.com/RFduino/RFduino/blob/master/libraries/RFduinoBLE/examples/Temperature/Temperature.ino
//
// (c) 2014 Don Coleman
var noble = require('noble'),
    rfduino = require('./rfduino'),
    _ = require('underscore');

 // Set Up HTTP Server
var express = require('express');
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/assets'));
app.get('/', function(req, res){
  let file = req.query.file;
  if (file) {
    try {
      var content = fs.readFileSync("/data/" + file, "utf8");
      res.render('report', {file: file, content: content});
    } catch (err) {
      res.render('error', {file: file, err: err});
    }
  } else {
    res.render('index');
  }
});

var server = app.listen(3000);
var io = require('socket.io').listen(server);
var sock = null;
var fs = require('fs');
var stream = null;

// load simulated data
var simulation = false;
var simulatedData = [];
var simulatedIndex = 0;
var simulationInterval = null;
fs.readFile(__dirname + '/data/signals', (err, data) => {
  if (err) throw err;
  var lines = data.toString().split("|")
  lines.splice(0, 4)
  for (line of lines) {
    var data = line.split(",").map(s => parseInt(s))
    buf = Buffer.allocUnsafe(12);
    buf.writeUInt32LE(data[0], 0);
    buf.writeUInt32LE(data[1], 4);
    buf.writeUInt32LE(data[2], 8);
    simulatedData.push(buf)
  }
});

io.sockets.on('connection', function (socket) {
  sock = socket;
  sock.on('user', function (data) {
    if (data.recording == 'start') {
      stream = fs.createWriteStream('/data/' + data.file);
      stream.write(data.firstName);
      stream.write('|');
      stream.write(data.secondName);
      stream.write('|');
      stream.write(data.age);
      stream.write('|');
      stream.write(data.gender);
    } else {
      stream.end();
      stream = null;
    }
    console.log(data);
  });

  sock.on('event', function (evt) {
    if (stream != null) {
      stream.write('|EVENT,' + evt);
    }
    console.log("wakeup");
  });

  sock.on('simulate', function () {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }

    simulation = !simulation
    if (simulation) {
      simulatedIndex = 0;
      simulationInterval = setInterval(function() {
        sendData(simulatedData[simulatedIndex]);
        simulatedIndex += 1;
        if (simulatedIndex >= simulatedData.length) {
          console.log("reset");
          simulatedIndex = 0;
        }
      }, 100);
    }
  });
});

function sendData(data) {
  if (sock != null) {
    sock.emit('data', data);
    if (stream != null) {
      stream.write('|');
      flex = data.readUInt32LE(0);
      hr = data.readUInt32LE(4);
      eda = data.readUInt32LE(8);
      stream.write(flex + "," + hr + "," + eda);
    } else {
      flex = data.readUInt32LE(0);
      hr = data.readUInt32LE(4);
      eda = data.readUInt32LE(8);
      console.log(flex + "," + hr + "," + eda);
    }
  }
}

// TODO why does this need to be wrapped?
var stop = function() {
    noble.stopScanning();
};

noble.on('scanStart', function() {
    console.log('Scan started');
    //setTimeout(stop, 5000);
});

noble.on('scanStop', function() {
    console.log('Scan stopped');
});

var onDeviceDiscoveredCallback = function(peripheral) {
    console.log('\nDiscovered Peripherial ' + peripheral.uuid);

    if (_.contains(peripheral.advertisement.serviceUuids, rfduino.serviceUUID)) {
        console.log('RFduino is advertising \'' + rfduino.getAdvertisedServiceName(peripheral) + '\' service.');

        peripheral.on('connect', function() {
          console.log('Connect');
            peripheral.discoverServices();
        });

        peripheral.on('disconnect', function() {
            console.log('Disconnected');
        });

        peripheral.on('servicesDiscover', function(services) {

            var rfduinoService;

            for (var i = 0; i < services.length; i++) {
                if (services[i].uuid === rfduino.serviceUUID) {
                    rfduinoService = services[i];
                    break;
                }
            }

            if (!rfduinoService) {
                console.log('Couldn\'t find the RFduino service.');
                return;
            }

            rfduinoService.on('characteristicsDiscover', function(characteristics) {
                console.log('Discovered ' + characteristics.length + ' service characteristics');

                var receiveCharacteristic;

                for (var i = 0; i < characteristics.length; i++) {
                    if (characteristics[i].uuid === rfduino.receiveCharacteristicUUID) {
                        receiveCharacteristic = characteristics[i];
                        break;
                    }
                }

                if (receiveCharacteristic) {
                    receiveCharacteristic.on('data', function(data, isNotification) {
                        //console.log(peripheral.uuid);
                        //console.log(data);
                        sendData(data);
                    });

                    console.log('Subscribing for temperature notifications');
                    //receiveCharacteristic.notify(true);

                    receiveCharacteristic.subscribe(function (err) {
                      console.log("Subscribe err " + err);
                    })
                }

            });

            setTimeout(function() {
              rfduinoService.discoverCharacteristics();
            }, 100);


        });

        peripheral.connect();
    }
};

noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        noble.startScanning([rfduino.serviceUUID], false);
    }
});

noble.on('discover', onDeviceDiscoveredCallback);
