// ==========
// = Models =
// ==========

var TimerModel = Backbone.Model.extend({
	defaults: function () {
		return {
			'created_on': Clock.now.toISOString(),
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
	
	initialize: function (attributes) {
		if (this.id) {
			this.entries.url = 'entries/' + this.id;
			this.entries.localStorage = new Backbone.LocalStorage('timer_entries_' + this.id);
			this.entries.fetch();
		} else {
			this.once('sync', function (timer) {
				this.entries.url = 'entries/' + this.id;
				this.entries.localStorage = new Backbone.LocalStorage('timer_entries_' + this.id);
			}, this);
		}
		
		this.entries.on('add', function () {
			this.trigger('enter');
		}, this);
		
		this.on('destroy', function () {
			this.entries.each(function (entry) {
				if (entry) entry.destroy();
			});
		}, this);
	},
	
	// -------------- //
	
	enter: function (value, date) {
		date = date || Clock.now;
		
		if (value === 0) {
			if (this.loggedTotal() === this.loggedOnDate(date)) {
				this.destroy();
				return;
			} else {
				this.trigger('enter:zero', date);
			}
		}
		
		this.entries.create({
			logged_on: date.toISOString(),
			manually: true,
			value: value - this.loggedOnDate(date),
		});
	},
	
	toggle: function () {
		var started = this.get('started_on');
		
		if (started) {
			this._pause();
		} else {
			this._start();
		}
		
		this.save();
	},
	
	_pause: function () {
		var start = new Date(this.get('started_on'));
			
		this.set('started_on', false);
		
		this.entries.create({
			value: Math.ceil((Clock.now.getTime() - start.getTime()) / 1000)
		});
		
		this.trigger('enter');
	},
	
	_start: function () {
		this.set('started_on', Clock.now.toISOString());
	},
	
	// -------------- //
	
	loggedOnDate: function (date) {
		var day = new Date(date),
			entries = this.entries.filter(function (entry) {
				return datetime(entry.get('logged_on')) === datetime(date);
			}),
			entered = _.reduce(entries, function (memo, entry) {
				return memo + entry.get('value');
			}, 0),
			started = this.get('started_on');
		
		if (started && day.isToday()) {
			var start = new Date(started);
			
			entered+= Math.ceil((Clock.now.getTime() - start.getTime()) / 1000);
		}
		
		return entered;
	},
	
	loggedTotal: function () {
		var entered = this.entries.reduce(function (memo, entry) {
				return memo + entry.get('value');
			}, 0),
			started = this.get('started_on');
		
		if (started) {
			var start = new Date(started);
			
			entered+= Math.ceil((Clock.now.getTime() - start.getTime()) / 1000);
		}
		
		return entered;
	},
});

var EntryModel = Backbone.Model.extend({
	defaults: function () {
		return {
			'logged_on': Clock.now.toISOString(),
			'manually': false,
			'value': 0,
		};
	},
});


// ===============
// = Collections =
// ===============

var TimerCollection = Backbone.Collection.extend({
	url: '/timers',
	localStorage: new Backbone.LocalStorage('timers'),
	
	model: TimerModel,
	comparator: function (timer) {
		var started = timer.get('started_on'),
			created = timer.get('created_on');
			
		var last_entry = timer.entries.first();
			logged = last_entry ? last_entry.get('logged_on') : false;
		
		return _.max(_.map([started, logged, created], function (ts) {
			var time = new Date(ts);
			return time.getTime();
		})) * -1;
	},
	
	// -------------- //
	
	loggedOnDate: function (date) {
		return this.reduce(function (memo, entry) {
			return memo + entry.loggedOnDate(date);
		}, 0);
	}
}, {
	all: function () {
		if (true) {
			var timers = new TimerCollection();
			
			timers.fetch();
			
			return timers;
		} else {
			return boostrapTimerCollection();
		}
	},
});

var EntryCollection = Backbone.Collection.extend({
	url: '/entries',
	model: EntryModel,
	comparator: function (entry) {
		var logged_on = new Date(entry.get('logged_on'));
		return logged_on.getTime() * -1;
	}
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
		// this.description = new DescriptionPane();
		// this.time = new TimePane();
		
		this.render();
	},
	
	render: function () {
		this.$el.empty()
			.append(this.calendar.render().$el);
			// .append(this.description.render().$el)
			// .append(this.time.render().$el);
		
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
				'<h1>Timers</h1>' +
				'<button id="start-new">Start new timer</button>' +
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
			
			this.dates = _.sortBy(this.dates, function (view) {
				return view.date.getTime() * -1;
			});
			
			this.render();
		}
		
		view.collection.add(timer);
	},
	_onTimerAdded: function (timer) {
		var date = timer.get('started_on') || timer.get('created_on');
		
		this.addTimerToDate(timer, date);
	},
	
	// -------------- //
	
	startNewTimer: function (e) {
		// TODO: Disable function for a second to prevent accidental double entry.
		// TODO: Focus the description field to let user enter what they do.
		var timer = new TimerModel({});
		
		this.collection.add(timer);
		
		timer.toggle();
	},
	_onTimerToggled: function (timer, started_on) {
		// Active timer paused?
		if (!started_on) {
			return;
		}
		
		// Make sure new timer is in today's view
		this.addTimerToDate(timer, started_on);
		
		// Find other active timer and pause it
		var previous = this.collection.find(function (timer) {
			var _started_on = timer.get('started_on');
			
			return _started_on !== false && _started_on !== started_on;
		});
		
		if (previous) {
			previous.toggle();
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
		
		this.listenTo(this.collection, 'add', this.render);
		this.listenTo(this.collection, 'remove', this.render);
	},
	
	render: function () {
		this.$el.empty();
		
		if (this.collection.length === 0) {
			return this;
		}
		
		var label = $('<h2>').appendTo(this.$el),
			logged = $('<p> <span class="w">logged</span></p>').appendTo(this.$el);
			
		label.prepend(this.dateLabel.render().$el);
		logged.prepend(this.totalLogged.render().$el);
		
		this.$el.prepend($('<header>').append(label).append(logged));
		
		this.collection.each(function (timer) {
			var view = new TimerItemView({date: this.date, model: timer});
			
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
		
		Clock.on('tick:day', this.render, this);
	},
	
	render: function () {
		this.$el
			.attr('datetime', this.date.getMachineDate())
			.html(this.label());
		
		return this;
	},
	
	// -------------- //
	
	label: function () {
		var dayToday = Math.floor(Clock.now.getTime() / 86400 / 1000),
			dayThen = Math.floor(this.date.getTime() / 86400 / 1000);
			daysAgo = dayToday - dayThen;
	
		if (daysAgo === 0) {
			return 'Today';
		} else if (daysAgo === 1) {
			return 'Yesterday';
		} else if ((Clock.now.getProperDay() - daysAgo) >= 0) {
			return this.date.getDayName();
		} else if ((Clock.now.getProperDay() - daysAgo) >= -7) {
			return 'Last ' + this.date.getDayName();
		}
		
		return this.date.getShortHumanDate();
	},
});

var TimerItemView = DateSpecificView.extend({
	tagName: 'article',
	
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		this.description = new TimerDescriptionLabel({tagName: 'h3', model: this.model});
		this.logged = new TimerValueLabel({date: this.date, model: this.model});
		this.button = new TimerStartButton({date: this.date, model: this.model});
		
		this.listenTo(this.model, 'change:started_on', function (timer, started) {
			this.$el.toggleClass('active', !!started && this.date.isToday());
		});
	},
	
	render: function () {
		
		this.$el.empty()
			.toggleClass('active', !!this.model.get('started_on') && this.date.isToday())
			.append(this.description.render().$el);
			
		var logged = $('<p> <span class="w">logged</span></p>').appendTo(this.$el);
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
		
		Clock.on('tick:day', this.render, this);
		this.listenTo(this.model, 'change:started_on', this.render);
	},
	
	render: function () {
		var label, className;
		
		if (!this.date.isToday()) {
			label = 'Start today';
			className = 'inactive';
		} else if (this.model.get('started_on')) {
			label = 'Pause';
			className = 'started';
		} else {
			label = 'Start';
			className = 'paused';
		}
		
		this.$el.text(label).attr('class', className);
		
		return this;
	},
	
	// -------------- //
	
	toggle: function (e) {
		this.model.toggle();
	},
});

var TimerDescriptionLabel = Backbone.View.extend({
	events: {
		'click': 'edit'
	},
	
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
			this.$el.text('New timer started at ' + created.getHours() + ':' + created.getMinutes().pad(2));
		}
		
		this.$el.toggleClass('empty', !description);
		
		return this;
	},
	
	// -------------- //
	
	edit: function (e) {
		var input = new TextInputField({
				input: 'textarea',
				value: this.model.get('description'),
				label: 'Timer description', 
				placeholder: 'What have you been up to?',
			});
		
		this.$el.addClass('hidden');
		
		input
			.on('enter', function (value) {
				this.model.set('description', value).save();
			}, this)
			.on('change', function (value) {
				this.model.set('description', value);
			}, this)
			.on('blur', function () {
				this.$el.removeClass('hidden');
				input.remove();
			}, this)
			.render().$el.insertAfter(this.$el);
		
		input.focus();
	},
});

