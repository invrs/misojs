//	Flat-file-db miso adaptor example

//	TODO: Move to /cfg
var flatfile = require('flat-file-db'),
	uuid = require('node-uuid'),
	db = flatfile.sync('./system/adaptor/flatfiledb/data/flat-data-file.db');

//	Creates a cache for the constructed models 
//	so we're not creating new ones all the time
var modelCache = {};

module.exports = function(utils){
	return {
		find: function(cb, err, args){
			var list = db.keys(),
				result = [], tmp, i;

			for(i = 0; i < list.length; i += 1) {
				tmp = db.get(list[i]);
				if(args.type == tmp.type) {
					result.push(tmp);
				}
			}
			cb(result);
		},
		save: function(cb, err, args){
			//	Get an instance of the model
			var Model = utils.getModel(args.type), model, validation;

			if(!Model) {
				return err("Model not found " + args.type);
			}

			model = new Model(args.model);
			validation = model.isValid? model.isValid(): true;

			//	Validate the model data
			if(validation === true) {
				var data = utils.getModelData(model);

				data._id = data._id || uuid.v4();
				data.type = data.type || args.type;

				db.put(data._id, data, function (errorText) {
					if (errorText) {
						return err(errorText);
					}
					return cb(data._id);
				});
			} else {
				//	Send beack the validation errors
				return err(validation);
			}
		}
	};
};