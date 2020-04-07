(function() {

  angular.module('contractAnalyzer')

    .controller('main_Controller', ['$scope', '$rootScope', '$q', '$http',
      function($scope, $rootScope, $q, $http) {

          $scope.analyzingFiles = false;
          $scope.processing = false;
          $scope.complete = false;
          $scope.noFilesSelected = false;
          $scope.isComplete = false;
          $scope.fileErrors = false;
          $rootScope.date = new Date();
          $rootScope.version = 'v1.5.0'
          $scope.failed = false;
          var filePathPlaceholder;
          var promises = [];
          var fileUrls = [];
          var failedFiles = [];
          var api;
          var url = $location.absUrl();
          var postData = {
                  filePaths: [],
                  email: $scope.myEmail
              };
          var config = {withCredentials: true};
          var uppy = Uppy.Core({
                autoProceed: true,
                restrictions: {
                  maxFileSize: 5000000000,
                  maxNumberOfFiles: 1000,
                  minNumberOfFiles: '1',
                  allowedFileTypes: ['application/pdf']
                }
              });
          var q;

          if (url.indexOf('localhost') > -1) {
            api = 'http://localhost:8000';
            $scope.app_url = 'http://localhost:3020'
          } else if (url.indexOf('dev.agreementanalyzer.com') > -1) {
            api = 'https://api-dev.contracthub.com';
            $scope.app_url = 'https://dev.agreementanalyzer.com'
          } else if (url.indexOf('agreementanalyzer.com') > -1) {
            api = 'https://api.contracthub.com';
            $scope.app_url = 'https://agreementanalyzer.com'
          }

          uppy.use(Uppy.Dashboard, {
            inline: true,
            trigger: '.UppyModalOpenerBtn',
            target: '#drag-drop-area-1',
            locale: {
              strings: {
                complete: 'Files are ready for analyzing',
                uploading: 'Preparing files',
              }
            },
            showProgressDetails: true,
            replaceTargetContent: true,
            browserBackButtonClose: true
          });
          uppy.use(Uppy.XHRUpload, {
            target: Uppy.Dashboard,
            endpoint: api + "/analyzer/xhrupload"
          });
          uppy.on('upload-success', (result, res) => {
            postData.filePaths.push(res.body.filePath);
            $scope.noFilesSelected = false;
          });

          $scope.analyze = function(email){
            if (postData.filePaths.length == 0 ) {
              $scope.noFilesSelected = true;
            } else {
                $scope.processing = true;
                $scope.noFilesSelected = false;
                postData.email = email.$viewValue;
                $scope.analyzingFiles = true;
                $http
                  .post(api + "/analyzer/generatecsv", postData, config)
                  .then(function(response, err) {
                          $scope.complete = true;
                  })
                  .catch(function(response) {
                    console.log(response);

                      $scope.errorMessage = response.data.message
                      $scope.complete = false;
                      $scope.processing = false;
                      $scope.failed = true;
                  });
            }

          }

          $scope.refresh = function(){
              $location.path('/');
              $window.location.reload();
          }
      }
    ]);
}());
