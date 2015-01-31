var dataCollection = new Mongo.Collection('Data')
var subscription = null

if(Meteor.isServer) {
	Meteor.publish('Data', function(){
    return dataCollection.find({}, {sort :{time: -1}, limit: 60});
	});
}


if(Meteor.isClient) {
	Template.dash.events({
		'click #collect': function(e) {
		
			subscription = Meteor.subscribe('Data', function() {
				dataCollection.find({}).observe({
					changed: function(id, fields) {
						  createChart()
					},
					removed: function(id) {
						  createChart()
					},
					added: function(id) {
						  createChart()
					}
				});
			});
		
			var status = document.getElementById("status")
			status.innerHTML = "Collecting Data"
			arduinoAjax("collect")
		},

		'click #stop': function(e) {
			var status = document.getElementById("status")
			status.innerHTML = "Stopping Data Collection"
			arduinoAjax("stop")
		},
		
		'click #clear': function(e) {
			if(subscription != null) {
				subscription.stop();
			}
			Meteor.call("clearData")
			status.innerHTML = "Clearing data"
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
			this.response.end('ok')
		}
	});
	this.route('dash', {
		where: 'client',
		action: function() {
			this.render('dash')
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
	var adcData = dataCollection.find().fetch()

	adcData.forEach(function(datum) {
		var point = [datum.time, datum.data]
		seriesData.push(point)
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
				text: 'Level'
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

Meteor.methods({
	clearData: function() {
		dataCollection.remove({});
	}
});
