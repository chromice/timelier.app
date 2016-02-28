// -----------------------
// - Configuration time! -
// -----------------------

var 
	scripts = [
		'zepto.js',
		'underscore.js',
		'backbone.js',
		'backbone.localStorage.js',
		'main.js'
	],

	destination_dir = '../public/',
	asset_root = '/assets/compiled',

	src_dir = './';

// ==================
// = Kickass, baby! =
// ==================

// General plugins
var gulp = require('gulp');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var livereload = require('gulp-livereload');

// JS plugins 
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');

// CSS plugins
var less = require('gulp-less')
var autoprefixer = require('gulp-autoprefixer');

// Gulp should build and test by default
gulp.task('default', ['build', 'test']);

// Error handling
var plumber = require('gulp-plumber');
var gutil = require('gulp-util');
var notifier = require('node-notifier');
var open = require('open');

var gulp_src = gulp.src;
gulp.src = function() {
	return gulp_src.apply(gulp, arguments)
		.pipe(plumber(function(error) {
			if (error.plugin === 'gulp-jshint') {
				notifier.notify({
					'title': error.plugin + ' failed',
					'message': 'Open terminal to learn more.',
					'sound': true
				});
				
				this.emit('end');
				
				return;
			}
			
			var message = error.message;
			
			if (offset = error.fileName.indexOf(src_dir.substr(1))) {
				message = message.replace(error.fileName.substr(0, offset), '.');
			}
			
			notifier.on('click', function (notifierObject, options) {
				open('txmt://open?url=file://' + error.fileName + '&line=' + error.lineNumber);
			}).notify({
				'title': error.plugin + ' failed',
				'message': message,
				'sound': true,
				'wait': true
			});
			
			gutil.log(gutil.colors.red(error.plugin + ' failed: ') + message);
			
			this.emit('end');
		}));
};

// ============
// = Building =
// ============

gulp.task('build', ['build']);

gulp.task('build:styles', function () {
	return gulp.src(src_dir + 'styles/main.less')
		.pipe(sourcemaps.init())
		.pipe(less({
			strictMath: true,
			strictUnits: true,
		}))
		.pipe(autoprefixer({
			browsers: ['last 2 versions', 'Explorer >= 8'],
			cascade: false
		}))
		.pipe(rename('styles.css'))
		.pipe(sourcemaps.write('./', {
			sourceMappingURLPrefix: asset_root
		}))
		.pipe(gulp.dest(destination_dir))
		.pipe(livereload());
});
gulp.task('lint:scripts', function() {
	return gulp.src([
			src_dir + 'scripts/main.js',
		])
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		.pipe(jshint.reporter('fail'));
});
gulp.task('build:scripts', ['lint:scripts'], function () {
	var script_paths = [];
	
	for (var i = scripts.length - 1; i >= 0; i--) {
		script_paths[i] = src_dir + 'scripts/' + scripts[i];
	}
	
	return gulp.src(script_paths)
		.pipe(sourcemaps.init())
		.pipe(concat('scripts.js'))
		// .pipe(gulp.dest(destination_dir))
		.pipe(uglify())
		.pipe(rename('scripts.js'))
		.pipe(sourcemaps.write('./', {
			sourceMappingURLPrefix: asset_root
		}))
		.pipe(gulp.dest(destination_dir));
});
gulp.task('build', ['build:styles', 'build:scripts']);


// ============
// = Watching =
// ============

gulp.task('watch', function() {
	livereload.listen({quiet: true});
	
	gulp.watch('gulpfile.js', ['build']);
	gulp.watch([
		src_dir + 'styles/*.less',
		// src_dir + 'styles/!(main).css',
	], ['build:styles']);
	gulp.watch(src_dir + 'scripts/*.js', ['build:scripts']);
});
