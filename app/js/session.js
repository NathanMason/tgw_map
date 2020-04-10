
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
                console.log(evt);
                console.log('on message');
                localStorage.clear(); // clear old unit data from localStorage
                localStorage.setItem('dcsData', JSON.stringify(evt.data)); // add new unit data to localStorage
                dataCallback(); // send
            };

        };
