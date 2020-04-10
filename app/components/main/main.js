(function() {

  angular.module('redIberia')

    .controller('main_Controller', ['$scope', '$rootScope', function($scope, $rootScope) {

        $rootScope.showData = false;

        $scope.viewUnitData = function(){
            var e = JSON.parse(localStorage.getItem('currentUnit'));

        }

      }
    ]);
}());
