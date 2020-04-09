var MissionIntelApp = function() {
const DEBUG = false;
    /* VARIABLES */
    var selected = null,
        x_pos = 0,
        y_pos = 0,
        x_elem = 0,
        y_elem = 0;

    /* APP-WIDE FUNCTIONS */
    this.get = function(el) {
        get(el);
        return el;
    };

    this.getJSON = function(url, data, callback) {
      getJSON(url, data, callback);
    }

    function get(el) {
        if (typeof el == 'string') return document.getElementById(el);
        return el;
    }

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

    /* INITIALIZE MAP */
    var map = new MissionIntelApp.Map(this);
    if (DEBUG) {
        (new MissionIntelApp.Session(console.log)).initialize();
    }
    (new MissionIntelApp.Session(map.update)).initialize();
    this.map = map;

};
