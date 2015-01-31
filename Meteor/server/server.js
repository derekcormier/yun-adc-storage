// Collection to contain ADC data from Yun
var dataCollection = new Mongo.Collection('Data')

// Collection which lets the client know if there was an update
var updateCollection = new Mongo.Collection('UpdateReady')

// Date that data began collecting
var startDate = null

// Publish data to clients
Meteor.publish('Data', function() {
	return dataCollection.find({}, {sort: {time: -1}, limit: 500})
});

Meteor.publish('dataUpdate', function() {
	return updateCollection.find({}, {limit: 1})
});

Router.map(function() {
	// Route to record data to the server. Request is formatted as such:
	//
	//		http://{host}:5555/rec/AABBBB,CCDDDD,...
	//
	// AA    - ADC data in base 32 (must be 2 chars for parsing)
	// BBBB  - Time in milliseconds since start of recording in base 32
	//           (variable length)
	// CCDDDD- Another set of data
	this.route('rec', {
		where: 'server',
		path: '/rec/:data',
		action: function() {
			updateCollection.remove({})
		
			var data = this.params.data.split(",")
			for(var i = 0; i < data.length; i++) {
				var datum = data[i].substring(0,2)
				var time = data[i].substring(2)
				
				Meteor.call("writeData", time, datum);
			}
			
			updateCollection.insert({ready: true})
			
			this.response.end('ok')
		}
	});
});


Meteor.methods({
	// Clears the data from the collection
	clearData: function() {
		dataCollection.remove({});
	},
	
	setDate: function(clientStartDate) {
		startDate = clientStartDate;
		console.log("Set the date")
		console.log(startDate.getTime())
	},
	
	writeData: function(time, datum) {
		dataCollection.insert({time: startDate.getTime() + parseInt(time, 32),
					data: parseInt(datum, 32)})
	}
});
