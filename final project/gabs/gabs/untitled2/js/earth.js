// Created by Bjorn Sandvik - thematicmapping.org

//data that is used
var geoData = new Object();
var masterContainer = document.getElementById('visualization');
var tripsData;
//	contains above but organized as a mapped list via ['countryname'] = countryobject
//	each country object has data like center of country in 3d space, lat lon, country name, and country code
var countryData = new Object();

var clock = new THREE.Clock();

var countryLookup;

var selectableYears = [];
var selectableCountries = [];
var tripObjects = [];
var tripMovementObjects = [];
var filteredTripsData = [];
//	contains latlon data for each country
var latlonData;
// Earth params
var radius = 0.5,
    segments = 32;


//nationalities being displayed
var showDutch = true;
var showFrench = true;
var showBritish = true;
var showSpanish = true;


var harborObjects = [];

// three.js variables
var renderer, camera, scene;

//needed for text drawing
var spriteHarbor = null;
var canvas1, context1, texture1;


//used for click event
var mouse = new THREE.Vector3();
var raycaster = new THREE.Raycaster();
var projector = new THREE.Projector();

//load the data and scene
window.onload = loadData;

// load data from file and create the arrays objects that are needed
function loadData() {


    if (!Detector.webgl) {

        Detector.addGetWebGLMessage();
    }
    else {


        loadCountryCodes(function () {
            loadWorldPins(function () {
                d3.csv("data/UniqueTrips5k.csv", function (d) {
                    // the atom objects
                    tripsData = d;

                    init();
                });
            });
        });

    }
}

var width, height;
function init() {


    var webglEl = document.getElementById('webgl');

    if (!Detector.webgl) {
        Detector.addGetWebGLMessage(webglEl);
        return;
    }

    width = window.innerWidth;
    height = window.innerHeight;


    //console.log(countryData);
    // main parameters for the scene
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.z = 1.5;

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor(new THREE.Color(0x000000, 1.0));
    renderer.setSize(width, height);


    //add light to the scene
    scene.add(new THREE.AmbientLight(0xbfbfbf));

    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 3, 5);
    scene.add(light);

    var sphere = createSphere(radius, segments);
    //sphere.rotation.y = rotation;
    scene.add(sphere);

    drawHarbors(scene, latlonData);

    for (var i in tripsData) {
        var set = tripsData[i];
        // if( set.v < 1000000 )
        // 	continue;

        var exporterName = set.Departure;
        var importerName = set.Destination;

        //	let's track a list of actual countries listed in this data set
        //	this is actually really slow... consider re-doing this with a map
        if (selectableCountries.indexOf(exporterName) < 0)
            selectableCountries.push(exporterName);

        if (selectableCountries.indexOf(importerName) < 0)
            selectableCountries.push(importerName);
    }

    //console.log(selectableCountries);
    loadGeoData(latlonData);

    buildDataVizGeometries(tripsData, scene);
    //  filteredTripsData = tripsData;
    //var example =  [{
    //    Departure: "NEW YORK",
    //    Nationality: "BRITISH",
    //    Destination: "PLYMOUTH",
    //    Year:"1776"
    //}];
    //buildDataVizGeometries(example, scene);


    //masterContainer.addEventListener( 'mousewheel', onMouseWheel, false );

    //renderer
    var controls = new THREE.TrackballControls(camera);

    document.body.appendChild(renderer.domElement);

    render();

    function render() {
        controls.update();
        delta = clock.getDelta();
        THREE.AnimationHandler.update(delta);
        pathControls.update(delta);
        //	sphere.rotation.y += 0.0000;
        //	clouds.rotation.y += 0.0005;
        requestAnimationFrame(render);
        renderer.render(scene, camera);
    }

    //function to draw the map
    function createSphere(radius, segments) {
        return new THREE.Mesh(
            new THREE.SphereGeometry(radius, segments, segments),
            new THREE.MeshLambertMaterial({
                map: THREE.ImageUtils.loadTexture('images/map_outline.png'),
                specular: new THREE.Color('grey')
            })
        );
    }


//	console.log(geoData);

    document.addEventListener('mousedown', onDocumentMouseDown, false);
}

//draw the locations from GeoData
function drawHarbors(scene, geoData) {
    for (var i in geoData.countries) {

        var harbor = geoData.countries[i];

        if ((harbor.lat != "NA") && (harbor.lon != "NA")) {
            var lon = parseFloat(harbor.lon);
            var lat = parseFloat(harbor.lat);

            var phi = Math.PI / 2 - lat * Math.PI / 180 - Math.PI * 0.0035;
            var theta = 2 * Math.PI - lon * Math.PI / 180 + Math.PI * 0.055;

            x = Math.sin(phi) * Math.cos(theta) * radius;
            y = Math.cos(phi) * radius;
            z = Math.sin(phi) * Math.sin(theta) * radius;

            // create a sphere
            var sphereGeometry = new THREE.SphereGeometry(0.0025, 5, 5);
            var sphereMaterial = new THREE.MeshLambertMaterial({color: 'pink'});
            var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.set(x, y, z);
            scene.add(sphere);

            sphere.id = i;
            harborObjects.push(sphere);
        }

    }


}


