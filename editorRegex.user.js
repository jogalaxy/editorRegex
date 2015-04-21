// ==UserScript==
// @name         LeekWars Editeur Regex
// @version      0.5
// @description  Ajout de la prise en charge des regex dans l'éditeur
// @author       jojo123
// @downloadURL  https://raw.githubusercontent.com/jogalaxy/editorRegex/master/editorRegex.user.js
// @updateURL    https://raw.githubusercontent.com/jogalaxy/editorRegex/master/editorRegex.user.js
// @match        http://leekwars.com/editor*
// @grant        none
// ==/UserScript==

window.addEventListener('load', function() {

	function regex_open(content)
	{
		var previousContent = "";
		while(content != previousContent)
		{
			previousContent = content;
			content = content.replace(/([a-zA-Z\])]+)\[('|")([a-zA-Z]+)('|")\]/g, '$1.$3');
		}

		previousContent = "";
		while(content != previousContent)
		{
			previousContent = content;
			content = content.replace(/function ([a-zA-Z0-9]+)\(\)[\r\n]+{[\r\n\t]+var this = \[\];[\r\n]+([^]+)[\r\n\t]+return @this;[\r\n]+}/g, "class $1\r\n{\r\n$2}");
		}
		return content;
	}

	function regex_save(content)
	{
		var previousContent = "";
		while(content != previousContent)
		{
			previousContent = content;
			content = content.replace(/class ([a-zA-Z0-9]+)[\r\n\s]+?{([^]+)}/g, "function $1()\r\n{\r\n\tvar this = [];\r\n$2\treturn @this;\r\n}");
		}

		previousContent = "";
		while(content != previousContent)
		{
			previousContent = content;
			content = content.replace(/([a-zA-Z\])]+)\.([a-zA-Z]+)/g, "$1['$2']");
		}

		return content;
	}

	for (var editor in editors)
	{

		editors[editor].load = function(show) {

			var editor = this;
			
			ajax('editor_update', {id: this.id, load: true}, function(data) {

				data = regex_open(data);

				// Là y'a un souci, le code présente une ligne de plus :/ On la dégage
				data = data.slice(0, -1);
				
				if (_BASIC) {
					
					editor.editorDiv.append("<textarea>" + data + "</textarea>");
					_editorResize();

				} else {
					editor.editor.setValue(data);
					editor.editor.getDoc().clearHistory();

					setTimeout(function() {
						editor.updateIncludes();
					}, 200);
			 	}
				
				editor.loaded = true;
				if (show) {
					editor.show();
				}
			});
		}

		editors[editor].save = function() {

			if (_saving) return;
			_saving = true;
			
			var editor = this;
			
			_log("save id " + this.id + "...");
			
			this.tabDiv.removeClass("modified");
			
			$('#compiling').show();
			$('#results').empty().hide();
			
			var saveID = this.id > 0 ? this.id : 0;
			
			var content = _BASIC ? this.editorDiv.find('textarea').val() : this.editor.getValue();
			content = regex_save(content);

			ajax('editor_update', {id: saveID, compile: true, code: content}, function(data) {

				_saving = false;
				$('#results').empty().show();
				$('#compiling').hide();

				var error = false;
				try {
					data = JSON.parse(data);
				} catch (e) {
					error = true;
				}

				if (data.length == 0 || error) {
					
					$('#results').append("<div class='error'>× <i>" + _lang('editor_server_error') + "</i></div>");
					return;
				}

				for (var r in data) {

					var res = data[r];
					var code = res[0];
					var ia = res[1];

					var iaEditor = editors[ia];
					var iaName = iaEditor.name;

					if (code == 2) {
						
						$('#results').append("<div class='good'>✓ " + _lang('editor_valid_ai', iaName) + "</div><br>");
						$('#results .good').last().delay(800).fadeOut(function() {
							$('#results').hide();
						});

						iaEditor.error = false;
						iaEditor.tabDiv.removeClass("error");
						$('.line-error').removeClass("line-error");

						iaEditor.level = res[3];
						if (ia == current) {
							$('#comp-level').text(res[3]);
						}
						
					} else if (code == 1) {

						var info = res[2];
						
						$('#results').append("<div class='error'>× <b>" + iaName + "</b>&nbsp; ▶ " + info + "</div><br>");
						iaEditor.tabDiv.removeClass("error").addClass("error");
						iaEditor.error = true;

					} else if (code == 0) {

						var line = res[3];
						var pos = res[4];
						var info = res[5];
						
						$('#results').append("<div class='error'>× " + _lang('editor_ai_error', iaName, line) + "&nbsp; ▶ " + info + "</div><br>");
						
						iaEditor.tabDiv.removeClass("error").addClass("error");
						
						iaEditor.error = true;
						iaEditor.errorLine = line;
						
						iaEditor.showErrors();
					}
				}
				
				editor.modified = false;
				
				if (editor.needTest) {
					editor.needTest = false;
					editor.test();
				}
			});
		}

	}

	editors[current].load();

}, false);