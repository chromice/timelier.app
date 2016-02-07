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
	
	/* \\ -^_^- // */
	
	loggedOnDate: function (date) {
		var entries = this.entries.filter(function (entry) {
				return timedate(entry.get('logged_on')) === timedate(date);
			}),
			logged = _.reduce(entries, function (memo, entry) {
				return memo + entry.get('value');
			}, 0),
			started_on = this.get('started_on');
		
		if (started_on) {
			var start = new Date(started_on),
				now = new Date();
			
			logged+= Math.ceil((now.getTime() - start.getTime()) / 1000);
		}
		
		return logged;
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


// ===============
// = Collections =
// ===============

var TimerCollection = Backbone.Collection.extend({
	model: TimerModel,
	
	/* \\ -^_^- // */
	
	loggedOnDate: function (date) {
		return this.reduce(function (memo, entry) {
			return memo + entry.loggedOnDate(date);
		}, 0);
	}
}, {
	all: function () {
		return boostrapTimerCollection();
	},
});

var EntryCollection = Backbone.Collection.extend({
	model: EntryModel,
});

// ==============
// = Components =
// ==============

// ------------------
// - Main component -
// ------------------

var AppContainer = Backbone.View.extend({
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
		
		this.timers.each(function (timer) {
			if (timer.get('started_on')) {
				this.addTimerToDate(timer, timer.get('started_on'));
			}
			timer.entries.each(function (entry) {
				this.addTimerToDate(timer, entry.get('logged_on'));
			}, this);
		}, this);
		
		this.render();
	},
	
	render: function () {
		this.$el.empty()
			.append('<header>' +
				'<h1>Timer</h1>' +
				'<button>Start new</button>' +
			'</header>');
			
		_.each(this.dates, function (date) {
			this.$el.append(date.render());
		}, this);
		
		return this.$el;
	},
	
	/* \\ -^_^- // */
	
	dates: [],
	
	addTimerToDate: function (timer, date) {
		var id = TimerListView.dateID(date),
			view = _.findWhere(this.dates, {'id' : id});
		
		if (view === undefined) {
			view = new TimerListView({
				id: id,
				collection: new TimerCollection(),
			});
			
			this.dates.push(view);
			_.sortBy(this.dates, function (date) {
				return date;
			});
		}
		
		view.collection.add(timer);
	},
	
	/* \\ -^_^- // */
	
	startNewTimer: function (e) {
		// TODO: Disable function for a second to prevent accidental double entry.
		
		this.timers.add({});
		
		console.log(this.timers);
	},
});

var TimerListView = Backbone.View.extend({
	tagName: 'section',
	
	initialize: function() {
		this.date = new Date(this.id.substr(1));
	},
	
	render: function () {
		var logged = this.collection.loggedOnDate(this.date);
		
		this.$el.empty()
			.append('<header>' +
				'<h2><time datetime="' + this.timedate() + '">' + this.day() + '</time></h2>' +
				'<p><time datetime="' + duration(logged, true) + '">' + duration(logged) + '</time> logged</p>' +
			'</header>');
			
		this.collection.each(function (timer) {
			var view = new TimerItemView({
				model: timer,
				className: this.id,
			});
			this.$el.append(view.render());
		}, this);
		
		return this.$el;
	},
	
	/* \\ -^_^- // */
	
	timedate: function () {
		return timedate(this.date);
	},
	
	day: function () {
		var today = new Date(),
			yesterday = new Date();
			
		yesterday.setDate(today.getDate() - 1);
		
		if (timedate(today) === this.timedate()) {
			return 'Today';
		} else if (timedate(yesterday) === this.timedate()) {
			return 'Yesterday';
		}
		
		// FIXME: Pretty date
		return this.date + '';
	}
}, {
	dateID: function (date) {
		return 'd' + timedate(date);
	},
});

var CalendarDateLabel = Backbone.View.extend({
	tagName: 'time',
});

var TimerItemView = Backbone.View.extend({
	tagName: 'article',
	
	initialize: function () {
		this.date = new Date(this.className.substr(1));
	},
	
	render: function () {
		var logged = this.model.loggedOnDate(this.date);
		
		return this.$el.html(
			'<h3>' + this.model.get('description') + '</h3>' +
			'<time datetime="' + duration(logged, true) + '">' + duration(logged) + 'logged</time>' +
			'<button>Start</button>'
		);
	}
});

var TimerStartButton = Backbone.View.extend({
	tagName: 'button',
	
	initialize: function () {
		// this.model.
	},
});

var TimerDescriptionLabel = Backbone.View.extend({
	tagName: 'h3',
});

var TimerValueLabel = Backbone.View.extend({
	tagName: 'time',
	
	initialize: function () {
		// this.model || this.collection
	},
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


// ========================
// = Application (router) =
// ========================

var Application = Backbone.Router.extend({
	routes: {
		'': 'main',
		'description/:id': 'description',
		'time/:id/:date': 'time',
	},
	
	initialize: function () {
		this.application = new AppContainer({
			router: this,
		});
	},
	
	/* \\ -^_^- // */
	
	main: function () {
		console.log('List all timers');
		
		this.application.showCalendar();
	},
	
	description: function (id) {
		console.log('Edit details for timer #' + id);
		
		this.application.showDescripion(id);
	},
	
	time: function (id, date) {
		console.log('Change logged time for timer #' + id);
		
		this.application.showTime(id, date);
	},
});


// ========
// = Main =
// ========

$(function () {
	// Create application
	var app = new Application();
	
	// Knock sync out
	Backbone.sync = noSync;
	
	// Start application
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

function timedate(date) {
	date = _.isDate(date) ? date : new Date(date);
	return date.getFullYear() + '-' + pad(date.getMonth() + 1, 2) + '-' + pad(date.getDate(), 2);
}

function duration(seconds, machine) {
	var minutes = Math.floor(seconds / 60),
		hours = Math.floor(minutes / 60);
	
	if (machine) {
		return 'PT' + hours + 'H' + (minutes % 60) + 'M';
	}
	
	return hours + ':' + pad(minutes % 60, 2);
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
					'logged_on': '2016-02-06T22:15:00.000Z',
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