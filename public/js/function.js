let email=null;

document.addEventListener('DOMContentLoaded', function() {
  // ログイン情報の取得
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      email= user.email;
      const welcome_message = document.getElementById('welcome-message');
      welcome_message.textContent='ようこそ！  '+email+' さん';
    } else {
      // User is signed out.
    }
  }, function(error) {
    console.log(error);
  });
});

// 商品の通知登録
function registerEvent() {
  console.log("registerButton was pressed");
  if(email == null){
    alert("Registration failed.\nPlease log in before registration.");
    return;
  }
  var products = [];
  const product_area = document.getElementById('product_area');
  const product_children = product_area.children;
  for (var i = 0; i<product_children.length; i++) {
    products.push(product_children[i].value);
  }
  var data = {
    email: email,
    product: products
  };
  db.collection("users").doc(email).set(data)
  .then(function(docRef) {
    alert('Registration completed.');
    const product_children = product_area.children;
    for (var i = 0; i<product_children.length; i++) {
      product_children[i].value="";
    }
  })
  .catch(function(error) {
    console.error("Error adding document: ", error);
    alert('An error occurred.\nRegistration failed.');
  });
  display_registered_products();
}

// 商品の需要可視化
function searchEvent(){
  console.log("searchButton was pressed");
  var timeSpanArray=getTimeSpan();
  const graph_area = document.getElementById('graph-area');
  while( graph_area.firstChild ){
    graph_area.removeChild( graph_area.firstChild );
  }
  const search_product_area = document.getElementById('search-product-area');
  const search_product_children = search_product_area.children;
  
  let graph_num=0;
  for (var i = 0; i<search_product_children.length;i++) {
    const search_product = search_product_children[i].value;
    if(search_product=='')continue;
    var docRef = db.collection("item").doc(search_product);
    var getOptions = {
        source: 'server'
    };
    docRef.get(getOptions).then(function(doc) {
      var labels=[];
      let dt= new Date(timeSpanArray[0]);
      for(var j=0; j<doc.data()['state'].length; j++){
        labels.push(formatTime(dt));
        dt.setDate(dt.getDate() + 1);
      }
      var demand_index=255-(doc.data()['state'].slice(-1)[0]+100)*255/200;
      console.log(demand_index);
      var lineChartData = {
        labels : labels,
        datasets : [
          {
            label: "データ",
            fillColor : "rgba(255,"+demand_index+","+demand_index+",0.2)", // 線から下端までを塗りつぶす色
            strokeColor : "rgba(255,"+demand_index+","+demand_index+",1)", // 折れ線の色
            pointColor : "rgba(255,0,255,1)",  // ドットの塗りつぶし色
            pointStrokeColor : "white",        // ドットの枠線色
            // pointHighlightFill : "yellow",     // マウスが載った際のドットの塗りつぶし色
            pointHighlightFill : "rgba(128,191,255,1)",     // マウスが載った際のドットの塗りつぶし色
            pointHighlightStroke : "red",    // マウスが載った際のドットの枠線色
            data : doc.data()['state']       // 各点の値
          }
        ]
      }
      var graph_canvas = document.createElement('canvas');
      graph_canvas.width = '800';
      graph_canvas.height="450";
      graph_canvas.className="graph-canvas";
      graph_canvas.id = 'graph-canvas-' + graph_num;
      var graph_name = document.createElement('p');
      graph_name.textContent=doc.data()['name'];
      graph_name.id='graph-name-' + graph_num;
      graph_name.className="graph-name";
      var parent = document.getElementById('graph-area');
      parent.appendChild(graph_name);
      parent.appendChild(graph_canvas);
      var ctx = document.getElementById('graph-canvas-' + graph_num).getContext("2d");
      window.myLine = new Chart(ctx).Line(lineChartData);
      graph_num++;
    }).catch(function(error) {
      alert(search_product+"はデータベースにありません");
      console.log("Error getting cached document:", error);
    });
  }
}


var product_form_id = 1 ;
function addForm() {
  var input_data = document.createElement('input');
  input_data.type = 'text';
  input_data.id = 'product_' + product_form_id;
  input_data.class="inputs";
  input_data.name="product";
  var parent = document.getElementById('product_area');
  parent.appendChild(input_data);
  product_form_id++;
}


function removeForm() {
  const product_area = document.getElementById('product_area');
  product_area.removeChild(product_area.lastChild);
}


function display_registered_products(){
  const registered_products = document.getElementById('registered-products');
  var docRef = db.collection("users").doc(email);
  // Valid options for source are 'server', 'cache', or
  // 'default'. See https://firebase.google.com/docs/reference/js/firebase.firestore.GetOptions
  // for more information.
  var getOptions = {
      source: 'cache'
  };
  // Get a document, forcing the SDK to fetch from the offline cache.
  docRef.get(getOptions).then(function(doc) {
      // Document was found in the cache. If no cached document exists,
      // an error will be returned to the 'catch' block below.
      registered_products.textContent="登録した商品：";
      for (var i = 0; i<doc.data()['product'].length; i++){
        registered_products.textContent+=doc.data()['product'][i]+'  ';
      }
  }).catch(function(error) {
      console.log("Error getting cached document:", error);
  });
}


var search_product_form_id = 1 ;
function addSearchForm() {
  var input_data = document.createElement('input');
  input_data.type = 'text';
  input_data.id = 'search_product_' + search_product_form_id;
  input_data.class="inputs";
  input_data.name="product";
  var parent = document.getElementById('search-product-area');
  parent.appendChild(input_data);
  search_product_form_id++;
}


function removeSearchForm() {
  const search_product_area = document.getElementById('search-product-area');
  search_product_area.removeChild(search_product_area.lastChild);
}


function getTimeSpan(){
  var docRef = db.collection("timespan").doc('span');
  var getOptions = {
      source: 'server'
  };
  var timeSpanArray = [];
  docRef.get(getOptions).then(function(doc) {
    for(var i = 0; i<2; i++){
      timeSpanArray.push(doc.data()['timestamp'][i]['seconds']*1000);
    }
  }).catch(function(error) {
    console.log("Error getting cached document:", error);
  });

  return timeSpanArray
}


function formatTime(date){
  const year  = date.getFullYear();
  const month = date.getMonth() + 1;
  const day   = date.getDate();
  return year + '年' + month + '月' + day + '日';
}
