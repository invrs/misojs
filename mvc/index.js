/*
	Main Miso MVC generator - this is a singleton to load all controllers
	and map their routes on startup of app. If a route is unmapped, we 
	(optionally) throw an error.

	TODO: This is a little large, split various things out a bit, including the "skin" view...
*/
var fs			= require('fs'),
	path		= require('path'),
	_			= require('lodash'),
	routes		= {},
	m = require('mithril'),
	sugartags = require('../server/mithril.sugartags.node.js')(m),
	bindings = require('../server/mithril.bindings.node.js')(m),
	//templates = require('../server/mithril.templates.node.js'),
	vm = require('vm'),
	exec = require('child_process').exec,
	render = require('mithril-node-render'),

	//	Force the browserify to run? (Note: this usually makes it loop a couple of times)
	forceBrowserify = false,
	attachmentNode = "document.getElementById('misoAttachmentNode')",

	//	TODO: below belongs in layout templates
	//  Puts the lotion on its...
	skin = function(content) {
		return [
			'<!doctype html>',
			'<html>',
			'<head>',
			'<link rel="stylesheet" href="/css/style.css"/>',
			
			//	NOTE: Dev only
			'<script src="/reload.js"></script>',

			'</head>',
			'<body>',
			'<header>',
			'<div class="cw cf">',
			'<a href="/" alt="MISO"><img src="/img/miso_logo.png"/></a>',
			'</div>',
			'</header>',
			'<section id="misoAttachmentNode" class="cw">',
			content,
			'</section>',
			//	The generated client script
			'<script src="/miso.js"></script>',
			'</body>',
			'</html>'
		].join('');
	},
	getExtension = function(filename) {
		var ext = path.extname(filename||'').split('.');
		return ext[ext.length - 1];
	}, 
	hasMappedRouteActions = {};


