// ==========
// = Models =
// ==========

var TimerModel = Backbone.Model.extend({
	defaults: function () {
		var now = new Date();
		
		return {
			'created_on': now.toISOString(),
			'started_on': false,
			'description': false,
		};
	},
	
	constructor: function(attributes) {
		if (attributes && attributes.entries) {
			this.entries = new EntryCollection(attributes.entries);
			delete attributes.entries;
		} else {
			this.entries = new EntryCollection(null);
		}
		
		Backbone.Model.apply(this, arguments);
	},
	
	// -------------- //
	
	toggle: function () {
		var started = this.get('started_on');
		
		if (started) {
			this._pause();
		} else {
			this._start();
		}
	},
	
	_pause: function () {
		var now = new Date(),
			start = new Date(this.get('started_on'));
			
		this.entries.add({
			value: Math.ceil((now.getTime() - start.getTime()) / 1000)
		});
		
		this.set('started_on', false);
	},
	
	_start: function () {
		var now = new Date();
		
		this.set('started_on', now.toISOString());
	},
	
	// -------------- //
	
	loggedOnDate: function (date) {
		var entries = this.entries.filter(function (entry) {
				return datetime(entry.get('logged_on')) === datetime(date);
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
	
	// -------------- //
	
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
		this.$el.empty()
			.append(this.calendar.render().$el)
			.append(this.description.render().$el)
			.append(this.time.render().$el);
		
		return this;
	},
	
	// -------------- //
	
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
		'click #start-new': 'startNewTimer',
	},
	
	initialize: function () {
		this.collection = TimerCollection.all();
		
		this.collection.each(function (timer) {
			if (timer.get('started_on')) {
				this.addTimerToDate(timer, timer.get('started_on'));
			}
			timer.entries.each(function (entry) {
				this.addTimerToDate(timer, entry.get('logged_on'));
			}, this);
		}, this);
		
		this.listenTo(this.collection, 'add', this._onTimerAdded);
		this.listenTo(this.collection, 'change:started_on', this._onTimerToggled);
	},
	
	render: function () {
		this.$el.empty()
			.append('<header>' +
				'<h1>Timer</h1>' +
				'<button id="start-new">Start new</button>' +
			'</header>');
			
		_.each(this.dates, function (date) {
			this.$el.append(date.render().$el);
		}, this);
		
		return this;
	},
	
	// -------------- //
	
	dates: [],
	
	addTimerToDate: function (timer, date) {
		var id = TimerListView.dateToId(date),
			view = _.findWhere(this.dates, {'id' : id});
		
		if (view === undefined) {
			view = new TimerListView({
				id: id,
				date: date,
				collection: new TimerCollection(),
			});
			
			this.dates.push(view);
			
			_.sortBy(this.dates, function (view) {
				return view.date.getTime();
			});
		}
		
		view.collection.add(timer);
	},
	_onTimerAdded: function (timer) {
		var date = timer.get('started_on') || timer.get('created_on');
		
		this.addTimerToDate(timer, date);
		this.render();
	},
	
	// -------------- //
	
	startNewTimer: function (e) {
		// TODO: Disable function for a second to prevent accidental double entry.
		var timer = new TimerModel({});
		
		this.collection.add(timer);
		
		timer.toggle();
	},
	_onTimerToggled: function (_, started_on) {
		// Active timer paused?
		if (!started_on) {
			return;
		}
		
		// Find other active timer and pause it
		var timer = this.collection.find(function (timer) {
			var _started_on = timer.get('started_on');
			
			return _started_on !== false && _started_on !== started_on;
		});
		
		if (timer) {
			timer.toggle();
		}
	},
});

var DateSpecificView = Backbone.View.extend({
	initialize: function(options) {
		this.date = _.isDate(options.date) ? options.date : new Date(options.date);
	},
});

var TimerListView = DateSpecificView.extend({
	tagName: 'section',
	
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		this.dateLabel = new CalendarDateLabel({date: this.date});
		this.totalLogged = new TimerValueLabel({date: this.date, collection: this.collection});
		this.timers = [];
	},
	
	render: function () {
		this.$el.empty();
		
		var label = $('<h2>').appendTo(this.$el),
			logged = $('<p> logged</p>').appendTo(this.$el);
			
		label.prepend(this.dateLabel.render().$el);
		logged.prepend(this.totalLogged.render().$el);
		
		this.$el.wrapAll('<header>');
		
		this.collection.each(function (timer) {
			var view = new TimerItemView({date: this.date, model: timer});
			
			this.timers.push(view);
			this.$el.append(view.render().$el);
		}, this);
		
		return this;
	},
	
},{ // -------------- //
	
	idPrefix: 'd-',
	
	dateToId: function (date) {
		return this.idPrefix + datetime(date);
	},
	
	idToDate: function (id) {
		return id ? new Date(id.substr(this.idPrefix.length)) : new Date();
	},
});

