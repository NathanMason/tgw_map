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
