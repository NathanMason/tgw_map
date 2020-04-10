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
                console.log(feature.values_);
                console.log(feature.getProperties().SIDC);
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


            var set = false;

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
    var drawSource = new ol.source.Vector({
        wrapX: false
    });

    //////////////////////////////////////////////////////////////////////////
    ///////// LAYER GROUP SETUP
    //////////////////////////////////////////////////////////////////////////
    let _group = new ol.layer.Group;
    let aircraftLayer = new ol.layer.Group;

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
    map.addLayer(aircraftLayer);
    map.addLayer(streamLayer);

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

    document.getElementById("map-filters-awacs").onclick = function (element) {
        document.getElementById("map-filters-awacs").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-awacs").classList.toggle("disabled-map-menu-object");
        toggleLayer(_group);
    };

    document.getElementById("map-filters-ground").onclick = function (element) {
        document.getElementById("map-filters-ground").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-ground").classList.toggle("disabled-map-menu-object");
        toggleLayer(plannedLayer);
    };

    document.getElementById("map-filters-air").onclick = function (element) {
        document.getElementById("map-filters-air").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-air").classList.toggle("disabled-map-menu-object");
        toggleLayer(plannedLayer);
    };

    document.getElementById("map-filters-human").onclick = function (element) {
        document.getElementById("map-filters-human").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-human").classList.toggle("disabled-map-menu-object");
        toggleLayer(plannedLayer);
    };

    document.getElementById("map-filters-naval").onclick = function (element) {
        document.getElementById("map-filters-naval").classList.toggle("enabled-map-menu-object");
        document.getElementById("map-filters-naval").classList.toggle("disabled-map-menu-object");
        toggleLayer(plannedLayer);
    };


}
