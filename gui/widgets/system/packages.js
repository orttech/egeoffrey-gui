// Packages widget
class Packages extends Widget {
    constructor(id, widget) {
        super(id, widget)
        this.listener = null
        this.manifests = {}
        // add an empty box into the given column
        this.template.add_large_widget(this.id, this.widget["title"])
    }
    
    // draw the widget's content
    draw() {
        // IDs Template: _box, _title, _refresh, _popup, _body, _loading
        // IDs Widget: _table
        // if refresh requested, we need to unsubscribe from the topics to receive them again
        if (this.listener != null) gui.remove_listener(this.listener)
        var body = "#"+this.id+"_body"
        // add table
        // 0: package
        // 1: modules
        // 2: branch
        // 3: version
        // 4: up to date
        var table = '\
            <table id="'+this.id+'_table" class="table table-bordered table-striped">\
                <thead>\
                    <tr><th>Package</th><th>Modules</th><th>Version</th><th>Release</th><th>Up to Date</th></tr>\
                </thead>\
                <tbody></tbody>\
            </table>'
        $(body).html(table)
        
        // define datatables options
        var options = {
            "responsive": true,
            "dom": "Zlfrtip",
            "fixedColumns": false,
            "paging": true,
            "lengthChange": false,
            "searching": true,
            "ordering": true,
            "info": true,
            "autoWidth": true,
            "columnDefs": [ 
                {
                    "className": "dt-center",
                    "targets": [2, 3, 4]
                }
            ]
        };
        // create the table
        $("#"+this.id+"_table").DataTable(options);
        // ask for manifest files
        this.listener = this.add_broadcast_listener("+/+", "MANIFEST", "#")
    }
    
        
    // close the widget
    close() {
    }    
    
    // receive data and load it into the widget
    on_message(message) {
        if (message.command == "MANIFEST") {
            var table = $("#"+this.id+"_table").DataTable()
            var manifest = message.get_data()
            if (manifest["package"] in this.manifests) return
            // add a new row for this package
            var update_id = this.id+'_'+manifest["package"]+'_update'
            table.row.add([manifest["package"], manifest["modules"].join("<br>"), manifest["version"], manifest["release"], '<span id="'+update_id+'"><i class="fas fa-spinner fa-spin"></span>']).draw();
            // check for update
            var url = "https://raw.githubusercontent.com/"+manifest["git"]+"/"+manifest["version"]+"/manifest.yml"
            $.get(url, function( data) {
                data = jsyaml.load(data)
                if (data["release"] > manifest["release"]) $("#"+update_id).html('<a href="https://github.com/'+manifest["git"]+'/tree/'+manifest["version"]+'" target="_blank"><i class="fas fa-external-link-alt"></i></a>')
                else $("#"+update_id).html('<i class="fas fa-check">')
            });
            this.manifests[manifest["package"]] = manifest
        }
    }
    
    // receive configuration
    on_configuration(message) {
    }
}