var TextInputField = Backbone.View.extend({
	tagName: 'div',
	events: {
		'blur textarea, input': 'blur',
		'change textarea, input': 'change',
		'keyup textarea, input': 'change',
		'keydown textarea, input': 'keydown',
	},
	
	initialize: function (options) {
		this.input = options.input === 'input' ? 'input' : 'textarea';
		this.value = options.value || '';
		this.label = options.label || '';
		this.placeholder = options.placeholder || '';
	},
	
	render: function () {
		var field_id = _.uniqueId('input'),
			label = $('<label>').text(this.label).attr({
				'for': field_id,
			}),
			input = $('<' + this.input + '>').val(this.value).attr({
				'id': field_id,
				'placeholder': this.placeholder,
				'type': 'text',
				'autocomplete': 'off',
			});
			
		this.$el.empty()
			.append(label)
			.append(input);
		
		input.on('focus', function () { this.select(); });
		
		return this;
	},
	
	change: function (e) {
		this.trigger('change', $(e.target).val());
	},
	
	keydown: function (e) {
		var $target = $(e.target);
		
		if (e.keyCode == 27) {
			$target.val(this.value);
			this.change(e);
			$target.blur();
		} else if (e.keyCode == 13) {
			this.trigger('enter', $target.val());
			$target.blur();
		}
	},
	
	focus: function () {
		this.$el.find(this.input).focus();
	},
	
	blur: function () {
		this.trigger('blur');
	},
});