//	Map the routes for the controllers
//	This generates the client side code from our routes/controller/views
module.exports = function(app, options) {
	//	Add configured routes
	if(options.routeConfig) {
		_.forOwn(options.routeConfig, function(routeObj, routePath){
			var file = routeObj.name + ".js",
				routeFile = path.join(__dirname, file),
				route = require(routeFile),
				routeStats = fs.statSync(routeFile),
				routeName = file.substr(0, file.lastIndexOf("."));

			routes[routePath] = routes[routePath] || {};

			_.assign(routes[routePath], {
				route: route,
				method: routeObj.method,
				name: routeObj.name,
				action: routeObj.action,
				path: routePath,
				file: file,
				stats: routeStats
			});

			hasMappedRouteActions[routeObj.name + "." + routeObj.action] = routes[routePath];

		});
	}

	//	Import non configured routes
	fs.readdirSync(__dirname)
		.filter(function(file) {
			//	All js files that don't start with '.' and are not index.js or main.js
			return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file !== 'mvcmain.js') && (file !== 'miso.js') && getExtension(file) == "js";
		})
		.forEach(function(file) {
			var routeFile = path.join(__dirname, file),
				route = require(routeFile),
				routeStats = fs.statSync(routeFile),
				routeName = file.substr(0, file.lastIndexOf(".")),
				routePath = "/" + routeName,
				method = "get",
				//	TODO: The id, delete, new can be translated perhaps?
				idPostfix = "_id",
				deleteKeyword = "delete",
				newKeyword = "new";

			/*
				Here we generate routes based on supported action names, auto-mapped actions are:

				Action 		Method 		URL 						Description

				index 		GET 		[controller] + 's'			List the items
				edit 		GET 		[controller]/[id]			Display a form to edit the item
				delete 		POST 		[controller]/[id]/delete 	Deletes an item
				new 		GET 		[controller]/new 			Display a form to add a new item
				create 		POST 		[controller] 				Creates a new item
				update 		POST 		[controller]/[id] 			Updates an item

				Note: We are using RESTful-style URLs, but only GET and POST here,
					we could obviously add PUT, DELETE and so on, but we're keeping 
					this basic for now. This is because some browsers, eg: IE7/IE8
					do not properly support PUT and DELETE, so it's safer to exclude
					those methods. I know this is opinionated behaviour, but you can
					always add a custom route if you really want it.

				Ref:
				http://stackoverflow.com/questions/2456820/problem-with-jquery-ajax-with-delete-method-in-ie

				Action naming convention refs:
				http://mvccontrib.codeplex.com/wikipage?title=SimplyRestfulRouting&referringTitle=Documentation
				http://stephenwalther.com/archive/2008/06/27/asp-net-mvc-tip-11-use-standard-controller-action-names

			*/
			_.forOwn(route, function(idx, action){
				if(!hasMappedRouteActions[routeName + "." + action]) {
					//	Note: The list is pluralised with an s always, 
					//	so name your controller accordingly, eg: don't 
					//	name it 'users', it should be 'user'
					//	TODO: provide international pluralisation via
					//	i18next or similar
					switch (action) {
						//	Display an index page with a list of items
						case 'index':
							method = 'get';
							routePath = '/' + routeName + 's';
							break;
						//	An item to edit
						case 'edit':
							method = 'get';
							routePath = '/' + routeName + '/:' + routeName + idPostfix;
							break;
						//	Delete an item
						case 'delete':
							method = 'post';
							routePath = '/' + routeName + '/:' + routeName + idPostfix + '/' + deleteKeyword;
							break;
						case 'new':
							method = 'get';
							routePath = '/' + routeName + '/' + newKeyword;
							break;
						//	Create an item
						case 'create':
							method = 'post';
							routePath = '/' + routeName;
							break;
						//	Update an item
						case 'update':
							method = 'post';
							routePath = '/' + routeName + '/:' + routeName + idPostfix;
							break;
						case '_misoReadyBinding':
							//	For ensuring future bound events have been resolved
							return;
						default:
							var message = 'ERROR: unmapped action: "' + routeName + '.' + action + '" - please map it or make it a private function';
							if(options.throwUnmappedActions) {
								throw new Error(message);
							} else {
								options.verbose && console.log(message);
							}
					}

					routes[routePath] = {
						route: route,
						method: method,
						name: routeName,
						action: action,
						path: routePath,
						file: file,
						stats: routeStats
					};
				}
			});
		});

	var routeMap = {},
		//	route, name, path, method, action
		createRoute = function(args) {
			//	Add pointer to model for use in store/save
			if(args.route[args.action].model) {
				app.set(args.name + "." + args.action + ".model", args.route[args.action].model);
			}

			//	Setup the route on the app
			app[args.method](args.path, function(req, res, next) {
				try{
					var scope = args.route[args.action].controller(req.params),
						mvc = args.route[args.action];

					//	Check for ready binder
					if (!args.route._misoReadyBinding) {
						var result = render(_.isFunction(mvc.view)? mvc.view(scope): mvc.view, scope);
						res.end(skin(result));
					} else {
						//	Add "last" binding
						args.route._misoReadyBinding.bindLast(function() {
							var result = render(_.isFunction(mvc.view)? mvc.view(scope): mvc.view, scope);
							res.end(skin(result));
						});
					}
				} catch(ex){
					next(ex);
				}
			});

			options.verbose && console.log('     %s %s -> %s.%s', args.method.toUpperCase(), args.path, args.name, args.action);

			routeMap[args.path] = args;
		};

	//	TODO: 
	//	
	//	* Might want to externalise this?
	//	* Add ability to configure things, add/remove required libs, etc.
	//	
	var view = function(ctrl) {
		var usedRoute = {};
		return [
			"/* NOTE: This is a generated file, please do not modify it, your changes will be lost */",
			"var m = require('mithril');",
			
			//	Required libs
			"var sugartags = require('../server/mithril.sugartags.node.js')(m);",
			"var bindings = require('../server/mithril.bindings.node.js')(m);",
			"var store = require('../server/store.js');",
			
			//	All our route files
			(ctrl.routes.map(function(route, idx) {
				var result = usedRoute[route.name]? "" :
					"var " + route.name + " = require('../mvc/" + route.name + ".js');";
				usedRoute[route.name] = route;
				return result;
			})).join("\n"),

			//	Expose mithril - might be good for debugging...
			"if(typeof window !== 'undefined') {",
			"	window.m = m;",
			"}",

			"	",
			"m.route.mode = 'pathname';",
			"m.route("+attachmentNode+", '/', {",

			//	Add the route map for mithril here
			(ctrl.routes.map(function(route, idx) {
				return [
					"'" + route.path + "': " + route.name + "." + route.action
				].join("\n");
			})).join(",\n"),
			"});"
		].join("\n");
	};

	//	Grab our controller file names
	var routeList = [],
		mainFile = './mvc/mvcmain.js',
		output = "./client/miso.js",
		outputMap = "./client/miso.js.map.json",
		browserifyCmd = "browserify " + mainFile + " >" + output,
		//browserifyCmd = "browserify " + mainFile + " -d -p [minifyify --map /miso.js.map.json --output "+outputMap+"] >" + output,

		mainFileModified = fs.existsSync(mainFile)? fs.statSync(mainFile).mtime: new Date(1970,0,1),
		lastRouteModified = new Date(1970,0,1);

	//	Generate list of routes
	_.forOwn(routes, function(route, idx){
		//	Check controller timestamp
		lastRouteModified = (lastRouteModified > route.stats.mtime)?
			lastRouteModified: 
		 	route.stats.mtime;

		routeList.push(route);
		createRoute(route);
	});

	//	Output our main JS file for browserify
	fs.writeFileSync(mainFile, render(view({
		routes: routeList
	})));

	//	Run browserify when either a controller or view has changed.
	//	We use exec to run it - this gives us a little more flexibility
	//	Set MISOREADY when we are up and running
	if(forceBrowserify || lastRouteModified > mainFileModified) {
		exec(browserifyCmd, function (error, stdout, stderr) {
			if(error) {
				throw error
			}
			app.set("MISOREADY", true);
		});
	} else {
		app.set("MISOREADY", true);
	}
};