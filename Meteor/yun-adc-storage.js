var dataCollection = new Mongo.Collection("data");

Router.map(function(){
	this.route('rec', {
		where: 'server',
		path: '/rec/:data',
		action: function() {
			var data = this.params.data.split(",");
			console.log(data);
			console.log(this.params.data);
			for(var i = 0; i < data.length; i++) {
				console.log(data[i])
				dataCollection.insert({data: data[i]});
			}
			this.response.end('ok');
		}
	});
});
