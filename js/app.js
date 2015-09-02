'use strict';

function relayout() {
    window.setTimeout(function() {
        var $container = $('.left'),
            $elements = $container.find('.pages'),
            containerWidth = $container.innerWidth(),
            elementWidth = parseInt($elements.outerWidth()),
            elementHeight = elementWidth + 35,
            gutterWidth = 0,
            nOnLine = 0,
            nLines = 1,
            pos = [];

        for (var width = 0; width < containerWidth; width += elementWidth) {
            ++nOnLine;
        }
        nOnLine -= 2;
        gutterWidth = (containerWidth - (elementWidth * nOnLine)) / (nOnLine - 1);
        pos.push({ x : 0 , y : 0 });
        for (var i = 1; i < $elements.length;) {
            ++nLines;
            var lineLength = nLines % 2 ? nOnLine - 1 : nOnLine;
            for (var j = 0; j < lineLength; ++j) {
                pos.push({ x : j , y : nLines - 1 });
                ++i;
            }
        }

        $container.css({
            position : 'relative',
            height : nLines * elementHeight
        });
        $container.find('.pages').each(function(i) {
            var basePos = pos[i].y % 2 ? 0
                                       : (pos[i].y === 0 ? (containerWidth / 2) - (elementWidth / 2)
                                                         : (elementWidth / 2) + (gutterWidth / 2));
            $(this).css({
                position : 'absolute',
                top : pos[i].y * elementHeight,
                left : basePos + (pos[i].x * (elementWidth + gutterWidth))
            });

            $(this).popover({
                placement : 'auto',
                trigger : 'hover',
                container : 'body'
            });
        });

    }, 100);
}

var app = angular.module('app', ['lheader', 'ui.bootstrap', 'ngTouch', 'ngDialog']);

