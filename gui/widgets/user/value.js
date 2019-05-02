// single value widget
class Value extends Widget {
    constructor(id, widget) {
        super(id, widget)
        this.timestamp = null
        this.timestamp_timer = null
        // add an empty box into the given column
        var icon = "icon" in this.widget ? this.widget["icon"] : "question"
        var color = "color" in this.widget ? this.widget["color"] : "blue"
        this.template.add_small_widget(this.id, this.widget["title"], icon, color)
    }
    
    // request the data to the database
    request_data() {
        var sensor_id = this.widget["sensor"]
        // ask for the latest value
        var message = new Message(gui)
        message.recipient = "controller/db"
        message.command = "GET"
        message.args = sensor_id
        gui.sessions.register(message, {
            "component": "value",
            "sensor_id": sensor_id,
            "type": this.widget["type"]
        })
        this.send(message)
        // ask for the timestamp
        var message = new Message(gui)
        message.recipient = "controller/db"
        message.command = "GET_TIMESTAMP"
        message.args = sensor_id
        gui.sessions.register(message, {
            "component": "timestamp",
            "sensor_id": sensor_id
        })
        this.send(message)
        // ask for the icon
        if ("icon_sensor" in this.widget) {
            var message = new Message(gui)
            message.recipient = "controller/db"
            message.command = "GET"
            message.args = this.widget["icon_sensor"]
            gui.sessions.register(message, {
                "component": "icon",
                "sensor_id": this.widget["icon_sensor"]
            })            
            this.send(message)
        }
    }
    
    // update the elapsed time based on the stored timestamp
    update_timestamp() {
        var tag = "#"+this.id+"_timestamp"
        if (this.timestamp == null) $(tag).html("");
        else $(tag).html(gui.date.timestamp_difference(gui.date.now(), this.timestamp))
    }
    
    // draw the widget's content
    draw() {
        // IDs Template: _color, _icon, _value, _value_suffix, _timestamp
        // IDs Widget: 
        // TODO: change column attributes to col-md-3 col-sm-6 col-xs-12
        // request the sensor's configuration
        if (this.widget["type"] == "button") {
            var tag = "#"+this.id+"_value"
            $(tag.replace("_value","_timestamp")).addClass("hidden")
            var html = '\
            <center><div class="input-group">\
                <button type="button" id="'+this.id+'_button" class="btn btn-default">'+this.widget["text"]+'</button>\
            </div></center>'
            $(tag).html(html)
            // listen for click
            $("#"+this.id+"_button").unbind().click(function(actions) {
                return function () {
                    // trigger actions
                    for (var action of actions) {
                        var action_split = action.split(" ")
                        var command = action_split[0]
                        // set the sensor to a value or poll it
                        if (command == "SET" || command == "POLL") {
                            var sensor_id = action_split[1]
                            var message = new Message(gui)
                            message.recipient = "controller/hub"
                            message.command = command
                            message.args = sensor_id
                            if (command == "SET") message.set_data(action_split[2])
                            gui.send(message)
                        }
                        // run a rule
                        else if (command == "RUN") {
                            var rule_to_run = action_split[1]
                            var message = new Message(gui)
                            message.recipient = "controller/alerter"
                            message.command = command
                            message.args = rule_to_run
                            gui.send(message)
                        }
                    }
                };
            }(this.widget["actions"]));
        }
        else {
            var sensor_id = this.widget["sensor"]
            this.add_configuration_listener("sensors/"+sensor_id)
            this.request_data()
        }
        // subscribe for acknoledgments from the database for saved values
        this.add_inspection_listener("controller/db", "*/*", "SAVED", "#")
    }
    
    // close the widget
    close() {
        if (this.timestamp_timer != null) clearInterval(this.timestamp_timer)
    }
    
