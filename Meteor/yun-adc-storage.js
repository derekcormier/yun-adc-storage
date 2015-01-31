var dataCollection = new Mongo.Collection('Data')

if(Meteor.isServer) {
	Meteor.publish('Data', function(){
    return dataCollection.find()
	});
}


if(Meteor.isClient) {
	Meteor.subscribe('Data', function() {  
		dataCollection.find({}).observe({
		  changed: function(id, fields) {
		      createChart();
		  },
		  removed: function(id) {
		      createChart();
		  },
		  added: function(id) {
		      createChart();
		  }
		});
	});

	Template.dash.events({
		'click #collect': function(e) {
			var status = document.getElementById("status")
			status.innerHTML = "Collecting Data"
			arduinoAjax("collect")
		},

		'click #stop': function(e) {
			var status = document.getElementById("status")
			status.innerHTML = "Stopped Data Collection"
			arduinoAjax("stop")
		}
	});
}


Router.map(function(){
	this.route('rec', {
		where: 'server',
		path: '/rec/:data',
		action: function() {			
			var data = this.params.data.split(",")
			for(var i = 0; i < data.length; i++) {
				var datum = data[i].substring(0,2)
				var time = data[i].substring(2)
				
				dataCollection.insert({time: parseInt(time, 32),
					data: parseInt(datum, 32)})
			}
			console.log('ok');
			this.response.end('ok');
		}
	});
	this.route('dash', {
		where: 'client',
		action: function() {
			this.render('dash');
		}
	});
});


var arduinoAjax = function(endpoint) {
	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", "http://arduinoyun.local/arduino/" + endpoint, true);
	xmlhttp.send();
	console.log("sent AJAX request");
}

createChart = function() {
	var seriesData = [];
	var adcData = dataCollection.find().fetch();
	console.log(adcData)

	adcData.forEach(function(datum) {
		var point = [datum.time, datum.data];
		seriesData.push(point);
	});

	$('#adcChart').highcharts({
		chart: {
			type: 'spline'
		},
		title: {
			text: 'ADC Readings from Arduino Yun'
		},
		xAxis: {
			type: 'time',
			title: {
				text: 'Time'
			}
		},
		yAxis: {
			title: {
				text: 'Divisions'
			}
		},
		tooltip: {
			headerFormat: '<b>{series.name}</b><br>',
			pointFormat: '{point.y:.2f}'
		},

		plotOptions: {
			spline: {
				marker: {
					enabled: true
				}
			},
			series: {
				animation: false
			}
		},

		series: [{
			name: 'ADC Data',
			data: seriesData
		}]
	});
};
