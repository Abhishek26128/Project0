var express = require("express");
var router = express.Router();
var Camp = require("../models/campground");
var middleware = require("../middleware");
var multer = require("multer");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});

var cloudinary = require("cloudinary");
cloudinary.config({ 
  cloud_name: "abhishek26127", 
  api_key: "342934345332781", 
  api_secret: "S-kSl64jJwzPzK6Ay9lu3eggipc"
});

//INDEX-displays all campgrounds
router.get("/campgrounds", function(req, res){
	//fuzzy search logic
	if(req.query.search){
		const regEx = new RegExp(escapeRegExp(req.query.search), "gi");
		//get all the campgrounds from DB
		Camp.find({name: regEx}, function(err, cmpgrnd){
			if(err)
			{
				req.flash("error", "Oops, Something went wrong! Please try again.");
			}	
			else
			{
				//if searched campground is not present logic
				var noMatch = "";
				if(cmpgrnd.length < 1){
					noMatch = "No matches found, please try again !";
				}
				//display all campgrounds
				res.render("campground/index", {campground: cmpgrnd, currentUser: req.user, noMatch: noMatch});
			}	
		});
	}
	else{
		//get all the campgrounds from DB
		Camp.find({}, function(err, cmpgrnd){
			if(err)
			{
				req.flash("error", "Oops, Something went wrong! Please try again.");
			}	
			else
			{
				//display all campgrounds
				res.render("campground/index", {campground: cmpgrnd, currentUser: req.user});
			}	
		});
	}
});

//CREATE-add a new campground to DB
router.post("/campgrounds", middleware.isLoggedIn, upload.single("url"), function(req, res){
	cloudinary.uploader.upload(req.file.path, function(result) {
		// add cloudinary url for the image to the campground object under image property
		req.body.campground.image = result.secure_url;
		//add image's public_id to campground object
        req.body.campground.imageId = result.public_id;
		// add author to campground
		req.body.campground.author = {
		  id: req.user._id,
		  username: req.user.username 
		}
		//get data from Form and add to cmpgrnd database
		Camp.create(req.body.campground, function(err, campground) {
		  if (err) {
			req.flash("error", err.message);
			return res.redirect("back");
		  }
		  res.redirect("/campgrounds/" + campground.id);
		});
	});
});

//NEW-display form to make new campground
router.get("/campgrounds/new", middleware.isLoggedIn, function(req, res){
	res.render("campground/new.ejs");
});

//SHOW-to show info about one particular campground
router.get("/campgrounds/:id", function(req, res){
	//find the campground with provided id
	var id = req.params.id;
	Camp.findById(id).populate("comments likes").exec(function(err, foundCampground){
		if(err || !foundCampground)
		{
			req.flash("error", "Oops, Something went wrong! Please try again.");
		}	
		else
		{
			//and show the campground template
			res.render("campground/show", {campground: foundCampground});
		}	
	});
});

// Campground Like Route
router.post("/campgrounds/:id/like", middleware.isLoggedIn, function (req, res) {
    Camp.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            req.flash("error", "Oops, Something went wrong! Please try again.");
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function(like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                req.flash("error", "Oops, Something went wrong! Please try again.");
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

//EDIT-to edit particular campground
router.get("/campgrounds/:id/edit", middleware.checkCampOwnership, function(req, res){
	Camp.findById(req.params.id, function(err, editCampground){
		if(err){
			req.flash("error", err.message);
		}else{
			res.render("campground/edit", {campground: editCampground});
		}
	});
});

//UPDATE-to update a paricular edited campground
router.put("/campgrounds/:id", middleware.checkCampOwnership, upload.single("image"), function(req, res){
	//find and update a campground
	Camp.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", "Oops, Something went wrong! Please try again.");
			res.redirect("/campgrounds");
		}
		else{
			if(req.file){
				try{
					await cloudinary.uploader.destroy(campground.imageId);
					var result = await cloudinary.uploader.upload(req.file.path);
					campground.imageId = result.public_id;
					campground.image = result.secure_url;
				}
				catch(err){
					req.flash("error", err.message);
					return res.redirect("back"); 
				}
			}
			campground.name = req.body.name;
			campground.price = req.body.price;
			campground.description = req.body.description;
			campground.save();
			req.flash("success", "Campground updated successfully !");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

//DESTROY-to delete campgrounds
router.delete("/campgrounds/:id", middleware.checkCampOwnership, function(req, res){
	//find and delete campground
	Camp.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", "Oops, Something went wrong! Please try again.");
			return res.redirect("/campgrounds/" + req.params.id);
		}
		try{
			await cloudinary.uploader.destroy(campground.imageId);
			campground.remove();
			req.flash("success", "Campground deleted successfully!");
			res.redirect("/campgrounds");
		}
		catch(err){
			if(err){
				req.flash("error", err.message);
				return res.redirect("back");
			}	
		}
	});
});

function escapeRegExp(text){
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;