//draw connection

/*
 The curve looks like this:

 midStartAnchor---- mid ----- midEndAnchor
 /											  \
 /											   \
 /												\
 start/anchor 										 end/anchor

 splineCurveA							splineCurveB
 */

function drawConnection(harbor1, harbor2, scene, height, color) {

    var vec3_origin = new THREE.Vector3(0, 0, 0);

    //coordinate of first harbor
    var lon1 = parseFloat(harbor1.lon);
    var lat1 = parseFloat(harbor1.lat);

    var phi1 = Math.PI / 2 - lat1 * Math.PI / 180 - Math.PI * 0.0035;
    var theta1 = 2 * Math.PI - lon1 * Math.PI / 180 + Math.PI * 0.055;

    x1 = Math.sin(phi1) * Math.cos(theta1) * radius;
    y1 = Math.cos(phi1) * radius;
    z1 = Math.sin(phi1) * Math.sin(theta1) * radius;
    var point1 = new THREE.Vector3(x1, y1, z1);


    //coordinates of second harbor
    var lon2 = parseFloat(harbor2.lon);
    var lat2 = parseFloat(harbor2.lat);

    var phi2 = Math.PI / 2 - lat2 * Math.PI / 180 - Math.PI * 0.0035;
    var theta2 = 2 * Math.PI - lon2 * Math.PI / 180 + Math.PI * 0.055;

    x2 = Math.sin(phi2) * Math.cos(theta2) * radius;
    y2 = Math.cos(phi2) * radius;
    z2 = Math.sin(phi2) * Math.sin(theta2) * radius;
    var point2 = new THREE.Vector3(x2, y2, z2);

    //calculate curve coordinates
    var startAnchor = new THREE.Vector3(x1, y1, z1);
    var endAnchor = new THREE.Vector3(x2, y2, z2);
    var start = startAnchor;
    var end = endAnchor;


    var distanceBetweenCountryCenter = point1.clone().sub(point2).length();

    //	midpoint for the curve
    var mid = start.clone().lerp(end, 0.5);
    var midLength = mid.length()
    mid.normalize();
    mid.multiplyScalar(midLength + distanceBetweenCountryCenter * height * 0.1);

    //console.log(mid);

    //	the normal from start to end
    var normal = (new THREE.Vector3(start)).sub( end);

    normal.normalize();

    // 2 side midpoints of the curve
    var distanceHalf = distanceBetweenCountryCenter * 0.5;
    var midStartAnchor = mid.clone().add(normal.clone().multiplyScalar(distanceHalf));
    var midEndAnchor = mid.clone().add(normal.clone().multiplyScalar(-distanceHalf));


    var curveCubic = new THREE.CubicBezierCurve3(start, midStartAnchor, midEndAnchor, end);
    var curveQuad = new THREE.QuadraticBezierCurve3(start, mid, end);

    var cp = new THREE.CurvePath();
    cp.add(curveCubic);

    //console.log(curveCubic);

    var curvedLineMaterial = new THREE.LineBasicMaterial({color: color, linewidth: 1});
    // console.log(linePoints);
    var curvedLine = new THREE.Line(cp.createPointsGeometry(20), curvedLineMaterial);
    var points = curvedLine.geometry.vertices;
    scene.add(curvedLine);


    curvedLine.id =
        tripObjects.push(curvedLine);


    if(tripObjects.length<100) {
        //add plane
        var geometry = new THREE.SphereGeometry(0.003, 6, 4);
        var materialP = new THREE.MeshBasicMaterial({
            color: color
        });
        var plane = new THREE.Mesh(geometry, materialP);
        scene.add(plane);


        var random = Math.random() * 10 + 7;
        controlsP = new function () {
            this.numberOfPoints = 21;
            this.segments = 64;
            this.radius = 3;
            this.radiusSegments = 5;
            this.closed = false;
            this.points = points;
        }

        pathControls = new THREE.PathControls(plane);
        // configure the controller
        pathControls.duration = random;
        pathControls.useConstantSpeed = true;
        pathControls.lookSpeed = 0.1;
        pathControls.lookVertical = true;
        pathControls.lookHorizontal = true;

        // add the path
        for (var j in controlsP.points) {
            var point = controlsP.points[j];
            pathControls.waypoints.push([point.x, point.y, point.z]);
        }

        // when done configuring init the control
        pathControls.init();
        // add the animationParent to the scene and start the animation
        scene.add(pathControls.animationParent);
        pathControls.animation.play(true, 0);

        tripMovementObjects.push(pathControls.animationParent);
    }

}

