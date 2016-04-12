// Created by Bjorn Sandvik - thematicmapping.org

//data that is used
var geoData;

// Earth params
	var radius   = 0.5,
		segments = 32;



 //load the data and scene 
window.onload = loadData;  

// load data from file and create the arrays objects that are needed
 function loadData(){
	 
	
	//use d3 to load atoms as objects from the file
	 d3.csv("data/Geodata.csv", function(e,d) {
		// the atom objects
		geoData = d;
		init();
	 });
 }


 
function init() {

	var webglEl = document.getElementById('webgl');

	if (!Detector.webgl) {
		Detector.addGetWebGLMessage(webglEl);
		return;
	}

	var width  = window.innerWidth,
		height = window.innerHeight;

	 

	// main parameters for the scene
	var scene = new THREE.Scene();

	var camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
	camera.position.z = 1.5;

	var renderer = new THREE.WebGLRenderer();
	renderer.setSize(width, height);
	
	
	//add light to the scene
	scene.add(new THREE.AmbientLight(0x333333));

	var light = new THREE.DirectionalLight(0xffffff, 1);
	light.position.set(5,3,5);
	scene.add(light);

    var sphere = createSphere(radius, segments);
//	sphere.rotation.y = 0.02;
//	sphere.rotation.x = -0.05;
//	sphere.rotation.z = 0.07;
	scene.add(sphere)
	
	
	
	
	drawHarbors(scene,geoData);
	drawConnection(geoData[264], geoData[50], scene, 4, "red")
	


	
	//renderer
	var controls = new THREE.TrackballControls(camera);

	webglEl.appendChild(renderer.domElement);

	render();

	function render() {
		controls.update();
	//	sphere.rotation.y += 0.0000;
	//	clouds.rotation.y += 0.0005;		
		requestAnimationFrame(render);
		renderer.render(scene, camera);
	}

	//function to draw the map
	function createSphere(radius, segments) {
		return new THREE.Mesh(
			new THREE.SphereGeometry(radius, segments, segments),
			new THREE.MeshPhongMaterial({
				map:         THREE.ImageUtils.loadTexture('images/map.png'),
				specular:    new THREE.Color('grey')								
			})
		);
	}

//	console.log(geoData);

}

//draw the locations from GeoData
function drawHarbors(scene, geodata)
{
		for(i = 1; i < geodata.length; i++){
			
			var geolocation  = geodata[i];
			
			if((geolocation.DecLatitude != "NA") && (geolocation.DecLongitude != "NA") )
			{
				var lon = parseFloat(geolocation.DecLongitude);
				var lat = parseFloat(geolocation.DecLatitude);
				
				var phi = Math.PI/2 - lat * Math.PI / 180 - Math.PI * 0.0035;
				var theta = 2 * Math.PI - lon * Math.PI / 180 + Math.PI * 0.055;
			
				x = Math.sin(phi) * Math.cos(theta) * radius;
				y = Math.cos(phi) * radius;
				z = Math.sin(phi) * Math.sin(theta) * radius;  	
				
				// create a sphere
				var sphereGeometry = new THREE.SphereGeometry(0.0025, 5, 5);
				var sphereMaterial = new THREE.MeshLambertMaterial({color: 'pink'});
				var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
				sphere.position.set(x,y,z);
				scene.add(sphere); 
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
	
function drawConnection(harbor1, harbor2, scene, height, colour){
	
	var vec3_origin = new THREE.Vector3(0,0,0);
	
	//coordinate of first harbor
	var lon1 = parseFloat(harbor1.DecLongitude);
	var lat1 = parseFloat(harbor1.DecLatitude);
	
	var phi1 = Math.PI/2 - lat1 * Math.PI / 180 - Math.PI * 0.0035;
	var theta1 = 2 * Math.PI - lon1 * Math.PI / 180 + Math.PI * 0.055;
	
	x1 = Math.sin(phi1) * Math.cos(theta1) * radius;
	y1 = Math.cos(phi1) * radius;
	z1 = Math.sin(phi1) * Math.sin(theta1) * radius;  	
	var point1 = new THREE.Vector3(x1,y1,z1);
	
	
	//coordinates of second harbor
	var lon2 = parseFloat(harbor2.DecLongitude);
	var lat2 = parseFloat(harbor2.DecLatitude);
	
	var phi2 = Math.PI/2 - lat2 * Math.PI / 180 - Math.PI * 0.0035;
	var theta2 = 2 * Math.PI - lon2 * Math.PI / 180 + Math.PI * 0.055;
	
	x2 = Math.sin(phi2) * Math.cos(theta2) * radius;
	y2 = Math.cos(phi2) * radius;
	z2 = Math.sin(phi2) * Math.sin(theta2) * radius;  
	var point2 = new THREE.Vector3(x2,y2,z2);
	
	//calculate curve coordinates
	var startAnchor = new THREE.Vector3(x1,y1,z1);
	var endAnchor = new THREE.Vector3(x2,y2,z2);
	var start = startAnchor;
	var end = endAnchor;
	
	
	var distanceBetweenCountryCenter = point1.clone().sub(point2).length();		

	//	midpoint for the curve
	var mid = start.clone().lerp(end,0.5);		
	var midLength = mid.length()
	mid.normalize();
	mid.multiplyScalar( midLength + distanceBetweenCountryCenter * height * 0.1 );	
	
	console.log(mid);
	
	//	the normal from start to end
	var normal = (new THREE.Vector3()).sub(start,end);
	normal.normalize();
	
	// 2 side midpoints of the curve
	var distanceHalf = distanceBetweenCountryCenter * 0.5;
	var midStartAnchor = mid.clone().add( normal.clone().multiplyScalar( distanceHalf ) );					
	var midEndAnchor = mid.clone().add( normal.clone().multiplyScalar( -distanceHalf ) );
	
	
	
	var curveCubic = new THREE.CubicBezierCurve3(start, midStartAnchor, midEndAnchor, end);
	var curveQuad = new THREE.QuadraticBezierCurve3(start, mid, end);
	
	var cp = new THREE.CurvePath();
        cp.add(curveCubic);
	
	console.log(curveCubic);
	
	var curvedLineMaterial =  new THREE.LineBasicMaterial({color: colour, linewidth: 1});
	var curvedLine = new THREE.Line(cp.createPointsGeometry(20), curvedLineMaterial);
	scene.add(curvedLine);
	
}

	
	






