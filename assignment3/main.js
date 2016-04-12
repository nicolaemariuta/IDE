 var map;
    function init(){
  // initiate leaflet map
  map = new L.Map('map', { 
    center: [20,-20],
    zoom: 3
  })

  L.tileLayer('https://dnv9my2eseobd.cloudfront.net/v3/cartodb.map-4xtxp73f/{z}/{x}/{y}.png', {
    attribution: 'Mapbox <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>'
  }).addTo(map);

  var layerUrl = 'http://documentation.cartodb.com/api/v2/viz/9af23dd8-ea10-11e2-b5ac-5404a6a683d5/viz.json';

  var sublayers = [];

  cartodb.createLayer(map, layerUrl)
  .addTo(map)
  .on('done', function(layer) {
    // change the query for the first layer
    var subLayerOptions = {
      sql: "SELECT * FROM ne_10m_populated_places_simple",
      cartocss: "#ne_10m_populated_places_simple{marker-fill: #F84F40; marker-width: 8; marker-line-color: white; marker-line-width: 2; marker-clip: false; marker-allow-overlap: true;}"
    }

    var sublayer = layer.getSubLayer(0);

    sublayer.set(subLayerOptions);

    sublayers.push(sublayer);
  }).on('error', function() {
    //log the error
  });

  //we define the queries that will be performed when we click on the buttons, by modifying the SQL of our layer
  var LayerActions = {
    all: function(){
      sublayers[0].setSQL("SELECT * FROM ne_10m_populated_places_simple");
      return true;
    },
    capitals: function(){
      sublayers[0].setSQL("SELECT * FROM ne_10m_populated_places_simple WHERE featurecla = 'Admin-0 capital'");
      return true;
    },
    megacities: function() {
      sublayers[0].set({
        sql: "SELECT * FROM ne_10m_populated_places_simple WHERE megacity = 1",
        //as it is said, you can also add some CartoCSS code to make your points look like you want for the different queries
       // cartocss: "#ne_10m_populated_places_simple{ marker-fill: black; }"
      });
      return true;
    }
  }

  $('.button').click(function() {
    $('.button').removeClass('selected');
    $(this).addClass('selected');
    //this gets the id of the different buttons and calls to LayerActions which responds according to the selected id
    LayerActions[$(this).attr('id')]();
  });
}