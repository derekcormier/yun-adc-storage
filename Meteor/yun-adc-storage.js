var dataCollection = new Mongo.Collection("data");

if(Meteor.isClient) {
	UI.body.events({
		'click #collect': function(e) {
			var status = document.getElementById("status");
			status.innerHTML = "Collecting Data";
			arduinoAjax("collect");
		},

		'click #stop': function(e) {
			var status = document.getElementById("status");
			status.innerHTML = "Stopped Data Collection";
			arduinoAjax("stop");
		}
	});
}

Router.map(function(){
	this.route('rec', {
		where: 'server',
		path: '/rec/:data',
		action: function() {
			var data = this.params.data.match(/.{1,9}/g);;
			for(var i = 0; i < data.length; i++) {
				var time = data[i].substring(0,7);
				var datum = data[i].substring(8,9);
				dataCollection.insert({time: parseInt(time, 32),
					data: parseInt(datum, 32)});
			}
			console.log('ok');
			this.response.end('ok');
		}
	});
});

Router.map(function(){
	this.route('dash', {
		where: 'client',
		path: '/dash',
		action: function() {
			
		}
	});
});

var arduinoAjax = function(endpoint) {
	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", "http://arduinoyun:5555/arduino/" + endpoint, true);
	xmlhttp.send();
}
