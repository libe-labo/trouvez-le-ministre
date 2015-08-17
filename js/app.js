'use strict';

function relayout() {
    window.setTimeout(function() {
        var $container = $('.left'),
            $elements = $container.find('.pages'),
            containerWidth = $container.innerWidth(),
            elementWidth = parseInt($elements.outerWidth()),
            elementHeight = parseInt($elements.outerHeight()),
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
            height : ($elements.length / nOnLine) * elementHeight
        });
        $container.find('.pages').each(function(i) {
            var basePos = pos[i].y % 2 ? 0
                                       : (pos[i].y === 0 ? (containerWidth / 2) - (elementWidth / 2)
                                                         : (elementWidth / 2) + (gutterWidth / 2));
            $(this).css({
                position : 'absolute',
                top : pos[i].y * $(this).outerHeight(),
                left : basePos + (pos[i].x * (elementWidth + gutterWidth))
            });
        });

    }, 100);
}

var app = angular.module('app', ['lheader', 'ui.bootstrap', 'imagesLoaded', 'ngTouch', 'ngDialog']);

app.controller('Ctrl', ['$scope', '$http', '$timeout', '$location', 'ngDialog',
function($scope, $http, $timeout, $location, ngDialog) {

    var handleYesNo = function(d) {
        if (d == null || d.length <= 0) { return false; }
        return (d.trim().toLowerCase() === 'oui');
    };

    var filterNames = {
        'Chauve' : { label : 'est-il chauve ?', value : 'chauve', order : 1 },
        'Barbu' : { label : 'est-il barbu ?', value : 'barbu', order : 2 },
        'Femme' : { label : 'est-il une femme ?', value : 'femme', order : 3 },
        'Candidat.e aux primaires PS' : {
            label : 'a-t-il été candidat à la primaire du PS en 2011 ?',
            value : 'primaires',
            order : 4
        },
        'Enarque' : { label : 'est-il énarque ?', value : 'enarque', order : 6 },
        'Secrétaire d\'Etat' : {
            label : 'est-il secrétaire d\'État ?',
            value : 'secretairedetat',
            order : 7
        },
        'Déjà là en mai 2012 (Ayrault 1)' : {
            label : 'était-il déjà au gouvernement en mai 2012 ?',
            value : 'mai2012',
            order : 8
        },
        'A soutenu Aubry à la primaire' : {
            label : 'soutenait-il Martine Aubry à la primaire de 2011 ?',
            value : 'aubry',
            order : 9
        },
        'Déjà élu.e' : { label : 'a-t-il déjà été élu ?', value : 'elu', order : 10 },
        'Elu.e d\'Outre-Mer' : {
            label : 'a-t-il été élu d\'Outre-Mer ?',
            value : 'outremer',
            order : 11
        },
        'Né.e avant la Ve République' : {
            label : 'est-il né avant la Ve République ?',
            value : 'verepublique',
            order : 12
        },
        'Né.e sous Giscard' : { label : 'est-il né sous Giscard ?', value : 'giscard', order : 13 },
        'Né.e à l\'étranger' : {
            label : 'est-il né à l\'étranger ?',
            value : 'neetrange',
            order : 14
        },
        'Nouvel entrant' : {
            label : 'est-il un nouvel entrant ?',
            value : 'nouvelentrant',
            order : 15
        },
        'Porte des lunettes' : {
            label : 'porte-t-il des lunettes ?',
            value : 'lunettes',
            order : 16
        },
        'Adhérent.e au PS' : {
            label : 'est-il adhérent au PS ?',
            value : 'adherentps',
            order : 17
        },
        'Elu.e du sud' : {
            label : 'a-t-il été élu du Sud de la France ?',
            value : 'sud',
            order : 18
        },
        'Portrait de der de Libé' : {
            label : 'a-t-il eu droit à un portrait de der dans Libé ?',
            value : 'portrait',
            order : 19
        }
    };
    var usedFilters = {};

    var texts = [];

    var allData = [];

    $scope.$on('PROGRESS', function() {
        relayout();
    });

    /*
    ** Get data
    */
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

    $http.get('data/texts.tsv').then(function(response) {
        texts = d3.tsv.parse(response.data);
    });

    /*
    ** Utils
    */
    $scope.tweet = function(win) {
        var twitter = $scope.toFind.twitter != null && $scope.toFind.twitter.length > 0 ? '@' +
                      $scope.toFind.twitter : $scope.toFind.prenom + ' ' + $scope.toFind.nom;
        var wintext = 'J\'ai identifié ' + twitter + ' en ' + _.size(usedFilters) +
                      ' coup' + (_.size(usedFilters) > 1 ? 's' : '') +
                      ' au «Qui est-ce ?» gouvernemental. Et vous ?';
        var losetext = 'J\'ai perdu au «Qui est-ce ?» gouvernemental. Faites-vous mieux ?';
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
            no : usedFilters[d] === false
        };
    };

    $scope.applyFilter = function(filter) {
        if (_.has(usedFilters, filter)) { return; }

        var is = $scope.toFind[filter];

        _.each($scope.data, function(d) {
            d.filtered = d.filtered || d[filter] !== is;
        });

        usedFilters[filter] = is;

        var k = _.findKey(filterNames, function(d) { return d.value === filter; });
        var k2 = _.findKey($scope.filters, function(d) { return d.value === filter; });
        $scope.filters[k2].label = texts[+is][k];
        $scope.filters[k2].order = is ? -2 : -1;

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
                pronoun : d.femme ? 'Elle' : 'Il'
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
                    pronoun : d.femme ? 'Elle' : 'Il'
                },
                scope : $scope,
                showClose : false,
                closeByEscape : false,
                closeByDocument : false
            });
        }
    };

    $scope.nextFilter = function() {
        var pos = Math.max(parseInt($('.menu ul').css('left')) - 200, -1600);
        $('.menu ul').animate({
            'left' : pos + 'px'
        }, 150);
    };

    $scope.prevFilter = function() {
        var pos = Math.min(parseInt($('.menu ul').css('left')) + 200, 0);
        $('.menu ul').animate({
            'left' : pos.toString() + 'px'
        }, 150);
    };

    $scope.reload = function() {
        window.location.reload();
    };

    $scope.getPicture = function(d) {
        var name =  (d.twitter != null && d.twitter.length > 0) ? d.twitter
                                                                : (d.prenom + d.nom).toLowerCase();
        return (d.filtered ? 'nb/' : '') + name;
    };
}]);

$(window).resize(function() {
    relayout();
});
