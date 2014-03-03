/*
 * Javascript used in Home page
 */

var log_repo = "";
var log_size = 0;
var log_data = "";
var log_show = false;
var log_first_show = true;
var url = "/jsons?";

var request_user_update = function (name) {
	$.get('/remote/user_request_update/?what=' + name + "&t=" + new Date().getTime(), function(result) {
		$('#' + name + '-userreq').popover({placement:'left',content:result,trigger:'manual'});
		$('#' + name + '-userreq').popover('show');
		setTimeout(function(){$('#' + name + '-userreq').popover('destroy')}, 3600);
	});
}

var show_log = function (repo) {
	log_show = true;
	log_repo = repo;
	log_size = 0;
	log_data = "";
	repo_name = $('#' + repo + ' a')[0].innerText;
	$('#logheader').text("Logs for " + repo_name);
	$('#logcontent').text("Loading...");
	$('#logwindow').modal("show");
	$('#textlog').attr('href', '/latestlog/' + repo + '.txt');
	log_fetch_content();
}
var log_fetch_content = function () {
	var range="-30720";
	var newsize, diffsize = 0;
	if (!log_show) return;
	if (log_size > 0) range= (log_size - 1).toString() + '-';
	$.ajax('/latestlog/' + log_repo + '.txt?t=' + new Date().getTime(),
			{type:'GET',
			headers: {Range: 'Bytes='+range},
			success:
				function(data, s, xhr) {
					if (xhr.status == 206) {
						newsize = parseInt(xhr.getResponseHeader('Content-Range').split('/')[1]);
						diffsize = parseInt(xhr.getResponseHeader('Content-Length'));
						if (diffsize == 1) {
							setTimeout(log_fetch_content, 200);
							return;
						}
					} else if (xhr.status == 200) {
						newsize = data.length;
					}
					if (log_size == 0) {
						if (data.size < log_size)
							log_data = data.substring(data.indexOf("\n") + 1);
						else
							log_data = data;
					} else  {
						log_data += data.substring(1);
					}
					log_size = newsize;
					if (log_data.length > 30720) {
						log_data = log_data.substring(log_data.indexOf('\n', log_data.length - 30720));
					}
					log_fill_content(log_data);
					setTimeout(log_fetch_content, 200);
				},
			error:
				function(xhr, s, t) {
					log_size = 0;
					log_data = "";
					log_fill_content("");
					setTimeout(log_fetch_content, 200);
				}
			});
}
var log_scroll_content_bottom = function () {
	var pconsole = $('#logcontent');
	pconsole.scrollTop(pconsole[0].scrollHeight - pconsole.height());
}
var log_fill_content = function (data) {
	var pconsole = $('#logcontent');
	var offset = 30; // No idea why there's always 30px
	var oldscrollHeight = pconsole[0].scrollHeight
	data = data.replace('/\n/g', '\r\n');
	$('#logcontent').text("[...Truncated...]\n" + $.trim(data));
	if (pconsole.scrollTop() + pconsole.height() + offset >= oldscrollHeight)
		pconsole.scrollTop(pconsole[0].scrollHeight - pconsole.height());
    if (log_first_show) { log_first_show = false; setTimeout(log_scroll_content_bottom, 400); }
}
var initialize = function() {
	// initialize checker request
	var items = $(".mirrors");
	var i;
	for (i = 0; i < items.length - 1; i++) {
		url += "/status/" + $(items[i]).attr("id") + ".json&";
	}
	url += "/status/" + $(items[i]).attr("id") + ".json?t=";
	// initialize table column
	$('.mirrors').each(function(){
		var name = $(this).attr("id");
		$(this).append($("<td id=\"" + name + "-upstream\">"),
					   $("<td id=\"" + name + "-size\">"),
					   //$("<td id=\"" + name + "-status\">"),
					   $("<td id=\"" + name + "-lastsync\">"),
					   $("<td id=\"" + name + "-nextsync\">"),
					   $("<td>").html("<i id=\"" + name + "-userreq\" class=\"icon-refresh\" title=\"Request to synchronize now\" onclick=\"request_user_update('" + name + "');\"></i>"),
					   $("<td>").html("<i id=\"" + name + "-logs\" class=\"icon-file\" onclick=\"show_log('" + name + "');\"></i>"));
	});
	$('#logwindow').on('hidden', function () {
		log_show = false;
		log_first_show = true;
	});
}
var checker = function() {
	var statustxt = {"success": ["Succeeded", "mirrors success"],
					 "syncing": ["Synchronizing", "mirrors info"],
					 "failed": ["Failed", "mirrors error"],
					 "unknown": ["Unknown", "mirrors waring"]};
	$("#loader").removeAttr("style");
	$.getJSON(url + new Date().getTime()).done(function (result) {
		result = result["statuses"];
		$(result).each(function(index, content){
			if (!content["name"] || content["name"] == "stub") return true;
			switch (content["status"]) {
				case 'success':
					$("#" + content["name"] + "-status").text(statustxt["success"][0]);
					$("#" + content["name"]).attr("class", statustxt["success"][1]);
					break;
				case 'syncing':
					$("#" + content["name"] + "-status").text(statustxt["syncing"][0]);
					$("#" + content["name"]).attr("class", statustxt["syncing"][1]);
					break;
				case 'failed':
					$("#" + content["name"] + "-status").text(statustxt["failed"][0]);
					$("#" + content["name"]).attr("class", statustxt["failed"][1]);
					break;
				default:
					$("#" + content["name"] + "-status").text(statustxt["unknown"][0]);
					$("#" + content["name"]).attr("class", statustxt["unknown"][1]);
			}
			$("#" + content["name"] + "-upstream").text(content["upstream"]);
			var size = content['size'];
			if (!size || size == "-1") {
				size = 'Unknown';
			}
			$("#" + content["name"] + "-size").text(size);
			var lastsync_date = new Date(parseInt(content['lastsync']) * 1000);
			if (!content['lastsync'] || parseInt(content['lastsync']) <= 0) {
				var not_synced_before = true;
				var lastsync = "Initial sync";
			} else
				var lastsync = strftime("%Y-%m-%d %H:%M:%S", lastsync_date);
			var nextsync_date = new Date(parseInt(content['nextsync']) * 1000);
			if (!content['nextsync'] || parseInt(content['nextsync']) <= 0)
				if (not_synced_before || parseInt(content['nextsync'] == -2))
					var nextsync = "TBD";
				else if (parseInt(content['nextsync']) == -1)
					var nextsync = "Force resyncing";
				else if (parseInt(content['nextsync']) == -3)
					var nextsync = "In maintainance";
				else
					var nextsync = "User requested sync";
			else
				var nextsync = strftime("%Y-%m-%d %H:%M:%S", nextsync_date);
			$("#" + content["name"] + "-lastsync").text(lastsync);
			$("#" + content["name"] + "-nextsync").text(nextsync);
		});
		$("#loader").attr("style", "display: none;");
	});
	setTimeout(checker, 10000);
}

// vim: set noet:
// Written by Qijiang Fan and Haochen Tong
// Copyright (c) 2013-2014 Unique Studio
