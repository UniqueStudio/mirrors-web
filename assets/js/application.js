/*
 * Javascript used in Home page
 */

log_repo = "";
log_size = 0;
log_data = "";
log_show = false;
log_first_show = true;
$('#logwindow').on('hidden', function () {
		log_show = false;
		log_first_show = true;
		});

function ws(str, element, attr) {
	if (!attr) attr = "";
	return '<' + element + ' ' + attr + '>' + str + '</' + element + '>';
}

function request_user_update(what) {
	$.get('/remote/user_request_update/?what=' + what + "&t=" + new Date().getTime(), function(result) {
			$('#userreq-' + what).popover({placement:'left',content:result,trigger:'manual'});
			$('#userreq-' + what).popover('show');
			setTimeout(5000, function (){$('#user-' + what).popover('destroy');})
			});
}

function show_log(repo) {
	log_show = true;
	log_repo = repo;
	log_size = 0;
	log_data = "";
	repo_name = $('#' + repo + ' a')[0].innerText;
	$('#logheader').text("Logs for " + repo_name);
    $('#logcontent').text("Loading...");
	$('#logwindow').modal("show");
	log_fetch_content();
}
function log_fetch_content() {
	var range="-30720";
	var newsize;
	if (!log_show) { return; }
	if (log_size > 0) range= (log_size - 1).toString() + '-';
	$.ajax('/latestlog/' + log_repo + '.txt?t=' + new Date().getTime(),
			{type:'GET',
			headers: {Range: 'Bytes='+range},
			success:
				function(data, s, xhr) {
					if (xhr.status == 206) {
						newsize = parseInt(xhr.getResponseHeader('Content-Range').split('/')[1]);
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
function log_scroll_content_bottom() {
	var pconsole = $('#logcontent');
	pconsole.scrollTop(pconsole[0].scrollHeight - pconsole.height());
}
function log_fill_content(data) {
	var pconsole = $('#logcontent');
	var offset = 30; // No idea why there's always 30px
	var oldscrollHeight = pconsole[0].scrollHeight
	data = data.replace('/\n/g', '\r\n');
	$('#logcontent').text("[...Truncated...]\n" + $.trim(data));
	if (pconsole.scrollTop() + pconsole.height() + offset >= oldscrollHeight)
		pconsole.scrollTop(pconsole[0].scrollHeight - pconsole.height());
    if (log_first_show) { log_first_show = false; setTimeout(log_scroll_content_bottom, 400); }
}
function checker() {
	$('.mirrors').each(
		function() {
			var name = $(this).attr('id');
			$.getJSON('status/' + name + '.json?t=' + new Date().getTime(), function (result) {
					var pname = result["name"];
					td_operation = '<td><i id="userreq-' + pname + '" onclick="request_user_update(\'' + pname + '\');" class="icon-refresh" title="Request to synchronize now"></i></td><td><i title="View realtime updated log" id="showlog-' + pname + '"onclick="show_log(\'' + pname + '\');" class="icon-file" title="Show Log"></i></td>';
					var pselector = $('#' + pname);
					pselector.find(":not(:first-child)").remove();
					switch (result['status']) {
						case 'success':
							result['status'] = 'Succeeded'
							pselector.attr('class', "mirrors success");
							break;
						case 'failed':
							result['status'] = 'Failed'
							pselector.attr('class', "mirrors error");
							break;
						case 'syncing':
							result['status'] = 'Synchronizing'
							pselector.attr('class', "mirrors info");
							break;
						default:
							result['status'] = 'Unknown'
							pselector.attr('class', "mirrors warning");
					}
					var td_upstream = ws(result['upstream'], 'td');

					if (!result['size'] || result['size'] < 0)
						result['size'] = 'Unknown';
					var td_size = ws(result['size'], 'td');

					var td_status = ws(result['status'], 'td', 'data-localize="status.' + result['status'] + '"');

					var lastupdate_date = new Date(parseInt(result['lastsync']) * 1000);
					if (!result['lastsync'] || parseInt(result['lastsync']) <= 0) {
						var not_synced_before = true;
						var td_lastupdate = ws("Not synced before", "td");
					} else
						var td_lastupdate = ws(strftime("%Y-%m-%d %H:%M:%S", lastupdate_date), 'td');

					var nextupdate_date = new Date(parseInt(result['nextsync']) * 1000);
					if (!result['nextsync'] || parseInt(result['nextsync']) <= 0)
						if (not_synced_before)
							var td_nextupdate = ws("Not synced before", "td");
						else if (parseInt(result['nextsync']) == -1)
							var td_nextupdate = ws("Forced re-synchronizing", "td");
                        else if (parseInt(result['nextsync']) == -3)
                            var td_nextupdate = ws("In maintainance", "td");
						else
							var td_nextupdate = ws("User requested update", "td");
					else
						var td_nextupdate = ws(strftime("%Y-%m-%d %H:%M:%S", nextupdate_date), 'td');

					pselector.append(td_upstream, td_size, td_status, td_lastupdate, td_nextupdate, td_operation);
			});
		});
	setTimeout(checker, 10000);
}

