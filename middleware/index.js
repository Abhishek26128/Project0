//al the middlewares goes here

var Camp = require("../models/campground");
var comments = require("../models/comment");
var middlewareObj = {};

middlewareObj.checkCampOwnership = function(req, res, next){
	//Is the use logged in?
	if(req.isAuthenticated()){
		Camp.findById(req.params.id, function(err, foundCampground){
			if(err || !foundCampground){
				req.flash("error", "Campground not found !");
				res.redirect("back");
			}
			else{
				//does the current user own the campground?
				console.log(foundCampground.author.id , req.user._id);
				if((foundCampground.author.id).equals(req.user._id)){
					next();
				}
				else{
					req.flash("error", "You don't have permissions to do that");
					res.redirect("back");
				}
			}
		});
	}
	else{
		req.flash("error", "You need to be logged in!");
		res.redirect("back");
	}
}

middlewareObj.checkCommentOwnership = function(req, res, next){
	//Is the use logged in?
	if(req.isAuthenticated()){
		comments.findById(req.params.cmnts_id, function(err, foundComment){
			if(err || !foundComment){
				req.flash("error", "Comment not found !");
				res.redirect("back");
			}
			else{
				//does the current user own the comment?
				if((foundComment.author.id).equals(req.user._id)){
					next();
				}
				else{
					res.redirect("back");
				}
			}
		});
	}
	else{
		req.flash("error", "You need to be logged in !");
		res.redirect("back");
	}
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
	}
	req.flash("error", "You need to be logged in !");
    res.redirect("/login");
}

module.exports = middlewareObj;