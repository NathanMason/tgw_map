(function() {

  angular.module('redIberia')

    .controller('main_Controller', ['$scope', '$rootScope', function($scope, $rootScope) {

        $rootScope.showData = false;

        $scope.viewUnitData = function(){
            var e = JSON.parse(localStorage.getItem('currentUnit'));

        }

        window.addEventListener("load", function() {
            var app = new MissionIntelApp();
        });

        var MissionIntelApp = function() {

            //////////////////////////////////////////////////////////////////////////
            ///////// ENCODE THE DATA
            //////////////////////////////////////////////////////////////////////////
            var getJSON = function(url, data, callback) {
                // Must encode data
                if (data && typeof(data) === 'object') {
                    var y = '',
                        e = encodeURIComponent;
                    for (x in data) {
                        y += '&' + e(x) + '=' + e(data[x]);
                    }
                    data = y.slice(1);
                    url += (/\?/.test(url) ? '&' : '?') + data;
                }

                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open("GET", url, true);
                xmlHttp.setRequestHeader('Accept', 'application/json, text/javascript');
                xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xmlHttp.onreadystatechange = function() {
                    if (xmlHttp.readyState != 4) {
                        return;
                    }
                    if (xmlHttp.status != 200 && xmlHttp.status != 304) {
                        callback('');
                        return;
                    }
                    callback(JSON.parse(xmlHttp.response));
                };
                xmlHttp.send(null);
            };
            function get(el) {
                if (typeof el == 'string') return document.getElementById(el);
                return el;
            }
            this.getJSON = function(url, data, callback) {
              getJSON(url, data, callback);
            }

            //////////////////////////////////////////////////////////////////////////
            ///////// initialize the map - this calls map.js
            //////////////////////////////////////////////////////////////////////////
            var map = new MissionIntelApp.Map(this);

            //////////////////////////////////////////////////////////////////////////
            ///////// call the socket and store new received data then update the map.
            //////////////////////////////////////////////////////////////////////////
            (new MissionIntelApp.Session(map.update)).initialize();
            this.map = map;

        };

        MissionIntelApp.Map = function (app) {
        	var dground = false; // do we want detailed ground to show yes or no.

        	//////////////////////////////////////////////////////////////////////////
        	///////// function to handle markers being clicked by a user
        	//////////////////////////////////////////////////////////////////////////
            function onMarkerClick(browserEvent) {
                var coordinate = browserEvent.coordinate;
                var pixel = map.getPixelFromCoordinate(coordinate);
                map.forEachFeatureAtPixel(pixel, function (feature) {

                    if (feature.getProperties().SIDC) {
        				localStorage.removeItem('currentUnit');
        		        localStorage.setItem('currentUnit', JSON.stringify(feature.values_));
                    }

                });
            }


        	//////////////////////////////////////////////////////////////////////////
        	///////// UPDATE MARKERS
        	//////////////////////////////////////////////////////////////////////////
        	function updateMap(source) {
        		let ratio = window.devicePixelRatio || 2;
        		let collection = [];

        		let  time = new Date();

        		// Convert source into an OL3 source
        		let s = new ol.source.Vector({
        			features: (new ol.format.GeoJSON()).readFeatures(source, {
        				featureProjection: 'EPSG:3857'
        			})
        		});

        		// Generate Markers
        		s.forEachFeature(function (f) {

        			// store our altitude etc.
        			var fixedalt = f.getProperties().alt;
        			var utype = f.getProperties().missionname;
        			var ptype = f.getProperties().displayname;

        			// if we are air we have altitude and we want to do some quick maths and formating.
        			if ((f.getProperties().category == 'Air') || (f.getProperties().category == 'Heli')) {
        				fixedalt = fixedalt * 3.28084;
        				fixedalt = fixedalt.toFixed(0);
        				fixedalt = fixedalt.toString() + "ft";
        			}
        			else if (f.getProperties().category == 'Ship') {
        					if (dground == false)
        					{
        						ptype = "";
        					}
        					fixedalt = "";
        			}

        			//////////////////////////////////////////////////////////////////////////
        			///////// CREATE MARKER DATA
        			//////////////////////////////////////////////////////////////////////////
        			var mySymbol = new ms.Symbol(
        					f.getProperties().SIDC, {
        						uniqueDesignation: f.getProperties().name
        					},
        					{infoColor: "white" },
        					{ platformType: ptype },
        					{ altitudeDepth : fixedalt },
        					{ type : utype },
        					{ additionalInformation : "" }
        			);

        			//////////////////////////////////////////////////////////////////////////
        			///////// CREATE MARKERS
        			//////////////////////////////////////////////////////////////////////////
        			var myCanvas = mySymbol.asCanvas();

        			//////////////////////////////////////////////////////////////////////////
        			///////// SET MARKERS STYLE
        			//////////////////////////////////////////////////////////////////////////
        			f.setStyle(new ol.style.Style({
        				image: new ol.style.Icon(({
        					scale: 0.2 / ratio,
        					anchor: [mySymbol.getAnchor().x, mySymbol.getAnchor().y],
        					anchorXUnits: 'pixels',
        					anchorYUnits: 'pixels',
        					imgSize: [Math.floor(mySymbol.getSize().width), Math.floor(mySymbol.getSize().height)],
        					img: (myCanvas)

        				}))
        			}));

        			//////////////////////////////////////////////////////////////////////////
        			///////// PUSH NEW MARKER TO MARKER COLLECTION
        			//////////////////////////////////////////////////////////////////////////
        			collection.push(f);
        		});


        		//////////////////////////////////////////////////////////////////////////
        		///////// REMOVE EXISITNG/OLD MARKERS.LAYERS
        		//////////////////////////////////////////////////////////////////////////
        		_group.getLayers().clear(true);

        		//////////////////////////////////////////////////////////////////////////
        		///////// LOOP OVER ALL NEW MARKERS
        		//////////////////////////////////////////////////////////////////////////
        		[].forEach.call(collection, function (obj) {
        			let exists;
        			// If there is a layer with an ID equal to SOURCE then this layer exists and we will add the marker to this layer
        			_group.getLayers().forEach(function (layer) {
        				if (layer.getProperties().id == obj.getProperties().source) {
        					exists = true;
        					layer.getSource().addFeature(obj);
        				}
        			});

        			// .. if there is not - then we have to make it, add a source and then add the marker
        			if (!exists) {
        				let grp = _group.getLayers();
        				grp.push(new ol.layer.Vector({
        					id: obj.getProperties().source,
        					source: new ol.source.Vector()
        				}));
        				_group.setLayers(grp);
        			}
        		});
        	}
            this.update = function (source) {

                var e = JSON.parse(localStorage.getItem('dcsData'));

                updateMap(e);
            };

        	//////////////////////////////////////////////////////////////////////////
        	///////// MARKER SOURCES
        	//////////////////////////////////////////////////////////////////////////
            var dcsSource = new ol.source.Vector({
                features: (new ol.format.GeoJSON()).readFeatures(dcsStream, {
                    featureProjection: 'EPSG:3857'
                })
            });
            var drawSource = new ol.source.Vector({
                wrapX: false
            });

        	//////////////////////////////////////////////////////////////////////////
        	///////// LAYER GROUP SETUP
        	//////////////////////////////////////////////////////////////////////////
            let _group = new ol.layer.Group;

        	//////////////////////////////////////////////////////////////////////////
        	///////// MAP LAYERS
        	//////////////////////////////////////////////////////////////////////////
            var streamLayer = new ol.layer.Vector({
                id: 'stream',
                source: new ol.source.Vector(),
                fallThrough: true
            });
            var mapLayer = new ol.layer.Tile({
                id: 'map',
                preload: 4,
                fallThrough: true,

        	source: new ol.source.TileJSON({
                    url: 'http://api.tiles.mapbox.com/v4/mapbox.dark.json?access_token=pk.eyJ1Ijoic2d0dGVkIiwiYSI6ImNpdWZ1bmZ0OTAwMWoyem5uaGl4a2s0ejIifQ.aqtpdqUySGs1lrPbtITp0g',
                    crossOrigin: 'anonymous'
                })
            });

        	//////////////////////////////////////////////////////////////////////////
        	///////// imports the drag and zoom feature from open layers
        	///////// SO USERS CAN USE LEFT SHIFT AND DRAG PLUS ROTATE THE MAP
        	//////////////////////////////////////////////////////////////////////////
            var importdragandzoom = new ol.interaction.DragRotateAndZoom();

        	//////////////////////////////////////////////////////////////////////////
        	///////// MAP SETUP
        	//////////////////////////////////////////////////////////////////////////
        	var center = ol.proj.transform([42.000, 43.000], 'EPSG:4326', 'EPSG:3857'); // set map co-ords
        	var view = new ol.View({
        		center: center,
        		zoom: 7.9
        	}); // set map zoom and center
            var map = new ol.Map(
        		{
        	        target: 'div-map',
        	        fallThrough:true,
        	        interactions: ol.interaction.defaults().extend([importdragandzoom]),
        	        layers: [new ol.layer.Tile({source: new ol.source.OSM()})],
        	        view: view,
            	}
        	);
            map.addLayer(mapLayer);
            map.addLayer(_group);
            map.addLayer(streamLayer);

        	//////////////////////////////////////////////////////////////////////////
        	///////// INTERACT WHEN A USER CLICKS A MARKER
        	//////////////////////////////////////////////////////////////////////////
            map.on('singleclick', onMarkerClick);

        }

        MissionIntelApp.Session = function(dataCallback) {
            var dcsdata;

            //////////////////////////////////////////////////////////////////////////
            ///////// CREATE THER SOCKET CONNECTION
            //////////////////////////////////////////////////////////////////////////
            this.initialize = function() {

                var wsURL = "";
                if (window.location.protocol === "https:")
                    wsURL += "wss://";
                else
                    wsURL += "ws://";
                wsURL += window.location.hostname;
                wsURL += ":" + 8081;
                wsURL += window.location.pathname;

                console.log("Connecting to \"" + wsURL + "\"");
                var websocket = new WebSocket(wsURL);
                websocket.onmessage = this.onmessage;

                window.addEventListener("beforeunload", function() {
                  websocket.onclose = function() {};
                  websocket.close();
                });
            };

            //////////////////////////////////////////////////////////////////////////
            ///////// HANDLE NEW DATA SENT THROUGH THE SOCKET
            //////////////////////////////////////////////////////////////////////////
            this.onmessage = function(evt) {
                localStorage.clear(); // clear old unit data from localStorage
                localStorage.setItem('dcsData', JSON.stringify(evt.data)); // add new unit data to localStorage
                dataCallback(); // send
            };

        };

        MissionIntelApp.Marker = function (codingScheme, affiliation, battleDimension, status, functionID, modifier1, modifier2, source, x, y) {
            this.codingScheme = codingScheme;   // Allways 'S'
            this.affiliation = affiliation;
            this.battleDim = battleDimension;
            this.status = status;
            this.functionID = functionID;
            this.modifier1 = modifier1;         // HQ, Task Force etc..
            this.modifier2 = modifier2;         // Squad, Platoon etc..
            this.source = source;               // Intel source
            this.x = x;
            this.y = y;
        };

        MissionIntelApp.Marker.getHash = function (marker) {
            return "" + marker.codingScheme + marker.affiliation + marker.battleDim + marker.status + marker.functionID + marker.modifier1 + marker.modifier2;
        };

        MissionIntelApp.Marker.CodingScheme = {
            Warfighting: "S"
        };

        MissionIntelApp.Marker.Affiliation = {
            Pending: "P",
            Unknown: "U",
            AssumedFriendly: "A",
            Friend: "F",
            Neutral: "N",
            Suspect: "S",
            Hostile: "H",
            Joker: "J",
            Faker: "K",
            None: "O"
        };

        MissionIntelApp.Marker.BattleDim = {
            Space: "P",
            Air: "A",
            Ground: "G",
            SeaSurface: "S",
            SeaSubSurface: "U",
            SOF: "F"
        };

        MissionIntelApp.Marker.Status = {
            None: "-",
            Present: "P",
            Planned: "A",
            Assumed: "A"
        };

        MissionIntelApp.Marker.Modifier1 = {
            None: "-",
            HQ: "A",
            TaskForceHQ: "B",
            FeintDummyHQ: "C",
            FeintDummyTaskForceHQ: "D",
            TaskForce: "E",
            FeintDummy: "F",
            FeintDummyTaskForce: "G",
            Installation: "H",
            Mobility: "M",
            TowedArray: "N"
        };

        MissionIntelApp.Marker.Modifier2 = {
            None: "-",
            Team: "A",
            Crew: "A",
            Squad: "B",
            Section: "C",
            Platoon: "D",
            Detachment: "D",
            Company: "E",
            Battery: "E",
            Troop: "E",
            Battalion: "F",
            Squadron: "F",
            Regiment: "G",
            Group: "G",
            Brigade: "H",
            Division: "I",
            CorpsO: "J",
            MEF: "J",
            Army: "K",
            ArmyGroup: "L",
            Front: "L",
            Region: "M",
            Command: "N"
        };

        MissionIntelApp.Marker.Source = {
            AWACS: "AWACS",
            JSTAR: "JSTAR",
            HUMINT: "HUMINT",
            GEOINT: "GEOINT",
            SIGINT: "SIGINT"
                    // MASINT?
        };

        var dcsStream = {
            "name": "Layer",
            "type": "FeatureCollection",
            "crs": {
                "type": "name",
                "properties": {
                    "name": "EPSG:4326"
                }
            },
            "features": [{
                "type": "Feature",
                "id" : "1",
                "geometry": {
                    "type": "Point",
                    "coordinates": [42.000, 42.000]
                },
                "properties": {
                    "SIDC": "SFAPMFF-----***",
                    "name": "3.Brig",
                    "fullname": "3.Brig/INSS/",
                    "command": "INSS",
                    "source": "awacs"
                }
            }, {
                "type": "Feature",
                "id" : "2",
                "geometry": {
                    "type": "Point",
                    "coordinates": [42, 42]
                },
                "properties": {
                    "SIDC": "SHAPMFF-----***",
                    "name": "EAGLE",
                    "fullname": "",
                    "command": "",
                    "direction" : 1270,
                    "altitudeDepth": "FL200",
                    "source": "awacs"
                }
            }]
        };


      }
    ]);
}());
