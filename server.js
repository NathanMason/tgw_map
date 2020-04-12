//////////////////////////////////////////////////////////////////////////
///////// our constants, these never change unless done by the user
//////////////////////////////////////////////////////////////////////////
const PORT = 3001; // our port we listen to dcs on.
const ADDRESS = "127.0.0.1"; // our address
const net = require('net'); // we need net
const webport = 8080; // our webport
const serverlisten = 8081; // our pass through for the webserver
const showsides = true; // do we show sides.
const onesecond = 1000; // how many milliseconds to 1 second.
const refreshrate = 5; // our server refresh rate.
var logfile = 'nodeserver.log'; // what do we set our log file for rdebug
const forceconsole = false; // over rules local rdebug options and forces a console output
const forcelogfile = false; // over rules local rdebug options and forces a file output
//////////////////////////////////////////////////////////////////////////
///////// THRIDPARTY PACKAGES
//////////////////////////////////////////////////////////////////////////
const bodyParser = require('body-parser');
const path = require('path');
var express = require('express');
var _ = require('lodash');
var GeoJSON = require('geojson');
var morgan = require('morgan')
var fs = require('fs');
var util = require('util');
var log_stdout = process.stdout;
//////////////////////////////////////////////////////////////////////////
///////// SET EXPRESS
//////////////////////////////////////////////////////////////////////////
var app = express();
app.use(morgan())
//////////////////////////////////////////////////////////////////////////
///////// TGW USER STATS APPLICATION (this will be merged into the app folder soon.)
//////////////////////////////////////////////////////////////////////////
const API = require(path.join(__dirname, 'api/db_api.js'));
const CONFIG = require(path.join(__dirname, 'config.js'));
const LOGGER = require(path.join(__dirname, 'logger.js'));
const e = 'error'; //vars for easy logging
const t = 'task'; // const i = 'info';


// believe these are for encoding could be wrong.
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({limit:CONFIG.getPostJsonSizeLimit()}));

//////////////////////////////////////////////////////////////////////////
///////// server folders
//////////////////////////////////////////////////////////////////////////
app.use('/js', express.static(path.join(__dirname, '/views/js')));  // robs stats site, move this ASAP into our angular site
app.use('/css', express.static(path.join(__dirname, '/views/css')));  // robs stats site, move this ASAP into our angular site
app.use('/json_viewer', express.static(__dirname + '/node_modules/jquery.json-viewer/json-viewer/'));  // robs stats site, move this ASAP into our angular site
app.use('/assets', express.static(path.join(__dirname, '/views/assets')));  // robs stats site, move this ASAP into our angular site
app.set('view engine', 'ejs');  // robs stats site, move this ASAP into our angular site

app.use('/', express.static(__dirname + '/app'));
app.use('/app', express.static(__dirname + '/app'));
app.use('/scripts', express.static(__dirname + '/node_modules'));

//////////////////////////////////////////////////////////////////////////
///////// LAUNCH THE SERVERS
//////////////////////////////////////////////////////////////////////////
app.listen(webport);

//////////////////////////////////////////////////////////////////////////
///////// our constants, these never change unless done by the user
//////////////////////////////////////////////////////////////////////////
MissionIntelApp = {};
require('./app/js/comm.js');
require('./app/js/marker.js');
require('./app/js/marker-fids.js');

var SIDCtable = require('./app/js/sidc.js');

var serverObject = {};
_.set(serverObject, 'units', []);
_.set(serverObject, 'requestArray', []);


// Spits out a debug to either console or to file or both.
function rdebug(debuginfo,consolelogging = true,filelogging = true)
{
  var dcDate = new Date();
  var datestring = dcDate.toISOString();
  //console.log('dcseconds:'+ dcseconds);
  if ((consolelogging == true) || (forceconsole == true)){
    console.log(datestring + ':' + debuginfo);
  }
  if ((filelogging == true) || (forcelogfile == true)){
    fs.appendFile(logfile,datestring + ":",'utf8', function(err){ if (err) throw err; });
    fs.appendFile(logfile,util.format(debuginfo) + "\n",'utf8',
    // callback function
    function(err) {  if (err) throw err; }
  );
  }
}

