// Collection to contain ADC data from Yun
var dataCollection = new Mongo.Collection('Data')

// Handle for the subscription, used to stop and start
var subscription = null


Template.dash.events({
	// Fired when the collect button is clicked
	'click #collect': function(e) {
	
		// Subscribe to the server publish
		subscription = Meteor.subscribe('Data', function() {
			dataCollection.find({}).observe({
				// when data is added, redraw the chart
				added: function(id, fields) {
					  createChart()
				},
				// when data is removed, redraw the chart
				removed: function(id, fields) {
					  createChart()
				}
			});
		});
	
		// Tell the user we're getting data
		var status = document.getElementById("status")
		status.innerHTML = "Status: Collecting Data"
		
		// Tell the Yun to begin collecting data
		arduinoAjax("collect")
	},

	'click #stop': function(e) {
		// Tell the user we're stopping collection
		var status = document.getElementById("status")
		status.innerHTML = "Status: Stopping Data Collection"
		
		// Tell the Yun to stop collecting data
		arduinoAjax("stop")
	},
	
	'click #clear': function(e) {
		// Tell the user we're clearing the data
		status.innerHTML = "Status: Clearing data"
	
		// Invalidate the subscription (avoids slow removal of each point
		// 	on browser with the removed subscription observer)
		if(subscription != null) {
			subscription.stop();
		}
		
		// Tell the server to clear the collection.
		Meteor.call("clearData")
	}
});


Router.map(function() {
	// Route to the dashboard page
	this.route('dash', {
		where: 'client',
		action: function() {
			this.render('dash')
		}
	});
});


// Sends a REST call to the specified endpoint on the Yun
var arduinoAjax = function(endpoint) {
	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", "http://arduinoyun.local/arduino/" + endpoint, true);
	xmlhttp.send();
	console.log("sent AJAX request");
}


// Draws/redraws the line chart
createChart = function() {

	var seriesData = [];
	
	// Get the data given to the client by the subscription
	var adcData = dataCollection.find().fetch()

	// Put the data from the collection into an array for highcharts
	// 	one at a time
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
				text: 'Time (ms)'
			}
		},
		yAxis: {
			title: {
				text: 'Level'
			}
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
