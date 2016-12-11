var bubbleElement;
var popupElement;
var selectionText;
var selectionRect;
var firstSelectionRect;
var inProgress = false;
var settings = {
	"lang-to":			navigator.language.substring(0, 2),
	"popup-min-width":	300
};

function onSelectionChange(event) {
	window.clearTimeout(onSelectionChange.timeoutID);

	var selection = window.getSelection();
	if (selection.toString().trim().length > 0) {
		selectionRect = selection.getRangeAt(0).getBoundingClientRect();
		firstSelectionRect = selection.getRangeAt(0).getClientRects()[0];
		selectionText = selection.toString();
		onSelectionChange.timeoutID = window.setTimeout(showBubble, 500);
	}
}

function showBubble() {
	buildBubbleElement();

	placeElement(bubbleElement, firstSelectionRect, -40, -40);

	document.addEventListener("click", hideAll);
}

function requestTranslate(content) {

	inProgress = true;
	var req = new XMLHttpRequest();

	req.addEventListener("load", onTranslateResponse);
	req.addEventListener("loadend", function() { inProgress = false });
	req.open("GET", "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl="
		+ settings["lang-to"]
		+ "&dt=t&dt=bd&dj=1&q="
		+ content);
	req.send();
}

function onTranslateResponse() {
	var response = this.responseText;

	buildPopupElement();
	popupElement.innerHTML = buildPopupContent(JSON.parse(response));

	placeElement(popupElement, selectionRect);
	popupElement.style.display = "block";

	document.addEventListener("click", hideAll);
}

function placeElement(element, rect, offsetx, offsety) {
	offsetx = offsetx || 0;
	offsety = offsety || 0;
	var bodyRect = document.body.getBoundingClientRect();

	if ((Math.max(rect.left + offsetx, 0) + element.clientWidth) > bodyRect.width) {
		element.style.left = window.scrollX + Math.max(bodyRect.width - element.clientWidth, 0) + "px";
	} else {
		element.style.left = window.scrollX + Math.max(rect.left + offsetx, 0) + "px";
	}

	if ((Math.max(rect.top + offsety, 0) + element.clientHeight) > bodyRect.height) {
		element.style.top = window.scrollY + Math.max(bodyRect.height - element.clientHeight, 0) + "px";
	} else {
		element.style.top = window.scrollY + Math.max(rect.top + offsety, 0) + "px";
	}
}

function buildPopupContent(response) {
	var html = "\
		<div class='lang-from'>{lang-from}</div>\
		<div class='from'>{from}</div>\
		<div class='lang-to'>{lang-to}</div>\
		<div class='to'>{to}</div>\
	";

	var data = {
		'lang-from':	response.src,
		'from':			response.sentences[0].orig,
		'lang-to':		settings["lang-to"],
		'to':			response.sentences[0].trans
	}

	for (var property in data) {
		if (data.hasOwnProperty(property)) {
			html = html.replace("{" + property + "}", data[property]);
		}
	}

	// build alternatives table
	if (typeof response.dict !== "undefined") {
		html += "<table>";
		response.dict.forEach(function(meaning) {
			html += "<tr>";
			html += "<th>" + meaning.pos + "</th>";
			html += "<th></th>";
			html += "</tr>";
			meaning.entry.forEach(function(entry) {
				html += "<tr>";
				html += "<td>" + entry.word + "</td>";
				html += "<td>" + entry.reverse_translation.join(", ") + "</td>";
				html += "</tr>";
			})
		})
		html += "</table>";
	}

	return html;
}

function buildBubbleElement() {
	if (typeof bubbleElement === "undefined") {
		bubbleElement = document.createElement("div");
		bubbleElement.innerHTML = "<div></div>";
		bubbleElement.id = "tesely-bubble";
		bubbleElement.style.position = "absolute";
		document.body.appendChild(bubbleElement);
	}

	bubbleElement.addEventListener("mousemove", onBubbleMousemove);
	bubbleElement.style.top = "-999999px";
	bubbleElement.style.left = "-999999px";
	bubbleElement.style.display = "block";
}

function buildPopupElement() {
	if (typeof popupElement === "undefined") {
		popupElement = document.createElement('div');
		popupElement.id = 'tesely-popup';
		popupElement.style.position = "absolute";
		document.body.appendChild(popupElement);
	}

	// we need to have popup element displayed before inserting content to it to ensure proper element clientWidth calculation
	popupElement.style.top = "-999999px";
	popupElement.style.left = "-999999px";
	popupElement.style.display = "block";

}

function hideAll() {
	if (typeof popupElement !== "undefined") {
		popupElement.style.display = "none";
		document.removeEventListener("click", hideAll);
	}

	if (typeof bubbleElement !== "undefined") {
		bubbleElement.style.display = "none";
		document.removeEventListener("click", hideAll);
	}
}

function onBubbleMousemove() {
	bubbleElement.removeEventListener("mousemove");
	bubbleElement.style.display = "none";
	if (!inProgress) {
		requestTranslate(selectionText);
	}
}

document.addEventListener("selectionchange", function(e) {
	onSelectionChange(e);
});

window.addEventListener("blur", function(){
	hideAll();
});
