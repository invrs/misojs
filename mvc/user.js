var store = require('../server/store.js')(this),
	miso = require('../server/miso.util.js'),
	validate = require('validator.modelbinder'),
	m = require('mithril'),
	sugartags = require('../server/mithril.sugartags.node.js')(m),
	bindings = require('../server/mithril.bindings.node.js')(m);

//	Index user
module.exports.index = {
	controller: function(params) {
		var self = this;
		this.users = [];

		store.load('user', 1).then(function(loadedUsers) {
			self.users = loadedUsers;
		});

		return self;
	},
	view: function(ctrl){
		with(sugartags) {
			return DIV('All the users would be listed here');
		}
	}
};

//	Edit user
module.exports.edit = {
	model: function(data){
		this.name = m.p(data.name);
		this.email = m.p(data.email);
		this.id = m.p(data.id);

		//	Validate the model		
		this.isValid = validate.bind(this, {
			name: {
				'isRequired': "You must enter a name"
			},
			email: {
				'isRequired': "You must enter an email address",
				'isEmail': "Must be a valid email address"
			}
		});

		return this;
	},
	controller: function(params) {
		var self = this,
			userId = miso.getParam('user_id', params);

		store.load('user', userId).then(function(user) {
			user.email = "is_email.com";
			self.user = new module.exports.edit.model(user);
		});

		self.save = function(){
			console.log('SAVE', self.user);
			//	Type of model, and the data
			store.save('user.edit.model', self.user);
		};

		return self;
	},
	view: function(ctrl){
		with(sugartags) {
			return [
				H2({class: "pageHeader"}, "Edit user"),
				DIV([
					LABEL("Name"), INPUT({value: ctrl.user.name}),
					DIV({class: ctrl.user.isValid('name') == true? "valid": "invalid"}, [
						ctrl.user.isValid('name') == true? "": ctrl.user.isValid('name').join(", ")
					])
				]),
				DIV([
					LABEL("Email"), INPUT({value: ctrl.user.email}),
					DIV({class: (ctrl.user.isValid('email') == true? "valid": "invalid") + " indented" }, [
						ctrl.user.isValid('email') == true? "": ctrl.user.isValid('email').join(", ")
					])
				]),
				DIV({class: "indented"},[
					BUTTON({onclick: ctrl.save, class: "positive"}, "Save user")
				])
			];
		}
	}
};