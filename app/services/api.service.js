(function() {
  angular.module("contractAnalyzer").service("apiFactory", [
    "$http", '$rootScope', '$location', 'ngNotify', function($http, $rootScope, $location, ngNotify) {

      var url = $location.absUrl();

      if (url.indexOf('localhost') > -1) {
        $rootScope.baseURL = 'http://localhost:8000';
        $rootScope.baseAPI_URL = 'https://api-dev.contracthub.com/';
      }

      // if (url.indexOf('app-dev.contracthub.com') > -1) {
      //   $rootScope.baseURL = 'https://app-dev.contracthub.com';
      //   $rootScope.baseAPI_URL = 'https://api-dev.contracthub.com/';
      // }
      //
      // if (url.indexOf('app.contracthub.com') > -1) {
      //   $rootScope.baseURL = 'https://app.contracthub.com';
      //   $rootScope.baseAPI_URL = 'https://api.contracthub.com/';
      // }
      //
      // if (url.indexOf('staging.contracthub.com') > -1) {
      //   $rootScope.baseURL = 'https://staging.contracthub.com';
      //   $rootScope.baseAPI_URL = 'https://api-staging.contracthub.com/';
      // }

      var apiData = {};
      var config = {withCredentials: true};
      var config2 = {withCredentials: true, responseType: 'arraybuffer' };
      var configIgnoreInterceptor = {withCredentials: true, ignoreAuthModule: true}
      var http = 'http://';
      var https = 'https://';
      var apiURL = $rootScope.baseAPI_URL;



//////////////////////////////////////////////////////////////////////////
///////// downloads
//////////////////////////////////////////////////////////////////////////
      apiData.uploadDocs = function(e, cb){
        $http
          .post(apiURL + "drafts/download", e, config2)
          .then(function(response, err) {

                cb(response);

          })

      }

      return apiData;
    }
  ]);
})();