app.controller('Ctrl', ['$scope', '$http', '$timeout', '$location', 'ngDialog',
function($scope, $http, $timeout, $location, ngDialog) {

    var handleYesNo = function(d) {
        if (d == null || d.length <= 0) { return false; }
        return (d.trim().toLowerCase() === 'oui');
    };

    var filterNames = {};
    var usedFilters = {};

    var allData = [];

    /*
    ** Get data
    */
    $http.get('data/criterias.tsv').then(function(response) {
        filterNames = _.indexBy(d3.tsv.parse(response.data, function(d) {
            return {
                label : d.base,
                1 : d.oui,
                0 : d.non,
                value : d.phrase
            };
        }), 'value');

        $http.get('data/data.tsv').then(function(response) {
            allData = d3.tsv.parse(response.data, function(d) {
                var ret = {
                    prenom : d['Prénom'],
                    nom : d.Nom,
                    poste : d['Ministère'],
                    order : +d['Ordre protocolaire'],
                    twitter : d.Twitter,
                    filtered : false
                };

                _.each(filterNames, function(v, k) {
                    ret[v.value] = handleYesNo(d[k]);
                });

                return ret;
            });

            $scope.data = allData;

            $scope.toFind = _.sample(allData);

            $scope.filters = _.values(filterNames);

            relayout();
        });
    });

    /*
    ** Utils
    */
    $scope.getScore = function() {
        return String(_.size(usedFilters));
    };

    $scope.tweet = function(win) {
        var twitter = $scope.toFind.twitter != null && $scope.toFind.twitter.length > 0 ? '@' +
                      $scope.toFind.twitter : $scope.toFind.prenom + ' ' + $scope.toFind.nom;
        var wintext = 'Nouveau gouvernement : j\'ai identifié ' + twitter +
                      ' en ' + $scope.getScore() + ' coup' + (_.size(usedFilters) > 1 ? 's' : '') +
                      '. Ferez-vous mieux ? #ministresmiconnus';
        var losetext = 'J\'ai perdu, je n\'ai pas réussi à trouver le ministre...' +
                       ' Ferez-vous mieux ? #ministresmiconnus';
        var text = encodeURIComponent(win ? wintext : losetext),
            url  = encodeURIComponent($location.absUrl()),
            link = 'https://twitter.com/intent/tweet?original_referer=' + '' + '&text=' + text +
                   ' ' + url;

        window.open(link, '', 'width=575,height=400,menubar=no,toolbar=no');
    };

    $scope.cardClass = function(d) {
        return {
            fadedout : d.filtered
        };
    };

    $scope.filterClass = function(d) {
        return {
            yes : usedFilters[d] === true,
            no : usedFilters[d] === false,
            used : Object.keys(usedFilters).indexOf(d) >= 0
        };
    };

    $scope.applyFilter = function(filter) {
        if (_.has(usedFilters, filter)) { return; }

        var is = $scope.toFind[filter];

        _.each($scope.data, function(d) {
            d.filtered = d.filtered || d[filter] !== is;
        });

        usedFilters[filter] = is;

        var k = _.findKey($scope.filters, function(d) { return d.value === filter; });
        $scope.filters[k].label = _.find(filterNames, { value : filter })[+is];
        $scope.filters[k].order = is ? -2 : -1;

        var className = is ? 'bigyes' : 'bigno';
        $('.response.' + className).animate({
            opacity : 1
        }, {
            duration : 10,
            queue : true,
            complete : function() {
                $timeout(function() {
                    $('.response.' + className).animate({
                        opacity : 0
                    }, {
                        queue : true,
                        duration : 300
                    });
                }, 600);
            }
        });

        if (_.countBy($scope.data, 'filtered')[false] === 1) {
            win($scope.toFind);
        }
    };

    var win = function(d) {
        ngDialog.open({
            template : 'win.html',
            className : 'ngdialog-theme-plain',
            data : {
                name : d.prenom + ' ' + d.nom,
                n : _.size(usedFilters),
                post : d.poste,
                pronoun : d.Femme ? 'Elle' : 'Il',
                picture : $scope.getPicture(d),
                e : d.Femme ? 'e' : ''
            },
            scope : $scope,
            showClose : false,
            closeByEscape : false,
            closeByDocument : false
        });
    };

    $scope.clickOnCard = function(d) {
        if (d === $scope.toFind) {
            win(d);
        } else {
            ngDialog.open({
                template : 'lose.html',
                className : 'ngdialog-theme-plain',
                data : {
                    name : d.prenom + ' ' + d.nom,
                    post : d.poste,
                    pronoun : d.Femme ? 'Elle' : 'Il',
                    picture : $scope.getPicture(d),
                    e : d.Femme ? 'e' : ''
                },
                scope : $scope,
                showClose : false,
                closeByEscape : false,
                closeByDocument : false
            });
        }
    };

    $scope.reload = function() {
        window.location.reload();
    };

    $scope.getPicture = function(d) {
        var name =  (d.twitter != null && d.twitter.length > 0) ? d.twitter.trim()
                                                                : (d.prenom + d.nom).toLowerCase();
        return (d.filtered ? 'nb/' : '') + name;
    };

    $scope.filter = function() {
        if ($scope.filterSelect.length > 0) {
            $scope.applyFilter($scope.filterSelect);
            $timeout(function() {
                $(window).trigger('updateSelect', [$scope.filterSelect, $scope]);
            }, 100);
        }
    };

    $scope.getSelectClass = function(filter) {
        return usedFilters[filter] != null ? (usedFilters[filter] ? 'yes' : 'no' ) : '';
    };

    $scope.getSelectIcon = function(filter) {
        return 'glyphicon-' + (usedFilters[filter] != null ? (usedFilters[filter] ? 'ok' : 'remove')
                                                           : 'record');
    };
}]);

$(window).resize(function() {
    relayout();
});

$(window).on('updateSelect', function(ev, x, $scope) {
    $('select').find('option[value="' + x + '"]').remove();
    var newOption = $('<option>').text(_.find($scope.filters, { value : x }).label)
                                 .attr('value', x).attr('disabled', 'disabled')
                                 .attr('data-icon', $scope.getSelectIcon(x))
                                 .addClass($scope.getSelectClass(x));

    $('select').prepend(newOption);
    $('select').selectpicker('val', x);

    $('select').selectpicker('refresh', true);

    $('.pages.fadedout').remove();
    relayout();
});
