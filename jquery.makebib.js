/*
 * jQuery plugin: makebib
 * Generate a bibliography base on a list of bibtex files.
 * https://github.com/guoquan/jquery-makebib
 *
 * Copyright 2019, Guo, Quan
 * https://guoquan.net
 */

/* global jQuery, require, document */

;
(function($) {
  "use strict";

  // bib parsing tool
  const Cite = require("citation-js");
  // define the plugin
  $.fn.makebib = function(bib_json, bib_path, options) {
    var options = $.extend({}, $.fn.makebib.defaults, options);
    var $bib_node = this; // cannot propagate through $.when
    var last_modified = new Date(document.lastModified);
    //var last_modified = new Date("1987/8/25");
    $bib_node.prop("last_modified", last_modified);

    var ajax_csl = $.fn.makebib.ensure_csl(options.csl_style);
    var ajax_bib = $.get(bib_json);
    $.when(
      ajax_csl,
      ajax_bib
    ).then(function(
      csl_retval, // do not need, but we want to wait for it
      bib_retval
    ) {
      console.debug(this);
      console.debug(bib_retval); // [ data, textStatus, jqXHR ]
      var bib_dict = bib_retval[0];
      var all_loaded = [];
      if (options.overwrite) {
        $bib_node.html("");
      }
      for (var key in bib_dict) {
        if (key.trim() !== "") {
          $bib_node.append("<h3>" + key + "</h3>");
        }
        if (bib_dict[key].trim() !== "") {
          var $div_node = $(
            "<div id=\"bib_" +
            key.toLowerCase().replace(" ", "_") +
            "\">" +
            "</div>"
          );
          $bib_node.append($div_node);

          var $loaded = $.Deferred();
          all_loaded.push($loaded.promise());

          $div_node.loading(bib_path + "/" + bib_dict[key],
            function(data, textStatus, jqXHR) {
              console.debug(this);
              var modified = new Date(jqXHR.getResponseHeader("Last-Modified"));
              console.debug(modified);
              if (modified > last_modified) { // should consider a lock here
                last_modified = modified;
                console.debug(last_modified);
              }
              var cite = new Cite(data);
              var cite_html = cite.format("bibliography", {
                format: "html",
                template: options.csl_style,
                lang: "en-US",
                nosort: true
              });
              if ($.fn.makebib.callable(options.dress_up)) {
                cite_html = options.dress_up.call(this, cite_html);
              }
              return cite_html;
            },
            function() {
              return "Sorry! This list of publications is not loaded. " +
                "Please click to load again or contact me through email. " +
                "Thank you!";
            },
            function(data, textStatus, jqXHR, args) {
              args[0].resolve();
            },
            [$loaded],
            options.loading_options
          );
        } // if
      } // for

      console.debug(all_loaded);
      $.when.apply($, all_loaded).then(function() {
        console.debug(last_modified);
        $bib_node.prop("last_modified", last_modified);
        if ($.fn.makebib.callable(options.done)) {
          options.done.call($bib_node);
        }
      });
    });
    // return this (the invoking jquery object) to make it chainable
    return this;
  };

  // csl checker and loader
  $.fn.makebib.ensure_csl = function(csl_style) {
    var ajax_csl = null;
    if (!(csl_style in Cite.plugins.config.get("@csl").templates.data)) {
      ajax_csl = $.get(csl_style).then(function(csl_data) {
        // use then not done, to make sure this chain waits for the following code
        console.debug(csl_data);
        Cite.plugins.config.get("@csl").templates.add(csl_style, csl_data);
      });
    }
    return ajax_csl;
  }

  // check is callable
  $.fn.makebib.callable = function(func) {
    return typeof(func) != "undefined" && func && func.call
  }

  // defaults
  $.fn.makebib.defaults = {
    csl_style: "apa",
    dress_up: null,
    overwrite: false,
    done: null,
    loading_options: {}
  };
})(jQuery);