    // receive data and load it into the widget
    on_message(message) {
        // database just saved a value check if our sensor is involved and if so refresh the data
        if (message.sender == "controller/db" && message.command == "SAVED") {
            if (message.args == this.widget["sensor"]) this.request_data()
            if ("icon_sensor" in this.widget && message.args == this.widget["icon_sensor"]) this.request_data()
        }
        else if (message.sender == "controller/db" && message.command.startsWith("GET")) {
            var session = gui.sessions.restore(message)
            if (session == null) return
            var data = message.get("data")
            var sensor = gui.configurations["sensors/"+session["sensor_id"]]
            // add value
            if (session["component"] == "value") {
                var tag = "#"+this.id+"_value"
                if (session["type"] == "value") {
                    // add value and suffix
                    $(tag).html(data.length == 1 ? data[0] : "N/A");
                    if ("unit" in sensor) $(tag+"_suffix").html(sensor["unit"]);
                }
                else if (session["type"] == "status") {
                    tag = tag.replace("_value","")
                    if (data.length == 1) {
                        if (data[0] == 0) {
                            $(tag+"_icon").removeClass().addClass("fa fa-power-off")
                            $(tag+"_color").removeClass().addClass("info-box-icon bg-red")
                            // TODO: localize
                            $(tag+"_value").html("OFF")
                        }
                        else if (data[0] == 1) {
                            $(tag+"_icon").removeClass().addClass("fa fa-plug")
                            $(tag+"_color").removeClass().addClass("info-box-icon bg-green")
                            $(tag+"_value").html("ON")
                        }
                    } else {
                        $(tag+"_value").html("N/A")
                    }
                }
                else if (session["type"] == "control") {
                    var id = tag.replace("#","")
                    $(tag.replace("_value","_timestamp")).addClass("hidden")
                    var html = '\
                    <center><div class="input-group">\
                        <div class="checkbox checkbox-slider--a checkbox-slider-md">\
                            <label>\
                                <input type="checkbox" id="'+id+'_toggle"><span></span>\
                            </label>\
                        </div>\
                    </div></center>'
                    $(tag).html(html)
                    // TODO: if not defined, set 0 to the db as well
                    if (data.length == 1) $(tag+"_toggle").prop("checked", data[0])
                    else $(tag+"_toggle").prop("checked", false)
                    // listen for changes
                    var actions = "actions" in this.widget ? this.widget["actions"] : null
                    $(tag+"_toggle").unbind().change(function(tag, sensor_id, actions) {
                        return function () {
                            var value = $(tag).is(':checked') ? 1 : 0
                            gui.log_debug("Setting "+sensor_id+"="+value)
                            var message = new Message(gui)
                            message.recipient = "controller/hub"
                            message.command = "SET"
                            message.args = sensor_id
                            message.set("value", value)
                            gui.send(message)
                            // TODO: update timestamp
                            // TODO: trigger update of other elements where sensor_id is used
                            // trigger additional actions
                            if (actions != null) {
                                for (var action of actions) {
                                    var action_split = action.split(" ")
                                    var command = action_split[0]
                                    // set the sensor to a value or poll it
                                    if (command == "SET" || command == "POLL") {
                                        sensor_id = action_split[1]
                                        message = new Message(gui)
                                        message.recipient = "controller/hub"
                                        message.command = command
                                        message.args = sensor_id
                                        if (command == "SET") message.set_data(value)
                                        gui.send(message)
                                    }
                                    // run a rule
                                    else if (command == "RUN") {
                                        rule_to_run = action_split[1]
                                        message = Message(gui)
                                        message.recipient = "controller/alerter"
                                        message.command = command
                                        message.args = rule_to_run
                                        gui.send(message)
                                    }
                                }
                            }
                        };
                    }(tag+"_toggle", session["sensor_id"], actions));
                }
                else if (session["type"] == "input") {
                    var id = tag.replace("#","")
                    $(tag.replace("_value","_timestamp")).addClass("hidden")
                    var html = '\
                    <div class="input-group input-group-lg">\
                    <input style="text-align:center;" id="'+id+'_input" class="form-control input-lg" type="text" value="">\
                    </div>'
                    $(tag).html(html)
                    if (data.length == 1) $(tag+"_input").val(data[0])
                    // if a number, add +/- buttons
                    if ("format" in sensor && sensor["format"] != "string") {
                        var decimals = sensor["format"] == "int" ? 0 : 1
                        var steps = sensor["format"] == "int" ? 1 : 0.1
                        $(tag+"_input").TouchSpin({
                            min: -1000000000,
                            max: 1000000000,
                            step: steps,
                            decimals: decimals,
                            boostat: 5,
                            maxboostedstep: 10,
                            //postfix: this.__formats[sensor["format"]]["suffix"]
                        });
                    }
                    // listen for changes
                    $(tag+"_input").unbind().change(function(tag, sensor_id) {
                        return function () {
                            var value = $(tag).val()
                            gui.log_debug("Setting "+sensor_id+"="+value)
                            var message = new Message(gui)
                            message.recipient = "controller/hub"
                            message.command = "SET"
                            message.args = sensor_id
                            message.set("value", value)
                            gui.send(message)
                        };
                    }(tag+"_input", session["sensor_id"]));
                }
            }
            // add timestamp
            else if (session["component"] == "timestamp") {
                this.timestamp = data.length != 1 ? null : data[0]
                // update the timestsamp value
                this.update_timestamp()
                // periodically refresh the elapsed time
                if (this.timestamp_timer != null) clearInterval(this.timestamp_timer)
                var this_class = this
                this.timestamp_timer = setInterval(function() {
                    this_class.update_timestamp()
                }, 10000);
            }
            // add icon
            else if (session["component"] == "icon") {
                if (data.length != 1) return
                $("#"+this.id+"_icon").removeClass()
                $("#"+this.id+"_icon").addClass("fas fa-"+data[0])
            }
        }
    }
    
    // receive configuration
    on_configuration(message) {
    }
}