// marketplace widget
class Marketplace extends Widget {
    constructor(id, widget) {
        super(id, widget)
        this.marketplace_url = "https://api.github.com/repos/egeoffrey/egeoffrey-marketplace/contents/marketplace"
        this.marketplace_branch = "master"
        this.manifests = []
        this.packages_branch = "development"
        // add an empty box into the given column
        this.add_large_box(this.id, this.widget["title"])
    }
    
    // load the marketplace
    load_marketplace() {
        var this_class = this
        // list marketplace entries
        $.get(this.marketplace_url, function(content) {
            gui.log_debug("Marketplace has "+content.length+" entries")
            $("#"+this_class.id+"_marketplace").empty()
            // for each package in the parketplace
            for (var entry of content) {
                if (! ("path" in entry) || ! ("name" in entry)) continue
                var package_name = entry["name"].replace(".yml", "")
                // download the marketplace item
                $.get("https://raw.githubusercontent.com/egeoffrey/egeoffrey-marketplace/"+this_class.marketplace_branch+"/marketplace/"+package_name+".yml?timestamp="+(new Date()).getTime(), function(data) {
                    try {
                        var yaml = jsyaml.load(data)
                    } catch(e) {
                        gui.log_warning("Invalid marketplace file for package "+package_name+": "+e.message)
                        return
                    }
                    if (! ("github" in yaml)) {
                        gui.log_warning("Invalid marketplace file for package "+package_name+": "+e.message)
                        return
                    }
                    // download the manifest of the package
                    $.get("https://raw.githubusercontent.com/"+yaml["github"]+"/"+this_class.packages_branch+"/manifest.yml?timestamp="+(new Date()).getTime(), function(data) {
                        try {
                            var manifest = jsyaml.load(data)
                        } catch(e) {
                            gui.log_warning("Invalid manifest file for package "+package_name+": "+e.message)
                            return
                        }
                        if (manifest["manifest_schema"] != gui.supported_manifest_schema) return
                        // define tags
                        var tags = manifest["tags"].split(" ")
                        var tags_html = ""
                        for (var tag of tags) tags_html = tags_html+'<a class="label label-primary pull-right" onClick=\'$("#'+this_class.id+'_search").val("'+tag+'"); $("#'+this_class.id+'_search").keyup()\'>'+tag+'</a>&nbsp;'
                        // define modules
                        var modules = []
                        if (manifest["modules"].length > 0) {
                            for (var module_object of manifest["modules"]) {
                                for (var module in module_object) modules.push(module)                               
                            }
                        }
                        // define icon
                        var icon = "icon" in manifest ? manifest["icon"] : "box-open"
                        // define author
                        var split = manifest["github"].split("/", 1)
                        var author = split[0]
                        // define the item
                        var item_html = '\
                            <li class="item text-left" id="'+this_class.id+'_box_'+manifest["package"]+'">\
                              <div class="product-img">\
                                <i class="fas fa-'+icon+' fa-3x"></i>\
                              </div>\
                              <div class="product-info">\
                                <a class="product-title" target="_blank" href="https://github.com/'+manifest["github"]+'"><big>'+manifest["package"]+'</big></a>\
                                <span class="pull-right-container">'+tags_html+'</span>\
                                <span class="product-description"><b>Version</b>: '+manifest["version"]+'-'+manifest["revision"]+' ('+manifest["branch"]+')</span>\
                                <span class="product-description"><b>Author</b>: '+author+'</span>\
                                <span class="product-description"><b>Modules</b>: '+modules.join(", ")+'</span>\
                                <br>\
                                <span class="product-description">'+manifest["description"]+'</span>\
                              </div>\
                            </li>\
                        '
                        // add the marketplace item to the page
                        $("#"+this_class.id+"_marketplace").append(item_html)
                        this_class.manifests.push(manifest)
                    });
                });   
            }
        });
    }
    
    // draw the widget's content
    draw() {
        // IDs Template: _box, _title, _refresh, _popup, _body, _loading
        // IDs Widget: _table
        var body = "#"+this.id+"_body"
        this.manifests = []
        $(body).empty()
        var search_html = '\
            <div class="input-group input-group-sm">\
                 <input id="'+this.id+'_branch" class="form-control" id="'+this.id+'_branch" type="text" value="'+this.packages_branch+'" placeholder="">\
                <span class="input-group-btn">\
                  <button type="button" class="btn btn-info btn-flat" id="'+this.id+'_branch_button">Switch Branch</button>\
                </span>\
            </div><br>\
            <div class="input-group input-group-lg">\
                <label>Search the Marketplace: </label>\
                <input id="'+this.id+'_search" class="form-control" type="text" placeholder="Search the marketplace...">\
            </div>\
            <br>'
        $(body).append(search_html)
        var this_class = this
        // configure branch input
        $("#"+this.id+"_branch_button").unbind().click(function(this_class) {
            return function () {
                var branch = $("#"+this_class.id+"_branch").val()
                this_class.packages_branch = branch
                this_class.draw()
            };
        }(this));
        // configure search input
        $("#"+this.id+"_search").unbind().keyup(function(this_class) {
            return function () {
                var search = $("#"+this_class.id+"_search").val()
                for (var manifest of this_class.manifests) {
                    if (manifest["package"].includes(search) || manifest["description"].includes(search) || manifest["tags"].includes(search)) $("#"+this_class.id+"_box_"+manifest["package"]).removeClass("hidden")
                    else $("#"+this_class.id+"_box_"+manifest["package"]).addClass("hidden")
                }
            };
        }(this));
        $(body).append('<ul class="products-list product-list-in-box" id="'+this.id+'_marketplace"><li><i class="fas fa-spin fa-3x fa-spinner"></i> Loading marketplace...</li></ul>')
        this.load_marketplace()
    }
    
        
    // close the widget
    close() {
    }    
    
    // receive data and load it into the widget
    on_message(message) {
    }
    
    // receive configuration
    on_configuration(message) {
    }
}