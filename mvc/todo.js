var m = require('mithril'),
	sugartags = require('../server/mithril.sugartags.node.js')(m),
	bindings = require('../server/mithril.bindings.node.js')(m),
	miso = require('../server/miso.util.js'),
	store = require('../server/store.js')(this);

//	Testing
var api = require('../system/api.server.js')(m, this);

//	Basic todo app
var self = module.exports.index = {
	models: {
		//	Our todo model
		todo: function(data){
			this.text = data.text;
			this.done = m.p(data.done);
		}
	},
	controller: function(params) {
		var ctrl = this;

		//	View model
		ctrl.vm = {
			todoList: function(todos){
				this.todos = m.p(todos);
			},
			//	How many are left
			left: function(){
				var count = 0;
				ctrl.model.todos().map(function(todo) {
					count += todo.done() ? 0 : 1;
				});
				return count;
			},
			input: m.p("")
		};

		ctrl.addTodo = function(e){
			var value = ctrl.vm.input();
			if(value) {
				var newTodo = new self.models.todo({text: ctrl.vm.input(), done: false});
				ctrl.model.todos.push(newTodo);
				ctrl.vm.input("");
				api.save({ type: 'todo.index.todo', model: newTodo } ).then(function(){
					console.log("Saved", arguments);
				});
			}
			e.preventDefault();
			return false;
		};

		ctrl.archive = function(){
			var list = [];
			ctrl.model.todos().map(function(todo) {
				if(!todo.done()) { list.push(todo); }
			});
			ctrl.model.todos(list);
		};


		//	WIP: Need to implement _misReadyBinding on the controller.

		// //	Fake call to store.load
		store.load('todo', 1).then(function(loadedTodos) {
			ctrl.model = new ctrl.vm.todoList([
				new self.models.todo({ text: "learn mithril", done: true}),
      			new self.models.todo({ text: "build a mithril app", done: false})
			]);
		});

		//	Test load our todos
		api.find({type: 'todo.index.todo'}).then(function(loadedTodos) {
			console.log('loaded todos', loadedTodos);
			loadedTodos.map(function(value, idx){
				console.log(value);	
			})
			ctrl.model = new ctrl.vm.todoList([
				new self.models.todo({ text: "learn mithril", done: true}),
				new self.models.todo({ text: "build a mithril app", done: false})
			]);
		});


		//	Test saving
		// var theTodo = new self.models.todo({
		// 	text: "Something", 
		// 	done: false
		// });

		// api.save({ type: 'todo.index.todo', model: theTodo } ).then(function(){
		// 	console.log("Saved", arguments);
		// });


		return ctrl;
	},
	view: function(ctrl) {
		var c = ctrl,
			t = c.model;
		with(sugartags) {
			return [
				STYLE(".done{text-decoration: line-through;}"),
				H1("Todos - " + c.vm.left() + " of " + t.todos().length + " remaining"),
				BUTTON({ onclick: c.archive }, "Archive"),
				UL([
					t.todos().map(function(todo, idx){
						return LI({ class: todo.done()? "done": "", toggle: todo.done }, todo.text);
					})
				]),
				FORM({ onsubmit: c.addTodo }, [
					INPUT({ type: "text", value: c.vm.input, placeholder: "Add todo"}),
					BUTTON({ type: "submit"}, "Add")
				])
			];
		}
	}
};