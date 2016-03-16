function refreshHitml() {
	var elements = document.querySelectorAll('[hitml-content]')
	
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];
		var hlAction = element.getAttribute("hitml-content");
		var html = hl.execute(hlAction);
		if (html[0] == "\"") html = html.substring(1, html.length-1);
		element.innerHTML = html;
	};
}

document.addEventListener('DOMContentLoaded', function(){
	var srcElement = document.querySelectorAll('[hitml-src]')[0];
	var hlFilePath = srcElement.getAttribute("hitml-src");
	
	function httpGet(theUrl) {
		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", theUrl, false); // false for synchronous request
		xmlHttp.send(null);
		return xmlHttp.responseText;
	}
	
	var hlScript = httpGet(hlFilePath);
	hlScript = hlScript[0] === "\"" ? hlScript.substring(1, hlScript.length-1) : hlScript;
	hl.execute(hlScript);

	refreshHitml();

	var elements = document.querySelectorAll('[hitml-listener]')

	for (var i = 0; i < elements.length; i++) {
		var element = elements[i];
		var hlAction = element.getAttribute("hitml-listener");
		element.addEventListener("submit", function(event) {
			event.preventDefault();
			var formValues = {};
			for (var i = 0; i < event.target.children.length; i++) {
				var child = event.target.children[i];
				formValues[child.name] = child.value;
			}
			hl.saveToScope("argument", formValues["value"]);
			var result = hl.execute(hlAction);
			console.log("RESULT " + result);
			refreshHitml();
		});
	};
});