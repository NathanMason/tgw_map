/* global MissionIntelApp */
MissionIntelApp.SiteNavigation = function(app) {

    var selected = null,
        x_pos = 0,
        y_pos = 0,
        x_elem = 0,
        y_elem = 0;


    /* TODO IMPLEMENTERE get() I KODEN UNDER! */
    function get(el) {
        if (typeof el == 'string') return document.getElementById(el);
        return el;
    }

    this.get = function(el) {
        get(el);
        return el;
    };

    this.makeDraggable = function(id) {
        makeDraggable(id);
        return id;
    };

    this.moveDraggable = function(e) {
        moveDraggable(e);
    };

    this.destroyDraggable = function() {
        destroyDraggable();
    };

    this.getJSON = function(url, data, callback) {
      getJSON(url, data, callback);
    }

    function makeDraggable(elem) {
        selected = elem;
        x_elem = x_pos - selected.offsetLeft;
        y_elem = y_pos - selected.offsetTop;
    }

    function moveDraggable(e) {
        x_pos = document.all ? window.event.clientX : e.pageX;
        y_pos = document.all ? window.event.clientY : e.pageY;
        if (selected !== null) {
            selected.style.left = (x_pos - x_elem) + 'px';
            selected.style.top = (y_pos - y_elem) + 'px';
        }
    }

    get('map-filters-header').onmousedown = function() {
        makeDraggable(get('map-filters-container'));
        //return false;
    };

    /* GUI Element: Clock */
    setInterval(function() {
        var clockElement = document.querySelectorAll('#clock');
        var DateString = new Date().toGMTString();

        for (i = 0; i < clockElement.length; i++) {
            clockElement[i].textContent = DateString;
        }

    }, 1000);
};
