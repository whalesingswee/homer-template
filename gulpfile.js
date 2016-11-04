/**
 * REQUIREMENTS
 */

/** basic **/
var gulp            = require('gulp');
var runSequence     = require('run-sequence');
var env             = require('gulp-env');
var browserSync     = require('browser-sync');

/** postcss **/
var postcss         = require('gulp-postcss');
var partial_import = require("postcss-partial-import");
var cssnext = require('postcss-cssnext');
var lost            = require('lost');

/** utils **/
var sourcemaps      = require('gulp-sourcemaps');
var plumber         = require('gulp-plumber');
var gutil           = require('gulp-util');
var cssnano         = require('gulp-cssnano');
var concat          = require('gulp-concat');
var uglify          = require('gulp-uglify');
var rename          = require('gulp-rename');
var del             = require('del');
var inject          = require('gulp-inject');
var foreach         = require('gulp-foreach');
var sort            = require('gulp-sort');

/** jade **/
var pug = require('gulp-pug');
var path            = require('path');
var fs              = require('fs');

/**
 * SETTINGS
 */

var reload = browserSync.reload;

var onError = function(error) {
	gutil.beep();
	gutil.log(gutil.colors.red('Error [' + error.plugin + ']: ' + error.message));
	this.emit('end');
};

var basePath = {
	src: 'src/',
	dest: 'assets/',
	views: 'views/'
};

var src  = {
	img  : basePath.src + 'img/',
	libs : basePath.src + 'js/libs/',
	js   : basePath.src + 'js/',
	css  : basePath.src + 'postcss/'
}

var dest = {
	img  : basePath.dest + 'img/',
	js   : basePath.dest + 'js/',
	css  : basePath.dest + 'css/'
}

env({
	file: ".env.json"
});

/**
 * SUB TASKS
 */

gulp.task('clean', function() {
	del(dest.css);
});

gulp.task('browser-sync', function() {
	browserSync.init({
		server: {
      baseDir: "./"
    },
		port: process.env.PORT,
		open: false
	});

	gulp.watch(src.css + '{,**/}*.pcss', ['make:postcss']);
	gulp.watch(src.js + '{,**/}*.js', ['make:scripts']);
	gulp.watch(basePath.views + '{,**/}*.pug', ['make:html']);
	gulp.watch('./*.html').on('change', reload);
});

gulp.task('views', function () {
  return gulp.src(basePath.views + '*.pug')
  .pipe(pug({
  	pretty: true
  }))
  .pipe(gulp.dest('./'));
});

gulp.task('make:css_import', function() {
	return gulp.src(src.css + '_*.pcss')
		.pipe(foreach(function(stream, file) {
			var text = file.relative.replace(/^_(.+)\.pcss$/, '$1')
			return stream
				.pipe(inject(gulp.src(src.css + text +'/**/_*.pcss', {read: false}).pipe(sort()), {
					relative: true,
					starttag: '/* inject:pcss */',
		            endtag: '/* endinject */',
					transform: function(filepath, file) {
						return '@import "' + filepath + '";';
					}
				}))
				.pipe(gulp.dest(src.css));
		}))
});

gulp.task('make:postcss', ['make:css_import'], function() {
	var plugins = [
		partial_import({
			extension: '.pcss'
		}),
    cssnext({
      autoprefixer: {
        browsers: ['IE >= 9']
      }
    })
	];
	return gulp.src([src.css + 'style.css'])
		.pipe(plumber({
			errorHandler: onError
		}))
		.pipe(sourcemaps.init())
		.pipe(postcss(plugins))
		.pipe(sourcemaps.write())
		.pipe(rename({extname: '.css'}))
		.pipe(gulp.dest(dest.css))
		.pipe(browserSync.stream());
});

gulp.task('make:plugins', function() {
	return gulp.src([
		src.libs + 'jquery-2.1.4.min/*.js',
		src.libs + '**/*.js'
	])
	.pipe(concat('plugins.concat.js'))
	.pipe(gulp.dest(src.js));
});

gulp.task('make:scripts', ['make:plugins'], function() {
	return gulp.src([
		src.js + 'plugins.concat.js',
		src.js + 'order/init.js',
		src.js + 'order/matchmedia.js',
		src.js + 'global/*',
		src.js + 'main/*'
	])
	.pipe(plumber({
		errorHandler: onError
	}))
	.pipe(concat('main.js'))
	.pipe(gulp.dest(dest.js))
	.pipe(browserSync.stream());
});

gulp.task('minify', function() {
	gulp.src(dest.css + '*.css').pipe(cssnano()).pipe(gulp.dest(dest.css))
	gulp.src(dest.js + '*.js').pipe(uglify()).pipe(gulp.dest(dest.js))
});

/**
 * MAIN TASKS
 */

gulp.task('compile', ['make:postcss', 'make:scripts']);

gulp.task('default', function() {
	runSequence('clean', 'compile', 'browser-sync');
});

gulp.task('build', function() {
	runSequence('clean', 'compile', 'minify');
});