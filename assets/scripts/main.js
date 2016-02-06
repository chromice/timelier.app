// ==========
// = Models =
// ==========

var TimerModel = Backbone.Model.extend({
	defaults: function () {
		var now = new Date();
		
		return {
			'started_on': now.toISOString(),
			'description': ''
		};
	},
	
	constructor: function(attributes) {
		this.entries = new EntryCollection(attributes.entries || null);
		
		delete attributes.entries;
		
		Backbone.Model.apply(this, arguments);
	},
});

var EntryModel = Backbone.Model.extend({
	defaults: function () {
		var now = new Date();
		
		return {
			'logged_on': now.toISOString(),
			'manually': false,
			'value': 0,
		};
	},
});

var DateModel = Backbone.Model.extend({
	constructor: function(attributes) {
		// Make sure id is a date string
		var date = attributes.id || new Date();
		attributes.id = pad(date.getFullYear(), 4) + '-' + pad(date.getMonth(), 2) + '-' + pad(date.getDate(), 2);
		
		this.entries = new EntryCollection();
		
		Backbone.Model.apply(this, arguments);
	},
	sync: noSync,
});

// ===============
// = Collections =
// ===============

var TimerCollection = Backbone.Collection.extend({
	model: TimerModel,
}, {
	all: function () {
		return boostrapTimerCollection();
	},
});

var EntryCollection = Backbone.Collection.extend({
	model: EntryModel,
});

var DateCollection = Backbone.Collection.extend({
	model: DateModel,
	sync: noSync,
});

// ==============
// = Components =
// ==============

// ------------------
// - Main component -
// ------------------

var AppComponent = Backbone.View.extend({
	el: 'body',
	
	initialize: function (options) {
		this.router = options.router;
		
		this.calendar = new CalendarPane();
		this.description = new DescriptionPane();
		this.time = new TimePane();
		
		this.render();
	},
	
	render: function () {
		return this.$el.empty()
			.append(this.calendar.render())
			.append(this.description.render())
			.append(this.time.render());
	},
	
	/* \\ -^_^- // */
	
	showCalendar: function () {
		
	},
	
	showDescripion: function (id) {
		
	},
	
	showTime: function (id, date) {
		
	},
});


// -----------------------
// - Calendar components -
// -----------------------

var CalendarPane = Backbone.View.extend({
	id: 'main',
	tagName: 'main',
	events: {
		'click button': 'startNewTimer',
	},
	
	initialize: function () {
		this.timers = TimerCollection.all();
		console.log(this.timers);
		
		this.calendar = new DateCollection();
	},
	
	render: function () {
		this.$el.empty()
			.append('<header>' +
				'<h1>Timer</h1>' +
				'<button>Start new</button>' +
			'</header>');
		
		return this.$el;
	},
	
	/* \\ -^_^- // */
	
	startNewTimer: function (e) {
		// TODO: Disable function for a second to prevent accidental double entry.
		
		this.timers.add({});
		
		console.log(this.timers);
	},
});

var CalendarDateView = Backbone.View.extend({
	tagName: 'section',
});

var TimerView = Backbone.View.extend({
	tagName: 'article',
});


// --------------------------
// - Description components -
// --------------------------

var DescriptionPane = Backbone.View.extend({
	id: 'description',
	tagName: 'aside',
	
	render: function () {
		return this.$el.empty();
	},
});

// -------------------
// - Time components -
// -------------------

var TimePane = Backbone.View.extend({
	id: 'timer',
	tagName: 'aside',
	
	render: function () {
		return this.$el.empty();
	},
});



// ==========
// = Router =
// ==========

var Router = Backbone.Router.extend({
	routes: {
		'': 'main',
		'description/:id': 'description',
		'time/:id/:date': 'time',
	},
	
	initialize: function () {
		this.app = new AppComponent({
			router: this,
		});
	},
	
	main: function () {
		console.log('List all timers');
		
		this.app.showCalendar();
	},
	
	description: function (id) {
		console.log('Edit details for timer #' + id);
		
		this.app.showDescripion(id);
	},
	
	time: function (id, date) {
		console.log('Change logged time for timer #' + id);
		
		this.app.showTime(id, date);
	},
});


// ========
// = Main =
// ========

// Punch sync out
Backbone.sync = noSync;

// Start application
$(function () {
	var app = new Router();

	Backbone.history.start();
});


// ===========
// = Helpers =
// ===========

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function noSync(method, model, options) {
	var id = model.id || Math.floor(Math.random() * 100000);
	options.success({id: id}, 'status', {});
}

function boostrapTimerCollection () {
	
	// Bootstap us some data
	var timers = new TimerCollection();

	// Calculate active timer
	var now = new Date();

	now.setHours(now.getHours() - 1);
	now.setMinutes(now.getMinutes() - 15);

	timers.reset([
		{
			'started_on': now.toISOString(),
			'description': 'Working on presentation for Project X',
			'entries': [],
		},
		{
			'started_on': false,
			'description': 'Walking the dog',
			'entries': [
				{
					'logged_on': '2016-02-06T14:17:19.616Z',
					'manually': false,
					'value': 54 * 60,
				},
				{
					'logged_on': '2016-02-05T14:40:00.616Z',
					'manually': false,
					'value': 80 * 60,
				},
			
			],
		},
		{
			'started_on': false,
			'description': 'Playing videogames',
			'entries': [
				{
					'logged_on': '2016-02-06T02:20:00.616Z',
					'manually': false,
					'value': 70 * 60,
				},
				{
					'logged_on': '2016-02-06T02:20:00.616Z',
					'manually': false,
					'value': 130 * 60,
				},
				{
					'logged_on': '2016-02-05T18:20:00.000Z',
					'manually': true,
					'value': -20 * 60,
				},
				{
					'logged_on': '2016-02-05T18:40:00.616Z',
					'manually': false,
					'value': 155 * 60,
				},
			],
		},
		{
			'started_on': false,
			'description': 'Making music',
			'entries': [
				{
					'logged_on': '2016-02-05T22:15:00.000Z',
					'manually': true,
					'value': 31 * 60,
				},
			],
		},
		{
			'started_on': false,
			'description': 'Designing this app',
			'entries': [
				{
					'logged_on': '2016-02-05T15:15:00.000Z',
					'manually': false,
					'value': 55 * 60,
				},
				{
					'logged_on': '2016-02-05T13:22:00.000Z',
					'manually': false,
					'value': 200 * 60,
				},
			],
		},
	]);
	
	return timers;
}