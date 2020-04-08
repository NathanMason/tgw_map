var express = require('express');
var _ = require('lodash');
var GeoJSON = require('geojson');
var app = express();

//directories
app.use('/', express.static(__dirname + '/public'));
app.use('/scripts', express.static(__dirname + '/node_modules'));

//start the webserver
app.listen(8080);

MissionIntelApp = {};
require('./public/js/comm.js');
require('./public/js/marker.js');
require('./public/js/marker-fids.js');

var Utility = require('./public/js/utility.js');
var SIDCtable = require('./public/js/sidc.js');

var serverObject = {};
_.set(serverObject, 'units', []);
_.set(serverObject, 'requestArray', []);

// socket
var wsConnections = [];
var websocket = require('nodejs-websocket');
var server = websocket.createServer(function (conn) {

    let time = new Date();
    console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: <- Client connected');
    wsConnections.push(conn);
    conn.on("close", function (code, reason) {
        wsConnections.splice(wsConnections.indexOf(conn), 1);
        time = new Date();
        console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: -> Client disconnected');
    });
});

// this underscore function loops through all the data received frokm DCS and parses into a json object.
// the object produced is
//  {
//         unitID: 75,
//         type: 'BTR-80',
//         coalition: 1,
//         lat: 41.827466027798,
//         lon: 41.812401984863,
//         playername: '' this is empty but we should utalize it along with the player stats.
//  },
_.set(serverObject, 'unitParse', function (unit) {
    if (_.get(unit, 'action') == 'C') {
        serverObject.units[unit.unitID] = {
                unitID: _.get(unit, 'unitID'),
                type: _.get(unit, 'type'),
                coalition: _.get(unit, 'coalition'),
                lat: _.get(unit, 'lat'),
                lon: _.get(unit, 'lon'),
                playername: _.get(unit, 'playername', '')
        };
    }
    if (_.get(unit, 'action') == 'U') {
        if (_.get(serverObject.units[unit.unitID], 'lat', null) !== null && _.get(serverObject.units[unit.unitID], 'lon', null) !== null) {
            _.set(serverObject.units[unit.unitID], 'lat', _.get(unit, 'lat'));
            _.set(serverObject.units[unit.unitID], 'lon', _.get(unit, 'lon'));
        }
    }
    if (_.get(unit, 'action') == 'D') {
        delete serverObject.units[unit.unitID];
    }
    return true;
});

// convert our datag to geojson format. and we need to send this to the map.js file
function toGeoJSON(dcsData) {

     console.log("############################");

    let featureCollection = [];

    dcsData.units.forEach(function (unit) {
		console.log("inside dcsData.units")
		console.log(unit)
        serverObject.unitParse(unit);
    });

    serverObject.units.forEach(function (unit) {
		//console.log("inside server object")
        // DEFAULT MARKER
        let side = '0';
        let markerColor = 'rgb(252, 246, 127)';

        let _sidcObject = {};
        _sidcObject["codingScheme"] = 'S';
        _sidcObject["affiliation"] = 'U';
        _sidcObject["battleDimension"] = 'G';
        _sidcObject["status"] = '-';
        _sidcObject["functionID"] = '-----';
        _sidcObject["modifier1"] = '-';
        _sidcObject["modifier2"] = '-';

        // make a SIDC Object to store all values, so that we can override these as needed
        let lookup = SIDCtable[unit.type];
        // Check if this unit's type is defined in the table
        if (!lookup)
            return;

        for (var atr in lookup) {
            if (lookup[atr])
                _sidcObject[atr] = lookup[atr];
        }

        // OPTION: [COMMENT TO TURN OFF] SHOW AFFILIATION
        if (unit.coalition == 1) {
            markerColor = 'rgb(255, 88, 88)';
            _sidcObject["affiliation"] = 'H';
        }
        if (unit.coalition == 2) {
            markerColor = 'rgb(128, 224, 255)';
            _sidcObject["affiliation"] = 'F';
        }

        // Generate final SIDC string
        let _sidc = "";
        for (var atr in _sidcObject) {
            _sidc += _sidcObject[atr];
        }

        // Add unit to the feature collection
        featureCollection.push({
            lat: _.get(unit, 'lat'),
            lon: _.get(unit, 'lon'),
            monoColor: markerColor,
            SIDC: _sidc + '***',
            side: _.get(unit, 'coalition'),
            size: 30,
            source: 'awacs',
            type: _.get(unit, 'type'),
            name: _.get(unit, 'playername', '')
        });

    });

    let geoJSONData = GeoJSON.parse(featureCollection, {Point: ['lat', 'lon']});

    return geoJSONData;
}

function receiveDCSData(dcsData) {
    let geoJSONData = toGeoJSON(dcsData);
    for (let connection in wsConnections)
        wsConnections[connection].sendText(JSON.stringify(geoJSONData));
}

server.listen(8081);

function DCSDataRetriever(dataCallback) {

    const PORT = 3001;
    const ADDRESS = "127.0.0.1";
    var connOpen = true;

    const net = require('net');
    let buffer;

    function connect() {

        //gather request from request array
        var request = _.get(serverObject, 'requestArray[0]',"none")+"\r\n";

        const client = net.createConnection({host: ADDRESS, port: PORT}, () => {
            let time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS server!');
            connOpen = false;
            buffer = "";
        });

        client.on('connect', function() {
            client.write("INIT"+"\n");
        });

        client.on('data', (data) => {
            buffer += data;
            while ((i = buffer.indexOf("\n")) >= 0) {
                let data = JSON.parse(buffer.substring(0, i));
                dataCallback(data);
                buffer = buffer.substring(i + 1);
                client.write("NONE"+"\n");
                _.get(serverObject, 'requestArray').shift();
            }
        });

        client.on('close', () => {
            time = new Date();
            console.log(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting....');
            connOpen = true;
        });

        client.on('error', () => {
            console.log('error!');
            connOpen = true;
        });
    }

    setInterval(function(){
        if (connOpen === true) {
            connect();
        }
    }, 1 * 1000);

};

// start the process to retrieve DCS packets
DCSDataRetriever(receiveDCSData);
