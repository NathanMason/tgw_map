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
                console.log(feature.values);
                //create a model window with datra of clicked unit
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

    function updateMap(source) {
        let ratio = window.devicePixelRatio || 1;
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

            // Draw Marker
            var mySymbol = new ms.Symbol(
                    f.getProperties().SIDC, {
                // size: iconSize[(f.getProperties().SIDC).charAt(11)],
                uniqueDesignation: f.getProperties().name
            }
            );

            var myCanvas = mySymbol.asCanvas();

            f.setStyle(new ol.style.Style({
                image: new ol.style.Icon(({
                    scale: 0.2 / ratio,
                    anchor: [mySymbol.getAnchor().x, mySymbol.getAnchor().y],
                    anchorXUnits: 'pixels',
                    anchorYUnits: 'pixels',
                    imgSize: [Math.floor(mySymbol.getSize().width), Math.floor(mySymbol.getSize().height)],
                    //snapToPixel: false, // ENABLE THIS IF ICONS START GETTING JITTERY
                    img: (myCanvas)

                }))
            }));
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
                let grp = _group.getLayers();
                grp.push(new ol.layer.Vector({
                    id: obj.getProperties().source,
                    source: new ol.source.Vector()
                }));
                _group.setLayers(grp);
            }
        });

        // UNCOMMENT BELOW IN ORDER TO SEND COLLECTION TO A PRE-MADE LAYER
        streamLayer.getSource().clear(true);
        streamLayer.getSource().addFeatures(collection);

    }

    this.update = function (source) {

        var e = JSON.parse(localStorage.getItem('dcsData'));

        updateMap(e);
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

    var drawSource = new ol.source.Vector({
        wrapX: false
    });

    var vectorSource = new ol.source.Vector({
        loader: function () {
            var url = 'src/vectors/vectors.geojson';
            var source = this;

            app.getJSON(url, '', function (r) {

                if (Object.keys(r).length > 0) {
                    var f = (new ol.format.GeoJSON()).readFeatures(r, {
                        featureProjection: 'EPSG:3857'
                    });
                    source.addFeatures(f);
                }

                // Replace all features of type Point with a Circle feature in stead.
                source.forEachFeature(function (f) {

                    if (f.getGeometry().getType() == 'Point') {

                        var circle = new ol.geom.Circle(f.getGeometry().getCoordinates(), 1);
                        circle.setRadius(findProjectedRadius(circle.getCenter(), f.getProperties().radius));

                        var circleFeature = new ol.Feature(circle);

                        circleFeature.setProperties({
                            name: f.getProperties().name,
                            type: f.getProperties().type
                        });

                        var style = new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: f.getProperties().color,
                                width: 1
                            }),
                            fill: new ol.style.Fill({
                                color: f.getProperties().colorBg
                            })
                        });

                        circleFeature.setStyle(style);

                        source.addFeature(circleFeature);
                        source.removeFeature(f);
                    }

                    if (f.getGeometry().getType() == 'Polygon') {
                        var style = new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: f.getProperties().color,
                                width: 1
                            }),
                            fill: new ol.style.Fill({
                                color: f.getProperties().colorBg
                            })
                        });

                        f.setStyle(style);
                    }
                });
            });
        }
    });

    /* STYLES */
    var defaultStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(255,0,0,0.5)',
            width: 1
        })
    });

    var selectStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'rgba(95,95,95,1)',
            width: 2
        }),
        fill: new ol.style.Fill({
            color: 'rgba(95,95,95,0.1)'
        }),
    });

    /* LAYER GROUPS */
    let _group = new ol.layer.Group;

    /* LAYERS SETUP */
    var vectorLayer = new ol.layer.Vector({// "Note that any property set in the options is set as a ol.Object property on the layer object; for example, setting title: 'My Title' in the options means that title is observable, and has get/set accessors."
        id: 'vectors',
        source: vectorSource,
        fallThrough: true
    });

    var plannedLayer = new ol.layer.Vector({
        id: 'planned',
        fallThrough: true
    });

    var streamLayer = new ol.layer.Vector({
        id: 'stream',
        source: new ol.source.Vector(),
        fallThrough: true
    });

    var drawLayer = new ol.layer.Vector({
        id: 'draw',
        source: drawSource,
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

    function addMarkersToLayerBySource(source, lookup, layer) {
           if (!layer.getSource()) {
               layer.setSource(new ol.source.Vector());
           }
           let ratio = window.devicePixelRatio || 1;
           source.forEachFeature(function (f) {
               if (f.getProperties().source == lookup) {
                   var mySymbol = new ms.Symbol(
                           f.getProperties().SIDC, {
                       // size: iconSize[(f.getProperties().SIDC).charAt(11)],
                       uniqueDesignation: f.getProperties().name
                   }
                   );

                   var myCanvas = mySymbol.asCanvas();
                   let ratio = window.devicePixelRatio || 1;

                   f.setStyle(new ol.style.Style({
                       image: new ol.style.Icon(({
                           scale: 0.2 / ratio,
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

    addMarkersToLayerBySource(dcsSource, 'planned', plannedLayer);
    addMarkersToLayerBySource(dcsSource, 'awacs', streamLayer);
    addMarkersToLayerBySource(dcsSource, 'awacs', new ol.layer.Vector({
        id: 'planned'
    }));


    var mousePositionControl = new ol.control.MousePosition({
        coordinateFormat: function (coord) {
            //return ol.coordinate.toStringHDMS(coord, 3);

            let n = toDMS('N', coord[1]);
            let e = toDMS(' E', coord[0]);
            let mousePos = [n, e];

            return mousePos; // return coord to get XY coords
            //return coord;
        },
        projection: 'EPSG:4326'
    });

    var scaleLineControl = new ol.control.ScaleLine();

    /* VIEW SETUP */
    var center = ol.proj.transform([42.000, 43.000], 'EPSG:4326', 'EPSG:3857');

    var view = new ol.View({
        center: center,
        zoom: 7.9
    });

    var scaleLineControl = new ol.control.ScaleLine();

    var importdragandzoom = new ol.interaction.DragRotateAndZoom();

    /* MAP SETUP */
    var map = new ol.Map({
        target: 'div-map',
        fallThrough:true,
        interactions: ol.interaction.defaults().extend([importdragandzoom]),
        layers: [new ol.layer.Tile({source: new ol.source.OSM()})],
        controls: ol.control.defaults({
            attributionOptions: ({
                collapsible: false
            })
        }).extend([mousePositionControl, scaleLineControl]),
        view: view,
    });

    map.addLayer(mapLayer);
    map.addLayer(drawLayer);
    map.addLayer(_group);
    map.addLayer(streamLayer);
    map.addLayer(plannedLayer);

    /* EVENTS */
    map.on('dblclick', onMarkerClick);

    // --> map filters
    document.getElementById("map-filters-awacs").onclick = function (element) {
        document.getElementById("map-filters-awacs").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-awacs").classList.toggle("disabled-map-menu-object");
        toggleLayer(streamLayer);
    };

    document.getElementById("map-filters-planned").onclick = function (element) {
        document.getElementById("map-filters-planned").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-planned").classList.toggle("disabled-map-menu-object");
        toggleLayer(plannedLayer);
    };

    var geo = (new ol.format.GeoJSON).writeFeatures(vectorLayer.getSource().getFeatures());

    dcsSource.on('change', function(e) {
      console.log('change!');
    });

}
