var dataCollection = new Mongo.Collection("data");

Router.map(function(){
	this.route('rec', {
		where: 'server',
		path: '/rec/:data',
		action: function() {
			var data = this.params.data.match(/.{1,2}/g);;
			console.log(data);
			console.log(this.params.data);
			for(var i = 0; i < data.length; i++) {
				console.log(parseInt(data[i], 32))
				dataCollection.insert({data: parseInt(data[i], 32)});
			}
			this.response.end('ok');
		}
	});
});
