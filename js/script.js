function text_colour(col1, col2, col3) {
	document.getElementById("cv_link").style.color = "rgb("+col1+","+col2+","+col3+")";
}
function text_changer(){
	window.onload = function() {
		document.getElementById("cv_link").onmouseover = function() {
		}
	document.getElementById("cv_link").onmouseout = function() {
		document.getElementById("cv_link").style.color = "green";
		}
	}
}

//text_changer();