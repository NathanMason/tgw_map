MissionIntelApp.Map = function (app) {
    var dground = false; // do we want detailed ground to show yes or no.
    var hide_GroundUnits = false;
    var hide_HeliUnits = false;
    var hide_AirUnits = false;
    var hide_ShipUnits = false;
    var hide_OtherUnits = false;


    //////////////////////////////////////////////////////////////////////////
    ///////// function to handle markers being clicked by a user
    //////////////////////////////////////////////////////////////////////////
    var popup = new ol.Overlay({
      element: document.getElementById('popup')
    });

    function degrees_to_radians(degrees)
    {
      var pi = Math.PI;
      return degrees * (pi/180);
    }


    function onMarkerClick(browserEvent) {
        var title;
        var element = popup.getElement();
        var coordinate = browserEvent.coordinate;
        var pixel = map.getPixelFromCoordinate(coordinate);
        map.forEachFeatureAtPixel(pixel, function (feature) {
            console.log(feature);
            if (feature.getProperties().SIDC) {
                var pilot;
                var cheading = Math.floor(feature.getProperties().heading);
                var cspeed = Math.round(feature.getProperties().speed);
                if (feature.getProperties().name == '') {
                    pilot = 'AI';
                } else {
                    pilot = feature.getProperties().name;
                }
                console.log(element);
                // $(element).popover('destroy');
                $(element).popover('dispose')
                popup.setPosition(coordinate);
                $(element).popover({
                  placement: 'top',
                  html: true,
                  trigger: 'focus',
                  sanitize: false,
                  title: feature.getProperties().displayname + '<button type="button" id="close" class="close" onclick="destroyInfoBox()">&times;</button>',
                  content:"<img style='width: 100%' src='../assets/img/" + feature.getProperties().unitimage + "'><table class='table'><tbody><tr><td>Pilot: </td><td>" + pilot + "</td></tr><tr><td>Callsign: </td><td>" + feature.getProperties().missionname + "</td></tr><tr><td>Pilot: </td><td>" + pilot + "</td></tr><tr><td>Unit Type: </td><td>" + feature.getProperties().displayname + "</td></tr><tr><td>Speed: </td><td>" + cspeed + "</td></tr><tr><td>heading: </td><td>" + cheading + "</td></tr></tbody></table>"
                });
                $(element).popover('show');

                localStorage.removeItem('currentUnit');
                localStorage.setItem('currentUnit', JSON.stringify(feature.values_));
                console.log(feature.values_);
                console.log(feature.getProperties().SIDC);
            } else {
                console.log('no');
                $(element).popover('dispose')
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
            else if (f.getProperties().category == 'Ship')
            {
                    fixedalt = "";
            }
			      else
			      {
                    fixedalt = "";
			      }

            //////////////////////////////////////////////////////////////////////////
            ///////// CREATE MARKER DATA
            //////////////////////////////////////////////////////////////////////////
            var ratio = window.devicePixelRatio;
            var sidc = f.getProperties().SIDC;
            var convertSize = 65; // just leave it at 65
            //console.log(convertSize);
            // we actually don't need e now, but we'll keep it just incase
            // sets the icon basically
            var getIconIMG = function(e, i, ic){
                if (i == 'rgb(255, 88, 88)')
                {
                  return '../../assets/img/red-' + ic;
                }
                else {
                  return '../../assets/img/blue-' + ic;
                }

            }

             console.log(f.getProperties());

            var mySymbol = new ms.Symbol(
                  'SUG--------***', // just feed it this we don't care anymore
                  {uniqueDesignation: f.getProperties().name},
                  {size: convertSize * ratio},
                  {infoColor: "white" },
                  {heading: f.getProperties().source.heading},
                  {infoFields: false},
                  {platformType: ptype },
                  {altitudeDepth : fixedalt },
                  {type : utype },
                  {scale: convertSize * ratio}

            );

            //////////////////////////////////////////////////////////////////////////
            ///////// CREATE MARKERS
            //////////////////////////////////////////////////////////////////////////
            var myCanvas = mySymbol.asCanvas();

            //////////////////////////////////////////////////////////////////////////
            ///////// SET MARKERS STYLE
            //////////////////////////////////////////////////////////////////////////
            console.log(f.getProperties().source);
                // convert heading to string
                var headingFromDCS = f.getProperties().heading;
                var setHeadingAsInt = Math.floor(headingFromDCS); // we just need to floor it to an int

                // this isn't rrequired
                //var string = headingFromDCS.toString();
                // console.log(string);
                console.log(f.getProperties().heading);
                //
                //var convertHeading = string.substring(0, 3);
                // console.log(convertHeading);
                //
                //var setHeadingAsInt = Number(convertHeading);
                // console.log(setHeadingAsInt);



            f.setStyle(new ol.style.Style({
                image: new ol.style.Icon(({
                    scale: 0.4,
                    anchor: [mySymbol.getAnchor().x, mySymbol.getAnchor().y],
                    anchorXUnits: 'pixels',
                    rotateWithView: true,
                    anchorYUnits: 'pixels',
                    imgSize: [Math.floor(mySymbol.getSize().width), Math.floor(mySymbol.getSize().height)],
                    // img: (myCanvas),
                    src: getIconIMG(f.getProperties().source, f.getProperties().monoColor,f.getProperties().icon)

                }))
            }));
            var style = f.getStyle(),
                image = style.getImage(),
                rotation = image.getRotation();
                image.setRotation(degrees_to_radians(setHeadingAsInt)); // this isn't correct.
                
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

            var set = false;
            let exists;

            _group.getLayers().forEach(function (layer) {

                if (layer.getProperties().id == obj.getProperties().source) {
                    exists = true;
                    layer.getSource().addFeature(obj);
                }

            });

            if (!exists) {

                let grp = _group.getLayers();
                grp.push(new ol.layer.Vector({
                        id: obj.getProperties().source,
                        source: new ol.source.Vector()
                    }));
                _group.setLayers(grp);


            }

        });


        _group.getLayers().forEach(function (layer) {
                console.log(layer);

                if (layer.getProperties().id == 'Ground') {
                    if (hide_GroundUnits == false) {
                        layer.values_.visible = true
                    } else {
                        layer.values_.visible = false
                    };
                }

                if (layer.getProperties().id == 'Air') {
                    if (hide_AirUnits == false) {
                        layer.values_.visible = true
                    } else {
                        layer.values_.visible = false
                    };
                }

                if (layer.getProperties().id == 'Ship') {
                    if (hide_ShipUnits == false) {
                        layer.values_.visible = true
                    } else {
                        layer.values_.visible = false
                    };
                }

                if (layer.getProperties().id == 'Heli') {
                    if (hide_HeliUnits == false) {
                        layer.values_.visible = true
                    } else {
                        layer.values_.visible = false
                    };
                };

                if (layer.getProperties().id == 'Other') {
                    if (hide_OtherUnits == false) {
                        layer.values_.visible = true
                    } else {
                        layer.values_.visible = false
                    };
                };


        })


    }
    this.update = function (source) {

        var e = JSON.parse(localStorage.getItem('dcsData'));
        updateMap(e);

    };

    //////////////////////////////////////////////////////////////////////////
    ///////// MARKER SOURCES
    //////////////////////////////////////////////////////////////////////////
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
    map.addOverlay(popup);
    //////////////////////////////////////////////////////////////////////////
    ///////// INTERACT WHEN A USER CLICKS A MARKER
    //////////////////////////////////////////////////////////////////////////
    map.on('singleclick', onMarkerClick);


    //////////////////////////////////////////////////////////////////////////
    ///////// MAP FILTERS
    //////////////////////////////////////////////////////////////////////////
    function toggleLayer(layerName) {
        layerName.setVisible((!layerName.getVisible()));
    }

    document.getElementById("map-filters-all").onclick = function (element) {
        document.getElementById("map-filters-all").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-all").classList.toggle("disabled-map-menu-object");
        toggleLayer(_group);
    };

    document.getElementById("map-filters-ground").onclick = function (element) {
        document.getElementById("map-filters-ground").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-ground").classList.toggle("disabled-map-menu-object");

        _group.getLayers().forEach(function (layer) {

            if (layer.getProperties().id == 'Ground') {
                if (hide_GroundUnits == false) {
                    hide_GroundUnits = true
                } else {
                    hide_GroundUnits = false
                }
                toggleLayer(layer);
            }
        });

    };

    document.getElementById("map-filters-air").onclick = function (element) {
        document.getElementById("map-filters-air").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-air").classList.toggle("disabled-map-menu-object");

        _group.getLayers().forEach(function (layer) {

            if (layer.getProperties().id == 'Air') {
                if (hide_AirUnits == false) {
                    hide_AirUnits = true
                } else {
                    hide_AirUnits = false
                }
                toggleLayer(layer);
            }
        });
    };

    document.getElementById("map-filters-heli").onclick = function (element) {
        document.getElementById("map-filters-heli").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-heli").classList.toggle("disabled-map-menu-object");
        _group.getLayers().forEach(function (layer) {

            if (layer.getProperties().id == 'Heli') {
                if (hide_HeliUnits == false) {
                    hide_HeliUnits = true
                } else {
                    hide_HeliUnits = false
                }
                toggleLayer(layer);
            }
        });
    };

    document.getElementById("map-filters-naval").onclick = function (element) {
        document.getElementById("map-filters-naval").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-naval").classList.toggle("disabled-map-menu-object");
        _group.getLayers().forEach(function (layer) {

            if (layer.getProperties().id == 'Ship') {
                if (hide_ShipUnits == false) {
                    hide_ShipUnits = true
                } else {
                    hide_ShipUnits = false
                }
                toggleLayer(layer);
            }
        });
    };


}
