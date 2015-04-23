// ==UserScript==
// @name         LeekWars Editeur Regex
// @version      0.7
// @description  Ajout de la prise en charge des regex dans l'éditeur
// @author       jojo123
// @downloadURL  https://raw.githubusercontent.com/jogalaxy/editorRegex/master/editorRegex.user.js
// @updateURL    https://raw.githubusercontent.com/jogalaxy/editorRegex/master/editorRegex.user.js
// @match        http://leekwars.com/editor*
// @grant        none
// ==/UserScript==

var regex = function()
{

	function regex_open(content)
	{
		// Tableau
		var previousContent = "";
		while(content != previousContent)
		{
			previousContent = content;
			content = content.replace(/([a-zA-Z\])]+)\[  ('|")([a-zA-Z]+)('|")  \]/g, '$1.$3');
		}

		// Classe
		previousContent = "";
		while(content != previousContent)
		{
			previousContent = content;
			content = content.replace(/function ([a-zA-Z0-9]+)\(\)([ \r\n]*)\{ var this = \[\]; \/\* Start Class \*\//g, 'class $1$2{');
			content = content.replace(/return this;} \/\* End Class \*\//g, '}');
		}

		return content;
	}

	function regex_save(content)
	{
		// Tableau
		var previousContent = "";
		while(content != previousContent)
		{
			previousContent = content;
			content = content.replace(/([a-zA-Z\])]+)\.([a-zA-Z]+)/g, "$1[  '$2'  ]");
		}

		// Classe
		var classPattern = new RegExp("class ([a-zA-Z0-9]+)([ \r\n]*){");
		while (classPattern.exec(content) !== null)
		{
			var _class = classPattern.exec(content);
			var _class_pos = content.indexOf("class " + _class[1] + _class[2] + "{");
			var _class_end = content.indexOf("\n}", _class_pos);
			content = substr_replace(content, "return this;} /* End Class */", _class_end+1, 1);
			content = content.replace("class " + _class[1] + _class[2] + "{", "function " + _class[1] + "()" + _class[2] + "{ var this = []; /* Start Class */");
		}

		return content;
	}

	console.log("test");

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

}

window.addEventListener('load', regex, false);
regex();


function substr_replace(str, replace, start, length) {
	//  discuss at: http://phpjs.org/functions/substr_replace/
	// original by: Brett Zamir (http://brett-zamir.me)
	//   example 1: substr_replace('ABCDEFGH:/MNRPQR/', 'bob', 0);
	//   returns 1: 'bob'
	//   example 2: $var = 'ABCDEFGH:/MNRPQR/';
	//   example 2: substr_replace($var, 'bob', 0, $var.length);
	//   returns 2: 'bob'
	//   example 3: substr_replace('ABCDEFGH:/MNRPQR/', 'bob', 0, 0);
	//   returns 3: 'bobABCDEFGH:/MNRPQR/'
	//   example 4: substr_replace('ABCDEFGH:/MNRPQR/', 'bob', 10, -1);
	//   returns 4: 'ABCDEFGH:/bob/'
	//   example 5: substr_replace('ABCDEFGH:/MNRPQR/', 'bob', -7, -1);
	//   returns 5: 'ABCDEFGH:/bob/'
	//   example 6: substr_replace('ABCDEFGH:/MNRPQR/', '', 10, -1)
	//   returns 6: 'ABCDEFGH://'

	if (start < 0) { // start position in str
		start = start + str.length;
	}
	length = length !== undefined ? length : str.length;
	if (length < 0) {
		length = length + str.length - start;
	}

	return str.slice(0, start) + replace.substr(0, length) + replace.slice(length) + str.slice(start + length);
}