//////////////////////////////////////////////////////////////////////////
///////// SETUP AND CREATE SOCKET
//////////////////////////////////////////////////////////////////////////
var wsConnections = [];
var websocket = require('nodejs-websocket');
var server = websocket.createServer(function (conn) {

    let time = new Date();
    rdebug(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: <- Client connected');
    wsConnections.push(conn);
    conn.on("close", function (code, reason) {
        wsConnections.splice(wsConnections.indexOf(conn), 1);
        time = new Date();
        rdebug(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: -> Client disconnected');
    });
});

//////////////////////////////////////////////////////////////////////////
// this underscore function loops through all the data received frokm DCS and parses into a json object.
// the object produced is
//  {
//         unitID: 75,
//         type: 'BTR-80',
//         coalition: 1,
//         lat: 41.827466027798,
//         lon: 41.812401984863,
//  		   alt: 0190.021939291321,
//         heading: 90,
//         speed: 421,
//	  	   missionname: 'unit #1231' // this is the name IN the mission editor possibly player name as well.
//         playername: '', // this is empty but we should utalize it along with the player stats.
//         displayname: 'BTR-80 APC',
//  		   Category: 'Ground'
//  },
//////////////////////////////////////////////////////////////////////////
_.set(serverObject, 'unitParse', function (unit) {
    if (_.get(unit, 'action') == 'C') {
        rdebug('Create Request for unit:' + unit.unitID,false,false);
        serverObject.units[unit.unitID] = {
          unitID: _.get(unit, 'unitID'),
          type: _.get(unit, 'type'),
          coalition: _.get(unit, 'coalition'),
          lat: _.get(unit, 'lat'),
          lon: _.get(unit, 'lon'),
          alt: _.get(unit, 'alt'),
          heading: _.get(unit,'heading'),
          speed:_.get(unit,'speed'),
          missionname: _.get(unit, 'missionname'),
          playername: _.get(unit, 'playername', ''),
          displayname: _.get(unit, 'displayname'),
          category: _.get(unit, 'category')
        };
    }
    if (_.get(unit, 'action') == 'U') {
        rdebug('Update reguested for unit:' + unit.unitID,false,false);
        if (_.get(serverObject.units[unit.unitID], 'lat', null) !== null && _.get(serverObject.units[unit.unitID], 'lon', null) !== null) {
            _.set(serverObject.units[unit.unitID], 'lat', _.get(unit, 'lat'));
            _.set(serverObject.units[unit.unitID], 'lon', _.get(unit, 'lon'));
      			_.set(serverObject.units[unit.unitID], 'alt', _.get(unit, 'alt'));
            _.set(serverObject.units[unit.unitID], 'heading', _.get(unit, 'heading'));
            _.set(serverObject.units[unit.unitID], 'speed', _.get(unit, 'speed'));
            rdebug('Updated Info for unit:' + unit.unitID,false,false);
            rdebug(serverObject.units[unit.unitID],false,false);
        }
    }
    if (_.get(unit, 'action') == 'D') {
        if (serverObject.units[unit.unitID] != null)
        {
          rdebug('Delete Request Sent for unit:' + unit.unitID + ',unit existed deleted');
          delete serverObject.units[unit.unitID];
        }
        else {
          rdebug('Delete Request Sent for unit' + unit.unitId + ',but unit was already delete',false,false);
        }
    }
    return true;
});

// convert our datag to geojson format. and we need to send this to the map.js file
function toGeoJSON(dcsData) {
    let featureCollection = [];
    dcsData.units.forEach(function (unit) {
        serverObject.unitParse(unit);
    });

    serverObject.units.forEach(function (unit) {

            let side = '0';
            let markerColor = 'rgb(252, 246, 127)';

            let _sidcObject = {};
            _sidcObject["icon"] = 'unknown.jpg';
            _sidcObject["unitimage"] = 'default.jpg';
            // make a SIDC Object to store all values, so that we can override these as needed
            let lookup = SIDCtable[unit.type];

            // Check if this unit's type is defined in the table
            if (!lookup) {
    			rdebug("unit type:" + unit.type + "is missing from the SIDCtable! ",true,true); // we dump a console log and then set into the else, this should basically make a default item unless i'm mistaken.
    			// plus it will give us a log of items we need to deal with over time.
    			//return;
    		}
    		else {
    			for (var atr in lookup) {
    				if (lookup[atr])
    					_sidcObject[atr] = lookup[atr];
    			}
    		}
        rdebug(unit,false,false);
            // set showsides == false if we don't want this.
    		if (showsides == true) {
    			if (unit.coalition == 1) {
    				markerColor = 'rgb(255, 88, 88)';
    				_sidcObject["affiliation"] = 'H';
    			}
    			if (unit.coalition == 2) {
    				markerColor = 'rgb(128, 224, 255)';
    				_sidcObject["affiliation"] = 'F';
    			}
    		}

            // Add unit to the feature collection
            featureCollection.push({
                lat: _.get(unit, 'lat'),
                lon: _.get(unit, 'lon'),
    			      alt: _.get(unit, 'alt'),
                heading: _.get(unit,'heading'),
                speed:_.get(unit,'speed'),
                monoColor: markerColor,
                icon: _sidcObject["icon"],
                unitimage: _sidcObject["unitimage"],
                SIDC: _sidcObject,
                side: _.get(unit, 'coalition'),
                size: 30,
                source: _.get(unit, 'category'),
                type: _.get(unit, 'type'),
                name: _.get(unit, 'playername', ''),
    			      missionname: _.get(unit, 'missionname'),
    			      displayname: _.get(unit, 'displayname'),
    			      category: _.get(unit, 'category')
            });

    });

    let geoJSONData = GeoJSON.parse(featureCollection, {Point: ['lat', 'lon']});

    return geoJSONData;
}

function receiveDCSData(dcsData) {
    let geoJSONData = toGeoJSON(dcsData)
    for (let connection in wsConnections)
        wsConnections[connection].sendText(JSON.stringify(geoJSONData));
}

server.listen(serverlisten);

function DCSDataRetriever(dataCallback) {

    var connOpen = true;
    let buffer;

    function connect() {

        //gather request from request array
        var request = _.get(serverObject, 'requestArray[0]',"none")+"\r\n";

        const client = net.createConnection({host: ADDRESS, port: PORT}, () => {
            let time = new Date();
            rdebug(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Connected to DCS server!');
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
            rdebug(time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds() + ' :: Reconnecting....');
			// ok we need a way to reset the data because DCS expects it to be clean if a connection is lost! so set the SERVER object list to 0 ie clean it out and wait.
			serverObject.length = 0
            connOpen = true;
        });

        client.on('error', () => {
            rdebug('error!');
            connOpen = true;
        });
    }

    setInterval(function(){
        if (connOpen === true) {
            connect();
        }
    }, refreshrate * onesecond);

};

//API for WEB View
app.post('/api/web/fetch', (req, res) => {
  rdebug('WEB Server Stats Requested: Sending the JSON object');
  res.json(API.getJson()); //send them the data they need
});

//API for SLSC Server
//update the database with new info
app.post('/api/dcs/slmod/update', (req, res) => {
  rdebug('DCS Server Stats Received: "' + req.body.name + '", ID ' + req.body.id);
  var err = API.update(req.body); //send it the stats and server info
  if (err) {
    rdebug(err);
    res.end('fail');
  } else { res.end('pass') }

});

// start the process to retrieve DCS packets
DCSDataRetriever(receiveDCSData);
