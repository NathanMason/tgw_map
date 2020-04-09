MissionIntelApp.Session = function(dataCallback) {
    var dcsdata;

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

    this.onmessage = function(evt) {
        localStorage.clear();
        localStorage.setItem('dcsData', JSON.stringify(evt.data));
        dataCallback(JSON.parse(evt.data));
    };

};
