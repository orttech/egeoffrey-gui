// calendar widget
class Calendar extends Widget {
    constructor(id, widget) {
        super(id, widget)
        // add an empty box into the given column
        this.add_large_box(this.id, this.widget["title"])
    }
    
    // draw the widget's content
    draw() {
        // IDs Template: _box, _title, _refresh, _popup, _body, _loading
        // IDs Widget: _calendar
        // scheduler's events
        var scheduler_events = [];
        var body = "#"+this.id+"_body"
		// add the calendar
		$(body).html('<div class="'+this.id+'_calendar" style="width:100%; height:950px;"></div>')
        // TODO: how to display with the configured timezone regardless of the browser's time
		$("."+this.id+"_calendar").dhx_scheduler({
			xml_date: "%Y-%m-%d %H:%i",
			mode: "week",
			details_on_create: true,
			details_on_dblclick: true,
			occurrence_timestamp_in_utc: false,
			include_end_by: true,
			repeat_precise: true,
			touch: "force",
			time_step: 15,
			mark_now: true,
			wide_form: false,
			hour_size_px: 35,
			scroll_hour: 6,
		});
		// clear previously attached events
        // TODO: multiple calendars on the same page
		scheduler.clearAll();
		if (scheduler_events.length > 0) {
			for (var i = 0; i < scheduler_events.length; i++) {
				scheduler.detachEvent(scheduler_events[i]);
			}
			scheduler_events = [];
		}
 		// init responsive
		initResponsive(scheduler);
		// TODO: configure the time step
		//if ("time_step" in layout) scheduler.config.time_step = layout["time_step"];
		// configure the mini-calendars
		scheduler_events.push(scheduler.attachEvent("onLightbox", function(){
			var lightbox_form = scheduler.getLightbox();
			var inputs = lightbox_form.getElementsByTagName('input');
			var date_of_end = null;
			for (var i=0; i<inputs.length; i++) {
				if (inputs[i].name == "date_of_end") {
					date_of_end = inputs[i];
					break;
				}
			}
			var repeat_end_date_format = scheduler.date.date_to_str(scheduler.config.repeat_date);
			var show_minical = function(){
				if (scheduler.isCalendarVisible()) scheduler.destroyCalendar();
				else {
					scheduler.renderCalendar({
						position:date_of_end,
						date: scheduler.getState().date,
						navigation:true,
						handler:function(date,calendar) {
							date_of_end.value = repeat_end_date_format(date);
							scheduler.destroyCalendar()
						}
					});
				}
			};
			date_of_end.onclick = show_minical;
		}));       
 		// configure event details sections
		scheduler.config.lightbox.sections = [
			{ name:"description", height:30, map_to:"text", type:"textarea" , focus:true, },
			{ name:"recurring", type:"recurring", map_to:"rec_type", button:"recurring" },
			{ name:"time", height:72, type:"calendar_time", map_to:"auto" }
		];
		// TODO: configure default value
		scheduler_events.push(scheduler.attachEvent("onBeforeLightbox", function (id){
			scheduler.resetLightbox();
			var event = scheduler.getEvent(id);
			if (event.text == "New event") {
				// newly created event, default to empty string
				event.text = ""
                // TODO: default_value
                /*
				if ("default_value" in layout) {
					// default value set
					if (is_sensor(layout["default_value"])) {
						// default value is a sensor, retrieve the current measure
						sensor = get_sensor_string(layout["default_value"])
						if (sensor == null) return;
						var sensor_url = sensor["module_id"]+"/"+sensor["group_id"]+"/"+sensor["sensor_id"];
						$.getJSON(sensor_url+"/current",function(id) {
							return function (data) {
								if (data.length == 0) return
								// set the default value
								scheduler.formSection('description').setValue(data[0]);
							};
						}(id));
					}
					else {
						// set the static value
						event.text = layout["default_value"]
					}
				}*/
			}
			return true;
		}));       
		// TODO: configure the event template
        /*
		if ("event_template" in layout) {
			scheduler.templates.event_text=function(start,end,event){
				text = layout["event_template"].replace("%value%",event.text);
				return text;
			}
		}*/
		// load the events
        var sensor_id = this.widget["sensor"]
        this.add_configuration_listener("sensors/"+sensor_id)
        var message = new Message(gui)
        message.recipient = "controller/db"
        message.command = "GET"
        message.args = sensor_id
        gui.sessions.register(message, {
            "sensor_id": sensor_id
        })
        this.send(message)
		// listen for changes
		var onChange = function(id,e){
			// on change save the events
			var now = new Date()
			var start = new Date(now.setDate(now.getDate() - 2))
			var now = new Date()
			var end = new Date(now.setMonth(now.getMonth() + 2))
			var events = scheduler.getEvents(start, end)
            // save both the events for being displaying and for the analysis
            var value =  JSON.stringify([scheduler.toJSON(), JSON.stringify(events)])
            // ask controller to save the value
            gui.log_debug("saving calendar data: "+value)
            var message = new Message(gui)
            message.recipient = "controller/hub"
            message.command = "SET"
            message.args = sensor_id
            message.set("value", value)
            gui.send(message)
		};
		// on any change, save the calendar
		scheduler_events.push(scheduler.attachEvent("onEventAdded",onChange));
		scheduler_events.push(scheduler.attachEvent("onEventChanged",onChange));
		scheduler_events.push(scheduler.attachEvent("onEventCopied",onChange));
		scheduler_events.push(scheduler.attachEvent("onEventDeleted",onChange));
    }
    
    // receive data and load it into the widget
    on_message(message) {
        if (message.sender == "controller/db" && message.command.startsWith("GET")) {
            var session = gui.sessions.restore(message)
            if (session == null) return
            var data = message.get("data")
            if (data.length == 0) return
            data = JSON.parse(data)
            gui.log_debug("loading calendar data: "+data[0])
            scheduler.parse(JSON.parse(data[0]),"json")
        }
    }
    
    // receive configuration
    on_configuration(message) {
    }
}