var CalendarDateLabel = DateSpecificView.extend({
	tagName: 'time',
	
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		Clock.on('tick:date', this.render, this);
	},
	
	render: function () {
		this.$el
			.attr('datetime', this.datetime())
			.text(this.label());
		
		return this;
	},
	
	// -------------- //
	
	datetime: function () {
		return datetime(this.date);
	},
	
	label: function () {
		var today = new Date(),
			yesterday = new Date();
		
		yesterday.setDate(today.getDate() - 1);
	
		if (datetime(today) === this.datetime()) {
			return 'Today';
		} else if (datetime(yesterday) === this.datetime()) {
			return 'Yesterday';
		}
	
		// FIXME: Prettify the date!
		return this.date + '';
	},
});

var TimerItemView = DateSpecificView.extend({
	tagName: 'article',
	
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		this.description = new TimerDescriptionLabel({tagName: 'h3', date: this.date, model: this.model});
		this.logged = new TimerValueLabel({date: this.date, model: this.model});
		this.button = new TimerStartButton({date: this.date, model: this.model});
	},
	
	render: function () {
		
		this.$el.empty()
			.append(this.description.render().$el);
		
		var logged = $('<p> logged</p>').appendTo(this.$el);
		logged.prepend(this.logged.render().$el);
		
		this.$el.append(this.button.render().$el);
		
		return this;
	}
});

var TimerStartButton = DateSpecificView.extend({
	tagName: 'button',
	events: {
		'click': 'toggle'
	},
	
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		this.listenTo(this.model, 'change:started_on', this.render);
	},
	
	render: function () {
		this.$el.text(this.model.get('started_on') ? 'Pause' : 'Start');
		
		return this;
	},
	
	// -------------- //
	toggle: function (e) {
		this.model.toggle();
	},
});

var TimerDescriptionLabel = Backbone.View.extend({
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		this.listenTo(this.model, 'change:description', this.render);
	},

	render: function () {
		var description = this.model.get('description');
		
		if (description) {
			this.$el.text(description);
		} else {
			var created = new Date(this.model.get('created_on'));
			this.$el.html('<em>New timer started at ' + created.getHours() + ':' + pad(created.getMinutes(), 2) + '</em>');
		}
		
		return this;
	},
});

var TimerValueLabel = DateSpecificView.extend({
	tagName: 'time',
	
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		Clock.on('tick:second', this.render, this);
	},
	
	render: function () {
		var logged = 0;
		
		if (this.model) {
			logged = this.model.loggedOnDate(this.date);
		} else if (this.collection) {
			logged = this.collection.loggedOnDate(this.date);
		} else {
			return;
		}
		
		this.$el
			.attr('datetime', this._duration(logged, true))
			.text(this._duration(logged));
		
		return this;
	},
	
	// -------------- //
	
	_duration: function (seconds, machine) {
		var minutes = Math.floor(seconds / 60),
			hours = Math.floor(minutes / 60);
	
		if (machine) {
			return 'PT' + hours + 'H' + (minutes % 60) + 'M' + (seconds % 60) + 'S';
		}
	
		return hours + ':' + pad(minutes % 60, 2) + ':' + pad(seconds % 60, 2);
	}
});


// --------------------------
// - Description components -
// --------------------------

var DescriptionPane = Backbone.View.extend({
	id: 'description',
	tagName: 'aside',
	
	render: function () {
		this.$el.empty();
		
		return this;
	},
});


// -------------------
// - Time components -
// -------------------

var TimePane = Backbone.View.extend({
	id: 'timer',
	tagName: 'aside',
	
	render: function () {
		this.$el.empty();
		
		return this;
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
	
	// -------------- //
	
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

// ---------
// - Clock -
// ---------

var Clock = {};

_.extend(Clock, Backbone.Events);

setInterval(_.bind(function () {
	var now = new Date();
	
	if (this.second != now.getSeconds()) {
		this.second = now.getSeconds();
		this.trigger('tick tick:second');
	}
	
	if (this.date != now.getDate()) {
		this.date = now.getDate();
		this.trigger('tick tick:date');
	}
}, Clock), 100);


// ---------------------
// - Utility functions -
// ---------------------

function pad(n, width, z) {
	z = z || '0';
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function datetime(date) {
	date = _.isDate(date) ? date : new Date(date);
	return date.getFullYear() + '-' + pad(date.getMonth() + 1, 2) + '-' + pad(date.getDate(), 2);
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
			'description': 'Playing video games',
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