// rules widget
class Rules extends Widget {
    constructor(id, widget) {
        super(id, widget)
        this.rules = {}
        this.listener = null
        // add an empty box into the given column
        this.template.add_large_widget(this.id, this.widget["title"])
    }
    
    // draw the widget's content
    draw() {
        // IDs Template: _box, _title, _refresh, _popup, _body, _loading
        // IDs Widget: _table
        // if refresh requested, we need to unsubscribe from the topics to receive them again
        if (this.listener != null) {
            gui.remove_listener(this.listener)
            this.rules = {}
        }
        var body = "#"+this.id+"_body"
        $(body).html("")
        // add new rule button
        var button_html = '\
            <div class="form-group">\
                <button type="button" id="'+this.id+'_new" class="btn btn-block btn-primary btn-lg"><i class="fas fa-plus"></i> Add a new rule</button>\
            </div>'
        $(body).append(button_html)
        $("#"+this.id+"_new").unbind().click(function() {
            return function () {
                window.location.hash = '#__configuration=rules/__new__'
            };
        }());
        // add table
        // 0: rule_id (hidden)
        // 1: rule
        // 2: severity
        // 3: schedule
        // 4: conditions
        // 5: trigger
        // 6: actions
        var table = '\
            <table id="'+this.id+'_table" class="table table-bordered table-striped">\
                <thead>\
                    <tr><th>_rule_id_</th><th>Rule</th><th>Severity</th><th>Schedule</th><th>Conditions</th><th>Triggers</th><th>Actions</th></tr>\
                </thead>\
                <tbody></tbody>\
            </table>'
        $(body).append(table)
        // define datatables options
        var options = {

            "responsive": true,
            "dom": "Zlfrtip",
            "fixedColumns": false,
            "paging": false,
            "lengthChange": false,
            "searching": true,
            "ordering": true,
            "info": true,
            "autoWidth": false,
            "columnDefs": [ 
                {
                    "targets" : [0],
                    "visible": false,
                },
                {
                    "className": "dt-center", 
                    "targets": [2, 6]
                }
            ]
        };
        // create the table
        if (! $.fn.dataTable.isDataTable("#"+this.id+"_table")) {
            $("#"+this.id+"_table").DataTable(options);
        } else {
            var table = $("#"+this.id+"_table").DataTable()
            table.clear()
        }
        // discover registered rules
        this.listener = this.add_configuration_listener("rules/#")
    }
    
    // close the widget
    close() {
        if (this.listener != null) {
            gui.remove_listener(this.listener)
        }
    }
    
    // receive data and load it into the widget
    on_message(message) {
    }
    
    // if the item is disabled, gray out the text
    disabled_item(item, disabled) {
        if (! disabled) return item
        if (typeof item === 'object' && item.constructor === Array) {
            for (var i = 0; i < item.length; i++) item[i] = '<p class="text-muted">'+item[i]+'</p>'
            return item
        }
        else return '<p class="text-muted">'+item+'</p>'
    }
    
    // receive configuration
    on_configuration(message) {
        var rule_id = message.args.replace("rules/","")
        // skip rules already received
        if (rule_id in this.rules) return
        var rule = message.get_data()
        var rule_tag = rule_id.replaceAll("/","_")
        this.rules[rule_id] = rule
        // add a line to the table
        var table = $("#"+this.id+"_table").DataTable()
        var disabled = "disabled" in rule && rule["disabled"]
        var description = "<b>"+rule["text"]+"</b><br>("+rule_id+")"
        var schedule = "schedule" in rule ? JSON.stringify(rule["schedule"]) : ""
        schedule = schedule.replaceAll("{","").replaceAll("}","").replaceAll("\"","").replaceAll(":",": ").replaceAll(",",", ")
        var conditions = ""
        for (var condition of rule["conditions"]) conditions = conditions+condition+"<br>"
        var actions = ""
        if ("actions" in rule) {
            for (var action of rule["actions"]) actions = actions+action+"<br>"
        }
        var run_html = '<button type="button" id="'+this.id+'_run_'+rule_tag+'" class="btn btn-default"><i class="fas fa-play"></i></button>'
        var edit_html = '<button type="button" id="'+this.id+'_edit_'+rule_tag+'" class="btn btn-default"><i class="fas fa-edit"></i></button>'
        var delete_html = '<button type="button" id="'+this.id+'_delete_'+rule_tag+'" class="btn btn-default" ><i class="fas fa-trash"></i></button>'
        // add the row
        table.row.add(this.disabled_item([rule_id, format_multiline(description, 50), rule["severity"] , schedule, conditions, actions, run_html+" "+edit_html+" "+delete_html], disabled)).draw(false);
        // run the selected rule
        $("#"+this.id+"_run_"+rule_tag).unbind().click(function(rule_id) {
            return function () {
                var message = new Message(gui)
                message.recipient = "controller/alerter"
                message.command = "RUN"
                message.args = rule_id
                gui.send(message)
                gui.notify("info", "Requesting to run the rule "+rule_id)
            };
        }(rule_id));
        // edit the selected rule
        $("#"+this.id+"_edit_"+rule_tag).unbind().click(function(rule_id) {
            return function () {
                window.location.hash = '#__configuration=rules/'+rule_id;
            };
        }(rule_id));
        // delete the rule
        $("#"+this.id+"_delete_"+rule_tag).unbind().click(function(rule_id) {
            return function () {
                // delete the rule configuration file
                var message = new Message(gui)
                message.recipient = "controller/config"
                message.command = "DELETE"
                message.args = "rules/"+rule_id
                gui.send(message)
                gui.notify("info", "Requesting to delete rule "+rule_id)
            };
        }(rule_id));
        // disable run if rule is disabled
        if (disabled) $("#"+this.id+"_run_"+rule_tag).prop('disabled', true);
    }
}