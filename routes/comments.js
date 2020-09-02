var express = require("express");
var router = express.Router();
var Camp = require("../models/campground");
var comments = require("../models/comment");
var middleware = require("../middleware");

//NEW ROUTE-display form to add new comments
router.get("/campgrounds/:id/comments/new",  middleware.isLoggedIn, function(req, res){
	//find campground by id
	Camp.findById(req.params.id, function(err, campground){
		if(err){
			req.flash("error", "Oops, Something went wrong! Please try again.");
			res.redirect("back");
		}
		else{
			res.render("comments/new", {campground: campground});
		}
	});
});

//CREATE ROUTE-add a new comment to DB and a particular campground
router.post("/campgrounds/:id/comments", middleware.isLoggedIn, function(req, res){
	//lookup campground using id
	Camp.findById(req.params.id, function(err, campground){
		if(err){
			req.flash("error", "Oops, Something went wrong! Please try again.");
			res.redirect("/campgrounds");
		}
		else{
			//create a new commment
			comments.create(req.body.comments, function(err, cmnt){
				if(err){
					req.flash("error", "Oops, Something went wrong! Please try again.");
				}
				else{
					//add username and id to comments
					cmnt.author.id = req.user._id;
					cmnt.author.username = req.user.username; 
					//save comment
					cmnt.save();
					//push comment in that particular camp 
					campground.comments.push(cmnt);
					campground.save();
					//redirect to show page
					req.flash("success", "Comment created !");
					res.redirect("/campgrounds/" + campground._id);
				}
			});
		}
	});
});

//EDIT-to edit a particular comment
router.get("/campgrounds/:id/comments/:cmnts_id/edit", middleware.checkCommentOwnership, function(req, res){
	comments.findById(req.params.cmnts_id, function(err, editComment){
		if(err){
			req.flash("error", "Oops, Something went wrong! Please try again.");
			res.redirect("back");
		}
		else{
			res.render("comments/edit", {campground_id: req.params.id, comment: editComment});
		}
	});
});

//UPDATE-to update edited comment
router.put("/campgrounds/:id/comments/:cmnts_id", middleware.checkCommentOwnership, function(req, res){
	//find and update a comment
	comments.findByIdAndUpdate(req.params.cmnts_id, req.body.comments, function(err, updateComment){
		if(err){
			req.flash("error", "Oops, Something went wrong! Please try again.");
			res.redirect("back");
		}
		//redirect somewhere(showpage)
		else{
			req.flash("success", "Comment updated !");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

//DESTROY-to delete comment
router.delete("/campgrounds/:id/comments/:cmnts_id", middleware.checkCommentOwnership, function(req, res){
	//find and delete comment
	comments.findByIdAndRemove(req.params.cmnts_id, function(err){
		if(err){
			req.flash("error", "Oops, Something went wrong! Please try again.");
			res.redirect("back");
		}
		else{
			req.flash("success", "Comment deleted !");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

module.exports = router;
