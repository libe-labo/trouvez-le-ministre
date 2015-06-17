angular.module('lheader', []).directive('lheader', [function() {
    return {
        restrict : 'AE',
        scope : { },
        templateUrl : 'directives/lheader/lheader.html',
        replace : true
    }
}]);