function loadCountryCodes(callback) {
    cxhr = new XMLHttpRequest();
    cxhr.open('GET', "data/port_iso.json", true);
    cxhr.onreadystatechange = function () {
        if (cxhr.readyState === 4 && cxhr.status === 200) {
            countryLookup = JSON.parse(cxhr.responseText);
            //console.log("loaded country codes");
            callback();
        }
    };
    cxhr.send(null);
}

function loadWorldPins(callback) {
    // We're going to ask a file for the JSON data.
    xhr = new XMLHttpRequest();

    // Where do we get the data?
    xhr.open('GET', "data/port_lat_lon.json", true);

    // What do we do when we have it?
    xhr.onreadystatechange = function () {
        // If we've received the data
        if (xhr.readyState === 4 && xhr.status === 200) {
            // Parse the JSON
            latlonData = JSON.parse(xhr.responseText);
            if (callback)
                callback();
        }
    };

    // Begin request
    xhr.send(null);
}

function loadGeoData(latlonData) {
    //	-----------------------------------------------------------------------------
    //	Load the world geo data json, per country

    var sphereRad = 1;
    var rad = 100;

    //	iterate through each set of country pins
    for (var i in latlonData.countries) {
        var country = latlonData.countries[i];
        if (country.lat != undefined && country.lat != "NA" && country.lon != undefined && country.lon != "NA")
        //	can we even find the country in the list?
        // if( countryLookup[country.n.toUpperCase()] === undefined ){
        // 	console.log('could not find country that has country code: ' + country.n)
        // 	continue;
        // }

        //	save out country name and code info
            country.countryCode = i;
        country.countryName = countryLookup[i];

        //	take the lat lon from the data and convert this to 3d globe space
        var lon = country.lon - 90;
        var lat = country.lat;

        var phi = Math.PI / 2 - lat * Math.PI / 180 - Math.PI * 0.0035;
        var theta = 2 * Math.PI - lon * Math.PI / 180 + Math.PI * 0.055;

        var center = new THREE.Vector3();
        center.x = Math.sin(phi) * Math.cos(theta) * rad;
        center.y = Math.cos(phi) * rad;
        center.z = Math.sin(phi) * Math.sin(theta) * rad;

        //	save and catalogue
        country.center = center;
        countryData[country.countryName] = country;
    }

    // console.log(countryData);
}

//	convenience function to get the country object by name
function getCountry(name) {
    return countryData[name]
}
//
//function handleMWheel( delta ) {
//    camera.scale.z += delta * 0.1;
//    camera.scale.z = constrain( camera.scale.z, 0.7, 5.0 );
//}
//
//function onMouseWheel( event ){
//    var delta = 0;
//
//    if (event.wheelDelta) { /* IE/Opera. */
//        delta = event.wheelDelta/120;
//    }
//    //	firefox
//    else if( event.detail ){
//        delta = -event.detail/3;
//    }
//
//    if (delta)
//        handleMWheel(delta);
//
//    event.returnValue = false;
//}
//
//
//function constrain(v, min, max){
//    if( v < min )
//        v = min;
//    else
//    if( v > max )
//        v = max;
//    return v;
//}

//updateViz:function() {

//}


