MissionIntelApp.Map = function (app) {

    /* GLOBAL FUNCTIONS */
    this.toggleLayer = function (layerName) {
        toggleLayer(layerName);
    };

    /* LOCAL FUNCTIONS */
    function toggleLayer(layerName) {
        layerName.setVisible((!layerName.getVisible()));
    }

    function onMarkerClick(browserEvent) {
        var coordinate = browserEvent.coordinate;
        var pixel = map.getPixelFromCoordinate(coordinate);
        map.forEachFeatureAtPixel(pixel, function (feature) {
            if (feature.getProperties().SIDC) {
                // Display some option window
                // Reverse parse the SIDC and put that data in the window. This window then needs to have a button with a Save Event on it
                console.log(feature.getProperties().SIDC);
            }
        });
    }

    function get(el) {
        if (typeof el == 'string')
            return document.getElementById(el);
        return el;
    }

    function findProjectedRadius(center, radius) {
        var edgeCoord = [center[0] + radius, center[1]];
        var wgs84Sphere = new ol.Sphere(6378137);
        var groundRadius = wgs84Sphere.haversineDistance(ol.proj.transform(center, 'EPSG:3857', 'EPSG:4326'), ol.proj.transform(edgeCoord, 'EPSG:3857', 'EPSG:4326'));

        return groundRadius;
    }

    function addMarkersToLayerBySource(source, lookup, layer) {
       if (!layer.getSource()) {
           layer.setSource(new ol.source.Vector());
       }

       source.forEachFeature(function (f) {
           if (f.getProperties().source == lookup) {
               var mySymbol = new ms.Symbol(
                       f.getProperties().SIDC, {
                            size: 22,
                            uniqueDesignation: f.getProperties().name
                        }
               );

               var myCanvas = mySymbol.asCanvas();

               f.setStyle(new ol.style.Style({
                   image: new ol.style.Icon(({
                       scale: 1,
                       anchor: [mySymbol.markerAnchor.x, mySymbol.markerAnchor.y],
                       anchorXUnits: 'pixels',
                       anchorYUnits: 'pixels',
                       imgSize: [Math.floor(mySymbol.width), Math.floor(mySymbol.height)],
                       img: (myCanvas)
                   }))
               }));
               layer.getSource().addFeature(f);
           }
       });
   }

    function updateMap(source) {
        let ratio = window.devicePixelRatio || 1;
        let collection = [];

        // Console.log time of last marker update
        let  time = new Date();
        console.log('-> MARKER UPDATE: ' +
                ("0" + time.getHours()).slice(-2) + ":" +
                ("0" + time.getMinutes()).slice(-2) + ":" +
                ("0" + time.getSeconds()).slice(-2));

        // Convert source into an OL3 source
        let s = new ol.source.Vector({
            features: (new ol.format.GeoJSON()).readFeatures(source, {
                featureProjection: 'EPSG:3857'
            })
        });

        // Generate Markers - CHANGE dcsSOURCE FOR THE ABOVE s SOURCE TO USE DATA FROM MAIN.JS!!
        s.forEachFeature(function (f) {

            // Draw Marker
            var mySymbol = new ms.Symbol(
                    f.getProperties().SIDC, {
                size: (f.getProperties().size * ratio),
                //altitudeDepth: 'FL' + f.getProperties().alt,
                //direction: f.getProperties().hdg,
                //speed: Math.round(f.getProperties().speed) + ' kt',
                type: f.getProperties().type,
                //uniqueDesignation: 'TR' + f.getProperties().name,
                monoColor: f.getProperties().monoColor
                        // infoColor: 'white'
            }
            );

            var myCanvas = mySymbol.asCanvas();

            f.setStyle(new ol.style.Style({
                image: new ol.style.Icon(({
                    scale: 1 / ratio,
                    anchor: [mySymbol.getAnchor().x, mySymbol.getAnchor().y],
                    anchorXUnits: 'pixels',
                    anchorYUnits: 'pixels',
                    imgSize: [Math.floor(mySymbol.getSize().width), Math.floor(mySymbol.getSize().height)],
                    //snapToPixel: false, // ENABLE THIS IF ICONS START GETTING JITTERY
                    img: (myCanvas)

                }))
            }));

            // Add it to some Array to be put to a layer later
            collection.push(f);

        });

        // Remove all old features from the layer group
        _group.getLayers().clear(true);

        // Add updated features to layer TODO: THE BELOW FUNCTION DOES NOT WORK... THE COLLECTION IS JUST PASSED TO THE streamLayer (SEE BELOW)
        [].forEach.call(collection, function (obj) {
            let exists;

            // If there is a layer with an ID equal to SOURCE then this layer exists and we will add the feature to this layer
            _group.getLayers().forEach(function (layer) {
                if (layer.getProperties().id == obj.getProperties().source) {
                    exists = true;
                    layer.getSource().addFeature(obj);
                }
            });

            // .. if there is not - then we have to make it, add a source and then add the feature here
            if (!exists) {
                console.log(obj);
                let grp = _group.getLayers();
                grp.push(new ol.layer.Vector({
                    id: obj.getProperties().source,

                    source: new ol.source.Vector({
                        features: obj
                    })


                }));
                _group.setLayers(grp);
            }
        });

        // UNCOMMENT BELOW IN ORDER TO SEND COLLECTION TO A PRE-MADE LAYER
        streamLayer.getSource().clear(true);
        streamLayer.getSource().addFeatures(collection);
        console.log(collection);
    }

    this.update = function (source) {
        updateMap(source);
    };

    function drawInteraction(source, brush) {
        if (brush !== 'None') {
            draw = new ol.interaction.Draw({
                source: source,
                type: /** @type {ol.geom.GeometryType} */ (brush),
            });

            map.addInteraction(draw);
        }
    }

    function getObjectID(object) {

        // Dersom den globale variabelen "_objectIDs" ikkje fins
        if (window._objectIDs === undefined)
            // Lag den og sett den til 0
            window._objectIDs = 0;

        // Dersom dette objektet ikkje har en attribut "_objectID"
        if (object._objectID === undefined) {
            // Legg til attributen, sett den til å være antallet objectIDs (globale variabelen)
            object._objectID = window._objectIDs;
            // Inkrementèr antall objectIDs
            window._objectIDs++;
        }

        // Returner IDen til objektet (som vi kanskje lagde over)
        return object._objectID;
    }

    function toDMS(prefix, coord) {

        coord = coord.toFixed(5);
        let len = coord.length;

        let d = coord.slice(-len, len - 6);
        let m = (Number((coord - d)) * 60);
        let s = (m.toFixed(3)).toString().slice(-3, m.length);
        let dms = prefix + d + '°' + ("0" + m.toFixed(0)).slice(-2) + '.' + s;

        return dms;
    }

    /* GLOBALS */
    var draw;


    /* SOURCES */
    var dcsSource = new ol.source.Vector({
        features: (new ol.format.GeoJSON()).readFeatures(dcsStream, {
            featureProjection: 'EPSG:3857'
        })
    });


    /* LAYERS SETUP */
    var mapLayer = new ol.layer.Tile({
        id: 'map',
        preload: 4,
        source: new ol.source.TileJSON({
            url: 'http://api.tiles.mapbox.com/v4/mapbox.dark.json?access_token=pk.eyJ1Ijoic2d0dGVkIiwiYSI6ImNpdWZ1bmZ0OTAwMWoyem5uaGl4a2s0ejIifQ.aqtpdqUySGs1lrPbtITp0g',
            crossOrigin: 'anonymous'
        })
    });

    /* create open layer map */
    var center = ol.proj.transform([42.000, 42.000], 'EPSG:4326', 'EPSG:3857');

    var view = new ol.View({
        center: center,
        zoom: 8
    });

    var map = new ol.Map({
        target: 'div-map',
        view: view,
    });

    map.addLayer(mapLayer);


};