var TimerValueLabel = DateSpecificView.extend({
	tagName: 'time',
	events: {
		'click': 'edit',
	},
	
	initialize: function () {
		DateSpecificView.prototype.initialize.apply(this, arguments);
		
		if (this.date.isToday()) {
			Clock.on('tick:second', this.render, this);
		}
		
		if (this.model) {
			this.model.on('enter', this.render, this);
		} else {
			this.collection.on('enter', this.render, this);
		}
	},
	
	render: function () {
		var logged = 0;
		
		if (this.model) {
			logged = this.model.loggedOnDate(this.date);
		} else if (this.collection) {
			logged = this.collection.loggedOnDate(this.date);
		}
		
		this.$el
			.attr('datetime', this._duration(logged, true))
			.html(this._duration(logged).replace(':', '<span>:</span>'));
		
		return this;
	},
	
	// -------------- //
	
	edit: function (e) {
		if (this.collection) {
			return;
		}
		
		var input = new TextInputField({
				input: 'input',
				value: this._duration(this.model.loggedOnDate(this.date)),
				label: 'Logged time', 
				placeholder: this._duration(0),
			});
		
		this.$el.parent().addClass('hidden');
		
		input
			.on('enter', function (value) {
				var decimal = /^(\d*)(\.\d+)?$/,
					time = /^(\d*)(?:\:(\d+))?(?:\:(\d+))?$/;
				
				value = value.trim();
				
				if (!value) {
					return;
				} else if (decimal.test(value)) {
					value = parseFloat(value) * 60 * 60;
				} else if (time.test(value)) {
					t = value.match(time);
					value = (t[3] ? parseInt(t[3], 10) : 0) + 
							(t[2] ? parseInt(t[2], 10) : 0) * 60 + 
							(t[1] ? parseInt(t[1], 10) : 0) * 60 * 60;
				} else {
					return;
				}
				
				this.model.enter(value, this.date);
			}, this)
			.on('blur', function () {
				this.$el.parent().removeClass('hidden');
				input.remove();
			}, this)
			.render().$el.insertAfter(this.$el.parent());
		
		input.focus();
	},
	
	// -------------- //
	
	_duration: function (seconds, machine) {
		var minutes = Math.floor(seconds / 60),
			hours = Math.floor(minutes / 60);
	
		if (machine) {
			return 'PT' + hours + 'H' + (minutes % 60) + 'M'/* + (seconds % 60) + 'S'*/;
		}
	
		return hours.pad(2) + ':' + (minutes % 60).pad(2)/* + ':' + (seconds % 60).pad(2)*/;
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
		// console.log('List all timers');
		
		this.application.showCalendar();
	},
	
	description: function (id) {
		// console.log('Edit details for timer #' + id);
		
		this.application.showDescripion(id);
	},
	
	time: function (id, date) {
		// console.log('Change logged time for timer #' + id);
		
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
	// Backbone.sync = noSync;
	
	// Start application
	Backbone.history.start();
});


// ===========
// = Helpers =
// ===========

// ---------
// - Clock -
// ---------

var Clock = {
	now: new Date(),
};

_.extend(Clock, Backbone.Events);

setInterval(_.bind(function () {
	Clock.now = new Date();
	
	if (this.second != Clock.now.getSeconds()) {
		this.second = Clock.now.getSeconds();
		this.trigger('tick tick:second');
	}
	
	if (this.minute != Clock.now.getMinutes()) {
		this.minute = Clock.now.getMinutes();
		this.trigger('tick tick:minute');
	}
	
	if (this.date != Clock.now.getDate()) {
		this.date = Clock.now.getDate();
		this.trigger('tick tick:day');
	}
}, Clock), 250);

// --------
// - Date -
// --------

_.extend(Date.prototype, {
	_en_weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
	_en_months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	
	isToday: function () {
		var now = new Date();
		return this.getMachineDate() === now.getMachineDate();
	},
	getProperDay: function () {
		var day = this.getDay();
		
		return day === 0 ? 6 : (day - 1);
	},
	getDayName: function () {
		return this._en_weekdays[this.getProperDay()];
	},
	getMonthName: function () {
		return this._en_months[this.getMonth()];
	},
	getHumanDate: function () {
		return this.getDayName() + ', ' + this.getDate() + ' ' + this.getMonthName() + ' ' + this.getFullYear();
	},
	getShortHumanDate: function () {
		return this.getDayName().substr(0, 3) + ', ' + this.getDate() + ' ' + this.getMonthName().substr(0, 3) + '&rsquo;' + (this.getFullYear() + '').substr(2, 2);
	},
	getMachineDate: function () {
		return this.getFullYear() + '-' + (this.getMonth() + 1).pad(2) + '-' + this.getDate().pad(2);
	},
});

// ----------
// - Number -
// ----------

_.extend(Number.prototype, {
	pad: function (width, zero) {
		var string = String(this);
		
		return string.pad(width, zero);
	}
});

// ----------
// - String -
// ----------

_.extend(String.prototype, {
	pad: function (width, zero) {
		zero = zero || 0;
		
		if (this.length >= width) {
			return this;
		}
		
		return new Array(width - this.length + 1).join(zero) + this;
	}
});

// ---------------------
// - Utility functions -
// ---------------------

function datetime(date) {
	var _date = _.isDate(date) ? date : new Date(date);
	
	return _date.getMachineDate();
}

function noSync(method, model, options) {
	console.log('Sync this:', method, model, options);
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
					'logged_on': '2016-02-01T13:22:00.000Z',
					'manually': false,
					'value': 123 * 60,
				},
				{
					'logged_on': '2016-01-31T13:22:00.000Z',
					'manually': false,
					'value': 43 * 60,
				},
				{
					'logged_on': '2016-01-24T13:22:00.000Z',
					'manually': false,
					'value': 56 * 60,
				},
			],
		},
	]);
	
	return timers;
}