// add mouseListener
function onDocumentMouseDown(event) {

    console.log("click event");

    event.preventDefault();

    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = -( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

    var raycaster = projector.pickingRay(mouse.clone(), camera);
    var intersects = raycaster.intersectObjects(harborObjects);


    if (intersects.length > 0) {
        var clickedHarbor = intersects[0];

        console.log(clickedHarbor.object.id);
        console.log("clicked on:" + countryLookup[clickedHarbor.object.id]);


        /////// draw text on canvas /////////


        scene.remove(spriteHarbor);


        var tooltipHarbor = countryLookup[clickedHarbor.object.id];


        var sprite1 = makeTextSprite(tooltipHarbor,
            {
                fontsize: 24,
                borderColor: {r: 255, g: 0, b: 0, a: 1.0},
                backgroundColor: {r: 255, g: 100, b: 100, a: 0.8}
            });

        sprite1.position.set(clickedHarbor.object.position.x + 0.001, clickedHarbor.object.position.y + 0.001, clickedHarbor.object.position.z + 0.001);
        scene.add(sprite1);

        console.log(sprite1);

        spriteHarbor = sprite1;
    }


// add mouseListener over on trip lines
    function onDocumentMouseHover(event) {

        console.log("hover event");

        event.preventDefault();

        mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
        mouse.y = -( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

        var raycaster = projector.pickingRay(mouse.clone(), camera);
        var intersects = raycaster.intersectObjects(tripObjects);


        if (intersects.length > 0) {
            var clickedTrip = intersects[0];

            console.log(clickedHarbor.object.id);
            console.log("clicked on:" + countryLookup[clickedHarbor.object.id]);


            /////// draw text on canvas /////////


            scene.remove(spriteHarbor);


            var tooltipHarbor = countryLookup[clickedHarbor.object.id];


            var sprite1 = makeTextSprite(tooltipHarbor,
                {
                    fontsize: 24,
                    borderColor: {r: 255, g: 0, b: 0, a: 1.0},
                    backgroundColor: {r: 255, g: 100, b: 100, a: 0.8}
                });

            sprite1.position.set(clickedHarbor.object.position.x + 0.001, clickedHarbor.object.position.y + 0.001, clickedHarbor.object.position.z + 0.001);
            scene.add(sprite1);

            console.log(sprite1);

            spriteHarbor = sprite1;


        }

    }

}

//drawing labels	
function makeTextSprite(message, parameters) {
    if (parameters === undefined) parameters = {};

    var fontface = parameters.hasOwnProperty("fontface") ?
        parameters["fontface"] : "Arial";

    var fontsize = parameters.hasOwnProperty("fontsize") ?
        parameters["fontsize"] : 18;

    var borderThickness = parameters.hasOwnProperty("borderThickness") ?
        parameters["borderThickness"] : 4;

    var borderColor = parameters.hasOwnProperty("borderColor") ?
        parameters["borderColor"] : {r: 0, g: 0, b: 0, a: 1.0};

    var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
        parameters["backgroundColor"] : {r: 255, g: 255, b: 255, a: 1.0};

    var spriteAlignment = THREE.SpriteAlignment.topLeft;

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    context.font = "Bold " + fontsize + "px " + fontface;

    // get size data (height depends only on font size)
    var metrics = context.measureText(message);
    var textWidth = metrics.width;

    // background color
    context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
        + backgroundColor.b + "," + backgroundColor.a + ")";
    // border color
    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
        + borderColor.b + "," + borderColor.a + ")";

    context.lineWidth = borderThickness;
    roundRect(context, borderThickness / 2, borderThickness / 2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
    // 1.4 is extra height factor for text below baseline: g,j,p,q.

    // text color
    context.fillStyle = "rgba(0, 0, 0, 1.0)";

    context.fillText(message, borderThickness, fontsize + borderThickness);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas)
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial(
        {map: texture, useScreenCoordinates: false, alignment: spriteAlignment});
    var sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.05, 0.05, 0.05);
    return sprite;
}


// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}


//checkbox to select the trips being shown
function clickCheckBox(value, checked) {

    //clear all lines first

    for (var i = tripMovementObjects.length - 1; i >= 0; i--) {
        //	console.log('remove');
        obj = tripObjects[i];
        scene.remove(obj);

        //corelation of 1to1 between flying saucers and lines
        if(i<100) {
            obj = tripMovementObjects[i];
            scene.remove(obj);
        }
    }

    tripObjects = [];
    tripMovementObjects = [];
    //choose nationalities being displayed
    console.log(value);
    console.log(checked);

    if (value == "Dutch") {
        showDutch = checked;
    }

    if (value == "Spanish") {
        showSpanish = checked;
    }

    if (value == "British") {
        showBritish = checked;
    }

    if (value == "French") {
        showFrench = checked;
    }


    filteredTripsData = [];

    for (var i in tripsData) {
        var set = tripsData[i];
        if (set.Nationality == "DUTCH" && showDutch) {
            filteredTripsData.push(set);
        }
        if (set.Nationality == "BRITISH" && showBritish) {
            filteredTripsData.push(set);
        }
        if (set.Nationality == "FRENCH" && showFrench) {
            filteredTripsData.push(set);
        }
        if (set.Nationality == "SPANISH" && showSpanish) {
            filteredTripsData.push(set);
        }
    }
    buildDataVizGeometries(filteredTripsData, scene);


}


function buildDataVizGeometries(linearData, scene) {


    for (var i in linearData) {

        var set = linearData[i];
        var year = set.Year;


        var count = 0;
        // console.log('Building data for ...' + year);


        var exporterName = set.Departure;
        var importerName = set.Destination;

        exporter = countryData[exporterName];
        importer = countryData[importerName];

        //	we couldn't find the country, it wasn't in our list...
        if (exporter === undefined || importer === undefined)
            continue;

        selectableYears.push(year);

        //choose color according to nationality
        var colour = "pink";

        if (set.Nationality == "DUTCH") {

            colour = "orange";
        }
        if (set.Nationality == "SPANISH") {

            colour = "red";
        }
        if (set.Nationality == "BRITISH") {
            colour = "blue";
        }
        if (set.Nationality == "FRENCH") {
            colour = "green";
        }


        //	visualize this event
        if (set.Year == "1779")
            set.lineGeometry = drawConnection(exporter, importer, scene, 8, colour);

    }

}
