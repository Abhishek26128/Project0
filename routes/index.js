var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Camp = require("../models/campground");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
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
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require("cloudinary");
cloudinary.config({ 
  cloud_name: "abhishek26127", 
  api_key: "342934345332781", 
  api_secret: "S-kSl64jJwzPzK6Ay9lu3eggipc"
});

//ROOT ROUTE
router.get("/", function(req, res){
	res.render("campground/landing");
});

//AUTH ROUTES
//SHOW register form
router.get("/register", function(req, res){
	res.render("register");
});

//Handle SIGN UP logic
router.post("/register", upload.single("avatar"), function(req, res){
	cloudinary.uploader.upload(req.file.path, function(result) {
		// add cloudinary url for the image to the user object under image property
		req.body.avatar = result.secure_url;
		//add image's public_id to user object
        req.body.avatarId = result.public_id;
		var newUser = new User({  
			username: req.body.username, 
			firstName: req.body.firstname, 
			lastName: req.body.lastname, 
			email: req.body.email, 
			avatar: req.body.avatar
		});
		User.register(newUser, req.body.password, function(err, user){
			if(err){
				req.flash("error", err.message);
				return res.render("register");
			}
			passport.authenticate("local")(req, res, function(){
				req.flash("success", "Welcome to Campify "+ user.username);
				res.redirect("/campgrounds")
			});
		});
	});
});

//ROUTE to show login form
router.get("/login", function(req, res){
    res.render("login");
});

//ROUTE handling login logic
router.post("/login", passport.authenticate("local", {
    successRedirect: "/campgrounds",
	failureRedirect: "/login",
	failureFlash: true,
	successFlash: "Welcome to Campify!"
}));

//ROUTE to logout
router.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "Successfully Logged you out!");
    res.redirect("/campgrounds");
});

//ROUTE to forgot password
router.get("/forgot", function(req, res){
	res.render("forgot");
});

//forget password logic
router.post("/forgot", function(req, res, next) {
	async.waterfall([
	  function(done) {
		crypto.randomBytes(20, function(err, buf) {
		  var token = buf.toString("hex");
		  done(err, token);
		});
	  },
	  function(token, done) {
		User.findOne({ email: req.body.email }, function(err, user) {
		  if (!user) {
			req.flash("error", "No account with that email address exists.");
			return res.redirect("/forgot");
		  }
  
		  user.resetPasswordToken = token;
		  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
		  user.save(function(err) {
			done(err, token, user);
		  });
		});
	  },
	  function(token, user, done) {
		var smtpTransport = nodemailer.createTransport({
		  service: "Gmail", 
		  auth: {
			user: "abhishek26127@gmail.com",
			pass: "ramprosad07"
		  }
		});
		var mailOptions = {
		  to: user.email,
		  from: "noobmaster26128@gmail.com",
		  subject: "Password Reset",
		  text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
			'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
			'http://' + req.headers.host + '/reset/' + token + '\n\n' +
			'If you did not request this, please ignore this email and your password will remain unchanged.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
		  req.flash("success", "An e-mail has been sent to" + user.email);
		  done(err, 'done');
		});
	  }
	], function(err) {
	  if(err){
		return next(err);
	  }
	  res.redirect('/forgot');
	});
  });
  
  //ROUTE to reset password
  router.get("/reset/:token", function(req, res) {
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
	  if (!user) {
		req.flash("error", "Password reset token is invalid or has expired.");
		return res.redirect("/forgot");
	  }
	  res.render("reset", {token: req.params.token});
	});
  });
  
  //reset password logic
  router.post("/reset/:token", function(req, res) {
	async.waterfall([
	  function(done) {
		User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
		  if (!user) {
			req.flash('error', 'Password reset token is invalid or has expired.');
			return res.redirect('back');
		  }
		  if(req.body.newPswrd === req.body.confirmPswrd) {
			user.setPassword(req.body.newPswrd, function(err) {
			  user.resetPasswordToken = undefined;
			  user.resetPasswordExpires = undefined;
  
			  user.save(function(err) {
				req.logIn(user, function(err) {
				  done(err, user);
				});
			  });
			})
		  } else {
			  req.flash("error", "Passwords do not match.");
			  return res.redirect("back");
		  }
		});
	  },
	  function(user, done) {
		var smtpTransport = nodemailer.createTransport({
		  service: 'Gmail', 
		  auth: {
			user: "abhishek26127@gmail.com",
			pass: "ramprosad07"
		  }
		});
		var mailOptions = {
		  to: user.email,
		  from: "abhishek26127@gmail.com",
		  subject: "Your password has been changed",
		  text: 'Hello,\n\n' +
			'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
		};
		smtpTransport.sendMail(mailOptions, function(err) {
		  req.flash("success", "Success! Your password has been changed.");
		  done(err);
		});
	  }
	], function(err) {
	 	 res.redirect("/campgrounds");
	});
});

//USER PROFILE
router.get("/user/:id", function (req, res){
	User.findById(req.params.id, function(err, foundUser){
		if(err){
			req.flash("error", "User not found !");
			return res.redirect("/campgrounds");
		}
		Camp.find().where("author.id").equals(foundUser._id).exec(function(err, campgrounds){
			if(err){
				req.flash("error", "Something went wrong.");
				return res.redirect("/campgrounds");
			}
			res.render("users/show", {foundUser: foundUser, campgrounds: campgrounds});	
		});
	});
});

module.exports = router;
