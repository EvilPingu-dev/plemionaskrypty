// ==UserScript==
// @		SimpleMap
// @space	http://plemiona.pl
// @description Narzędzia do mapy
// @		http://pl*.plemiona.pl/game.php*screen=map*
// @version		1.2
// @		RexuN
// @		none
// ==/UserScript==

/*
* UWAGA!
* Aby skrypt działał poprawnie prosimy nie zmieniać kodu.
*/

var $TWMap = {
	cookie: "TWMap-script-",
	active: true,
	coords: {},
	settingsData: {
		"Włącz skrypt": {
			tooltip: "Zaznacz, jeżeli chcesz, aby skrypt był włączony",
			opt: "<input type=\"checkbox\" value=\"true\" data-TWMap-option=\"active\"/>"
		},
		"Menu z rozmiarami": {
			tooltip: "Zaznacz, aby menu z rozmiarami pod prawym przyciskiem było dostępne",
			opt: "<input type=\"checkbox\" value=\"true\" data-TWMap-option=\"contextmenu\"/>"
		},
		"Rozmiar X": {
			tooltip: "Wybierz rozmiar X mapy, od 9 do 30",
			opt: "<input type=\"number\" data-TWMap-option=\"size-x\" min=\"9\" max=\"30\"/>"
		},
		"Rozmiar Y": {
			tooltip: "Wybierz rozmiar Y mapy, od 9 do 30",
			opt: "<input type=\"number\" data-TWMap-option=\"size-y\" min=\"9\" max=\"30\"/>"
		},
		"Kliknięcie na wioskę": {
			tooltip: "Jeźeli zaznaczysz, po kliknięciu prawym przyciskiem myszy na wioskę jej koordynaty zostaną zapisane (Shift+p) Uwaga! Usunięcie historii koordynatów: shift+r",
			opt: "<input type=\"checkbox\" data-TWMap-option=\"villageClick\" value=\"true\"/>"
		}
	},
	sizes: [9,11,13,15,18,20,25,30],
	resize: function (x, y) {
		if ($TWMap.active == false) {
			$TWMap.setData("active","false");
			return false;
		}
		TWMap.size = [x, y];
		TWMap.resize(TWMap.size,true)
		return true;
	},
	getData: function(cookie) {
		data = $.cookie($TWMap.cookie + cookie);
		if (data) return data;
		
		return false;
	},
	setData: function(cookie, value) {
		return $.cookie($TWMap.cookie + cookie, value, { expires: 365 });
	},
	setSize: function(size) {
		$TWMap.setData("size-x",size);
		$TWMap.setData("size-y",size);
		$TWMap.resize(size,size);
		return false;
	},
	configBox: function() {
		$html = "<h2 class=\"popup_box_header\">Ustawienia mapy</h2>";
		
		$html += "<div class=\"row\">";
		$html += "<ul class=\"welcome-list\">";	
		i = 0;
		$.each($TWMap.settingsData, function(setting, data) {
			itemClass = "a";
			i++;
			if (i%2 == 0) itemClass = "b";
			$html += "<li class=\"list-item "+itemClass+"\"><span class=\"list-left tooltip\" title=\""+data.tooltip+"\">"+setting+"</span><span class=\"\list-right\">"+data.opt+"</span></li>";
		});
		
		$html += "</ul>";
		$html += "<div style=\"text-align: center; padding: 5px;\"><input type=\"submit\" value=\"Zapisz\" id=\"TWMap-configAccept\" class=\"btn btn-confirm-yes\"/></div>";
		$html += "</div>";
		
		$html += "<br /><span style=\"font-size: 0.9em; font-weight: bold; float: right;\">by RexuN</span>";
		Dialog.show("TWMap-script-settingsbox",$html);
		
		$("*[data-TWMap-option]").each(function(i, object) {
			$this = $(this);
			$opt = $this.attr("data-TWMap-option");
			$optVal = $TWMap.getData($opt);
			$type = $this.attr("type");
			switch($type) {
				case "checkbox":
					if ($optVal == "true") {
						$this.attr("checked","checked");
					} else {
						$this.removeAttr("checked");
					}
					break;
				case "number":
					$this.val($optVal);
					$this.css({
						width: "40px",
						padding: "4px",
						border: "1px solid #aaa",
						borderRadius: "2px"
					});
					break;
				case "select":
					$this.css({
						width: 40,
						padding: 3
					});
					$h = "";
					$.each($TWMap.selectData[$opt], function(opt, val) {
						sel = "";
						if (val == $optVal) {
							sel = "selected"
						}
						$h += "<option name=\""+$opt+"\" value=\""+val+"\" "+sel+">"+opt+"</option>";
					});
					$this.html($h);
					break;
			}
		});
		OptData = {};
		$("#TWMap-configAccept").on("click", function() {
			$("*[data-TWMap-option]").each(function(i, object) {
				$this = $(this);
				$opt = $this.attr("data-TWMap-option");
				$type = $this.attr("type");
				$optVal = null;
				switch($type) {
					case "checkbox":
					 if ($this.is(":checked")) {
							$optVal = "true";
						} else {
							$optVal = "false";
						}
						break;
					case "number":
						$optVal = $this.val();
						break;
					case "select":
						$optVal = $("option[name="+$opt+"]:selected").val();
						break;
				};
				$TWMap.setData($opt,$optVal);
				OptData[$opt] = $optVal;
			});
			Dialog.close();
			UI.SuccessMessage("Zmiany zostały zapisane");
			if (OptData.active == "false") window.location.href = "/game.php?screen=map&village="+game_data.village.id;
			
			$TWMap.init();
		});
	},
	coordsPrint: function(format) {
		if (format != "@CRD" && format != "[coord]@CRD[/coord]") {
			format = "@CRD";
		}
		
		
		$list = $("<textarea />");
		$list.css({
			border: "1px solid #aaa",
			borderRadius: "4px",
			resize: "none",
			width: 250,
			height: 600
		}).attr("id","coordsListTXT");
		$val = "";
		$.each($TWMap.coords,function(i, coord) {
			$val += format.replace("@CRD",coord) + "\n";
		});
		$list.val($val);
		Dialog.show("coordslist",$list);
		
		$options = $("<div />").html("<a href=\"#\" data-TWMap-coordsSet=\"[coord]@CRD[/coord]\">Lista w BB-Code</a> | <a href=\"#\" data-TWMap-coordsSet=\"@CRD\">Normalna lista</a>").addClass("popup_box_content");
		$("#popup_box_coordslist").append($options);
		$("*[data-TWMap-coordsSet]").on('click', function() {
			$format = $(this).attr("data-TWMap-coordsSet");
			Dialog.close();
			$TWMap.coordsPrint($format);
			return false;
		});
	},
	coordsClear: function() {
		$TWMap.setData("coordsHistory","{}");
		$TWMap.coords = {};
		return false;
	},
	contextmenu: function() {
		if ($TWMap.active == false) return false;
		if ($TWMap.getData("contextmenu") == "false") return false;
				
		$contextmenu = $("<div />");
		$contextmenu.appendTo("body").css({
			width: "100px",
			minHeight: "30px",
			display: "none",
			zIndex: "99",
			position: "absolute",
			top: "30px",
			left: "30px",
			boxShadow: "3px 3px 3px -3px #333",
		}).addClass("popup_box show").attr("id","TWMap-contextmenu");
		
		$context = $("<div />");
		
		$context.appendTo("#TWMap-contextmenu").addClass("popup_box_content");
		
		$html = "<table class=\"vis\" width=\"100%\">";
		$.each($TWMap.sizes, function(i, size) {
			$html += "<tr><td style=\"text-align: center\"><a href=\"#\" data-TWMap-setSize=\""+size+"\">"+size+"x"+size+"</a></td></tr>";
		});
		
		$html += "</table>";
		$context.html($html);
		$("#map").bind("contextmenu",function(e) {
			if ($TWMap.getData("villageClick") == "true") {
				pos = TWMap.map.coordByEvent(e),
				x = pos[0];
				y = pos[1];
				var village = TWMap.villages[x * 1000 + y];
				if (village) {
					coord = x+"|"+y;
					$TWMap.coords[x*1000+y] = coord;
					$data = "{";
					i = 0;
					c = 0;
					$.each($TWMap.coords, function(key, value) {
						c++;
					});
					$.each($TWMap.coords, function(key, value) {
						i++;
						$data += "\""+key+"\":\""+value+"\"";
						if (i < c) {
							$data += ",";
						}
					});
					$data += "}";
					$TWMap.setData("coordsHistory",$data);
					UI.SuccessMessage("Dodano koordynaty: "+coord);
					return false;
				}
			}
			if ($TWMap.getData("contextmenu") == "false") return;
			$contextmenu.show().css({
				top: e.pageY+5,
				left: e.pageX+5
			});
			return false;
		});
		$("*").on('click', function() {
			$contextmenu.hide();
		});
		$("a[data-TWMap-setSize]").on("click",function() {
			$this = $(this);
			$size = $this.attr("data-TWMap-setSize");
			$TWMap.setSize($size);
			return false;
		});
	},
	init: function() {
		$(document).on('keydown',null,'shift+c',$TWMap.configBox);
		$(document).on('keydown',null,'shift+p',$TWMap.coordsPrint);
		$(document).on('keydown',null,'shift+r',$TWMap.coordsClear);
		if ($TWMap.getData("use") == false) {
			$TWMap.setData("use","true");
			$TWMap.setData("active","true");
			$TWMap.setData("contextmenu","true");
			$TWMap.setData("size-x","15");
			$TWMap.setData("size-y","15");
			$TWMap.setData("coordsHistory","{}");
			$TWMap.setData("villageClick","true");
		}
		$active = true;
		if (premium == true) {
			$active = false;
		}

		if ($TWMap.getData("active") == "false") {
			$active = false;
		}

		$TWMap.active = $active;
		
		$TWMap.coords = $.parseJSON($TWMap.getData("coordsHistory"));
		
		$TWMap.resize(
			$TWMap.getData("size-x"),
			$TWMap.getData("size-y")
		);
		$TWMap.contextmenu();
	}
};
$(document).ready(function() {
	$TWMap.init();
});
