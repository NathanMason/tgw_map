/* global MissionIntelApp */
MissionIntelApp.SiteNavigation = function(app) {

    /* TODO IMPLEMENTERE get() I KODEN UNDER! */
    function get(el) {
        if (typeof el == 'string') return document.getElementById(el);
        return el;
    }

    /* GUI Element: Clock */
    setInterval(function() {
        var clockElement = document.querySelectorAll('#clock');
        var DateString = new Date().toGMTString();

        for (i = 0; i < clockElement.length; i++) {
            clockElement[i].textContent = DateString;
        }

    }, 1000);
};
