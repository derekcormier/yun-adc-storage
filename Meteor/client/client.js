// Collection to contain ADC data from Yun
var dataCollection = new Mongo.Collection('Data')

// Collection which lets the client know if there was an update
var updateCollection = new Mongo.Collection('UpdateReady')

// Handle for the subscription, used to stop and start
var subscription = null

// Date when client started collecting data per session
var sessionRecordingDate = null

// Number of points the user wants to see at a time
var dataPointLimit = 0;


Template.dash.events({
	// Fired when the collect button is clicked
	'click #collect': function(e) {
		var delay = $('#delay').val()
		var points = $('#points').val()
		
		// Validate user input for delay
		if(delay.length != 0 && !isNaN(delay)) {
			if(delay < 0 || delay > 60000) {
				alert('Delay must be within 0 to 60000!')
				return
			}
		} else {
			alert('Delay must be a number!')
			return
		}
		
		// Validate user input for points
		if(points.length != 0 && !isNaN(points)) {
			if(points < 0 || points > 60000) {
				alert('Must choose within 0 to 500 points!')
				return
			}
		} else {
			alert('Points must be a number!')
			return
		}
		
		// Set the number of points the user wants
		dataPointLimit = points;
		
		// Set the recording date to the current date
		sessionRecordingDate = new Date()
		Meteor.call('setDate', sessionRecordingDate)
	
		// Subscribe to the server publish
		subscription = Meteor.subscribe('Data')
	
		// Tell the user we're getting data
		var status = document.getElementById('status')
		status.innerHTML = 'Status: Collecting Data'
		
		// Tell the Yun to begin collecting data
		arduinoAjax('collect/' + delay)
	},

	// Fired when the stop button is clicked 
	'click #stop': function(e) {
		// Tell the user we're stopping collection
		var status = document.getElementById('status')
		status.innerHTML = 'Status: Stopping Data Collection'
		
		// Tell the Yun to stop collecting data
		arduinoAjax('stop')
	}
})


Router.map(function() {
	// Route to the dashboard page
	this.route('dash', {
		where: 'client',
		action: function() {
			Meteor.subscribe('dataUpdate', function() {
				updateCollection.find({}).observe({
					// when data is added, redraw the chart
					added: function(id, fields) {
						console.log('update ready')
						createChart()
					}
				})
			})
			this.render('dash')
		}
	})
})


// Sends a REST call to the specified endpoint on the Yun
//   Note: This will cause a SOP Access control errror. Since we don't need anything
//         in response from the Yun, this still works because you may write, but not
//         across domains/ports
var arduinoAjax = function(endpoint) {
	var xmlhttp = new XMLHttpRequest()

	xmlhttp.open('GET', 'http://arduinoyun.local/arduino/' + endpoint, true)
	xmlhttp.send()
	console.log('sent AJAX request')
}


// Draws/redraws the line chart
createChart = function() {

	var seriesData = []
	
	// Get the data given to the client by the subscription, limited by the specified limit,
	//   getting newest points first
	var adcData = dataCollection.find({time: {$gt: sessionRecordingDate.getDate()}},
	      {limit: parseInt(dataPointLimit), sort: {time: -1}}).fetch()
	
	// Since we got the data backward, turn it around
	adcData.reverse()

	// Put the data from the collection into an array for highcharts
	// 	 one at a time
	adcData.forEach(function(datum) {
		var datetime = new Date(datum.time)
		var timeString = datetime.getHours() + ':' + datetime.getMinutes() + ':' +
			datetime.getSeconds() + '.' + datetime.getMilliseconds()
		var point = [datetime.getTime(), datum.data]
		seriesData.push(point)
	})

	// Create the line chart
	$('#adcChart').highcharts({
		chart: {
			type: 'spline'
		},
		title: {
			text: 'ADC Readings from Arduino Yun'
		},
		xAxis: {
			type: 'datetime',
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
		tooltip: {
			enabled: false
		},
		series: [{
			name: 'ADC Data',
			data: seriesData
		}]
	})
}
