var mongoose = require("mongoose");

var campSchema = new mongoose.Schema({
	name: String,
	image: String,
	imageId: String,
	price: String,
	description: String,
	createdAt: {type: Date, default: Date.now},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
		    ref: "User"
		},
		username: String
	},
	comments: [
		{
		   type: mongoose.Schema.Types.ObjectId,
		   ref: "Comment"
		}
	],
	likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});

var Camp = mongoose.model("Camp", campSchema);
module.exports = Camp;
