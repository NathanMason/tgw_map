(function() {
  angular.module('redIberia', ['ngRoute'])

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Routes
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    .config(function($routeProvider, $locationProvider, $httpProvider) {

      $locationProvider.html5Mode(true);
      $locationProvider.hashPrefix('');
      $httpProvider.defaults.headers.delete = { "Content-Type": "application/json;charset=utf-8" };
      $httpProvider.defaults.withCredentials = true;
      $routeProvider

      .when('/', {
        templateUrl: "/components/main/main.html",
        controller: "main_Controller",
        pageTrack: '/home'
      })

      .otherwise({
        redirectTo: '/'
      });

    })
}());
