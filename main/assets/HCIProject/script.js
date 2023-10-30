var days = [];
var foodGroups = {};

var graphScale = 0;

var daysBack = 0;

var activeScreen = "";

var menuShown = false;

//////////////////////////////
//      EVENT LISTENERS     //
//////////////////////////////

//General events
window.addEventListener("load", initialize);
window.addEventListener("resize", drawGraphs);
document.addEventListener("click", function(e) {
    if(!e.target.classList.contains("menu-button") && !e.target.classList.contains("navigation-menu-item"))
        hideMenu();
});

//Navigation Menu
[].forEach.call(document.getElementsByClassName("menu-button"), function(e) {
    e.addEventListener("click", function(e) {
        if(!menuShown)
            showMenu();
        else
            hideMenu();
})});

document.getElementById("daily-data-button").addEventListener("click", showDailyData);
document.getElementById("goals-settings-button").addEventListener("click", showGoalsSettings);
document.getElementById("view-history-button").addEventListener("click", showViewHistory);
    
//Data Entry
[].forEach.call(document.getElementsByClassName("date-button"), function(e) {
    e.addEventListener("click", function(e) { adjustDate(e.target); })});

document.getElementById("weight-input").addEventListener("input", function(e) {
    forceNumeric(e.target, false); });
document.getElementById("weight-input").addEventListener("change", function(e) {
    saveDataInput(); });

//Settings
document.getElementById("settings-point-goal-button").addEventListener("click", function () {
    days[days.length-1].pointGoal = parseInt(document.getElementById("settings-point-goal-input").value);
    if(isNaN(days[days.length-1].pointGoal))
        days[days.length-1].pointGoal = 0;

    showNotification("Set goal to " + days[days.length-1].pointGoal + (" points"));
    refresh()
});
document.getElementById("settings-weight-goal-button").addEventListener("click", function () {
    days[days.length-1].weightGoal = parseInt(document.getElementById("settings-weight-goal-input").value);
    if(isNaN(days[days.length-1].weightGoal))
        days[days.length-1].weightGoal = 0;

    showNotification("Set weight goal to " + days[days.length-1].weightGoal + " lb.");
    refresh();
});
document.getElementById("settings-new-group-button").addEventListener("click", function() {
    var name = document.getElementById("settings-new-group-name").value;
    var points =  parseInt(document.getElementById("settings-new-group-points").value);

    console.log(name);
    console.log(points);

    if(name === "")
        showNotification("Please enter a name for the new group", true);
    else if(isNaN(points))
        showNotification("Please enter a point value for the new group", true);
    else
        setFoodGroup(name, points);
});
document.getElementById("settings-del-group-button").addEventListener("click", function() {
    removeFoodGroup(document.getElementById("settings-del-group-select").value);});

document.getElementById("settings-point-goal-input").addEventListener("input", function(e) {
    forceNumeric(e.target, false); });
document.getElementById("settings-weight-goal-input").addEventListener("input", function(e) {
    forceNumeric(e.target, false); });
document.getElementById("settings-new-group-points").addEventListener("input", function(e) {
    forceNumeric(e.target, true); });

//View History
document.getElementById("graph-scale-button-week").addEventListener("click", function() { setGraphScale(7); });
document.getElementById("graph-scale-button-month").addEventListener("click", function() { setGraphScale(7*4); });
document.getElementById("graph-scale-button-year").addEventListener("click", function() { setGraphScale(7*4*12); });
document.getElementById("graph-scale-button-all").addEventListener("click", function() { setGraphScale(7*4*12*5); });

//////////////////////////////
//   GENERAL FUNCTIONALITY  //
//////////////////////////////

function initialize()
{
    //Create historical data
    const firstPointGoal =  Math.trunc(Math.random()* 3 + 12);
    const firstWeightGoal =  Math.trunc(Math.random()* 20 + 140);
    const nDays = 7*4*12*6;
    const goalChangeDay = Math.trunc(Math.random() * (nDays / 2));
    setDay(0, 200, [], firstPointGoal, firstWeightGoal);
    for(var i = 1; i < nDays; i++)
    {
        if(i == goalChangeDay)
            setDay(i, Math.trunc(Math.random()*5 + 200 - ((i / nDays) * 100)),
                { "Fruits & Veggies": Math.trunc(Math.random()*10), "Protein": 3 },
                firstPointGoal + Math.trunc(Math.random()*6 - 2),
                firstWeightGoal + (Math.trunc(Math.random()*20 - 10)));
        else
            setDay(i, Math.trunc(Math.random()*5 + 200 - ((i / nDays) * 100)),
                { "Fruits & Veggies": Math.trunc(Math.random()*10), "Protein": 3 });
    }

    //Default food groups
    setFoodGroup("Fruits & Veggies", 3, true);
    setFoodGroup("Whole Grains", 2, true);
    setFoodGroup("Protein", 1, true);
    setFoodGroup("Other Carbs", 0, true);
    setFoodGroup("Junk Food", -3, true);

    //Set default values
    graphScale = 7;
    daysBack = 0;

    //Clear autofilled values
    [].forEach.call(document.getElementsByTagName("input"), function(e) {
        e.value = "";
    });

    //With all data ready, display the default screen
    showDailyData();
}

function refresh()
{
    //Date Display
    for(e of document.getElementsByClassName("date-button"))
    {
        if(e.classList.contains("date-back"))
            e.disabled = days.length - daysBack <= 1;
        else if(e.classList.contains("date-forward"))
            e.disabled = daysBack < 1;
    }
    for(e of document.getElementsByClassName("date-display"))
        e.innerHTML = differenceToDate(daysBack).toLocaleDateString();

    //Daily Data Screen
    var activeDay = days[days.length - (1+daysBack)];
    displayFoodGrid(activeDay);
    if(typeof activeDay.weightActual !== 'undefined')
        document.getElementById("weight-input").value = activeDay.weightActual;

    //Goals and Settings Screen
    displayRemovalOptions();

    //View History Screen
    document.getElementById("streak-counter").innerHTML = '<div id="streak-label-current" class="streak-label">Current streak:</div>'
        + '<div id="streak-count-current" class="streak-count">' + getCurrentStreak() + '</div>'
        + '<div id="streak-label-best" class="streak-label">Best streak:</div>'
        + '<div id="streak-count-best" class="streak-count">' + getBestStreak() + '</div>';
    drawGraphs();
}

function drawGraphs()
{
    drawStreakGraph();
    drawLineGraph();
}

function forceNumeric(input, allowMinus)
{
    var illegal = allowMinus ? /((?<!^)[-])|[^\d-]/g : /[^\d]/g;
    if(input.value.match(illegal) != null)
    {
        showNotification("Please enter a number", true);
        input.value = input.value.replace(illegal, '');
    }
}

function showNotification(message, alert = false)
{
    var display = document.getElementById("notification-message")
    display.innerHTML = message;
    
    if(alert)
        display.classList.add("alert");
    else
        display.classList.remove("alert");

    $("#notification-box").stop(true, true).fadeIn().delay(3000).fadeOut();
}

//////////////////////////////
// NAVIGATION FUNCTIONALITY //
//////////////////////////////

function hide(hidden)
{
    document.getElementById(hidden).style.visibility = 'hidden';
}

function show(shown)
{
    document.getElementById(shown).style.visibility = 'visible';
}

function showMenu()
{
    show('navigation-menu');
    menuShown = true;
}

function hideMenu()
{
    hide('navigation-menu');
    menuShown = false;
}

function showDailyData()
{
    show('daily-data');
    hide('view-history');
    hide('goals-settings');

    daysBack = 0;
    activeScreen = "daily-data";

    hideMenu();

    refresh();
}

function showGoalsSettings()
{
    show('goals-settings');
    hide('view-history');
    hide('daily-data');

    daysBack = 0;
    activeScreen = "goals-settings";

    hideMenu();

    refresh();
}

function showViewHistory()
{
    hide('goals-settings');
    show('view-history');
    hide('daily-data');

    daysBack = 0;
    activeScreen = "view-history";

    hideMenu();

    refresh();
}

//////////////////////////////
//DATE CONTROL FUNCTIONALITY//
//////////////////////////////

function differenceToDate(daysBack)
{
    var date = new Date;
    date.setTime(date.getTime() - (daysBack * 24 * 3600000));
    return date;
}

function adjustDate(button)
{
    var adjustment = 0;
    if(button.classList.contains("date-back"))
        adjustment = 1;
    else if(button.classList.contains("date-forward"))
        adjustment = -1;

    if(activeScreen === "view-history")
        adjustment *= getUnit();
    
    daysBack = Math.min(days.length - 1, Math.max(0, daysBack + adjustment));

    refresh();
}

//////////////////////////////
// DATA INPUT FUNCTIONALITY //
//////////////////////////////

function adjustServings(button)
{
    var input;
    const candidates = button.parentElement.children;
    for(var i = 0; i < candidates.length; i++)
        if(candidates[i].classList.contains("food-servings-input"))
            input = candidates[i];
            
    var adjustment = 0;
    if(button.classList.contains("food-servings-minus"))
        adjustment = -1;
    else if(button.classList.contains("food-servings-plus"))
        adjustment = 1;

    input.value = Math.max(0, parseInt(input.value) + adjustment);

    saveDataInput();
}

function setDay(i, weight, servings,
    pointGoal = i in days ? days[i].pointGoal : (i > 0 ? days[i-1].pointGoal : 0),
    weightGoal = i in days ? days[i].weightGoal : (i > 0 ? days[i-1].weightGoal: 0))
{
    days[i] = {
        "pointGoal":pointGoal,
        "weightActual":weight,
        "weightGoal":weightGoal,
        "servings":servings,
        get pointActual()
        {
            var sum = 0;
            for(const g of Object.keys(servings))
                if(g in foodGroups)
                    sum += foodGroups[g].points * servings[g];
                
            return sum;
        }
    };
}

function saveDataInput()
{
    var weight = parseInt(document.getElementById("weight-input").value);
    if(isNaN(weight))
        weight = undefined;
    
    var servings = {};
    const servingInputs =  document.getElementsByClassName("food-servings-input");
    for(si of servingInputs)
    {
        var count = parseInt(si.value);
        if(isNaN(count))
            count = 0;

        servings[si.getAttribute("data-food-group-name")] = count;
    }

    setDay(days.length - (1 + daysBack), weight, servings);

    refresh();

    showNotification("Saved");
}

function displayFoodGrid(day)
{
    //Write header
    var html = '<div class="food-grid-row" id="food-grid-headers">'
        + '<div class="food-grid-item food-grid-header food-name">Food Groups</div>'
        + '<div class="food-grid-item food-grid-header food-points">Points</div>'
        + '<div class="food-grid-item food-grid-header food-servings">Servings</div>'
        + '</div>';

    var i = 0;
    for(const g of Object.keys(foodGroups))
    {
        html += '<div class="food-grid-row ' + (i++ % 2 == 0 ? 'row-even' : 'row-odd') + '">'
            + '<div class="food-grid-item food-name">' + g + '</div>'
            + '<div class="food-grid-item food-points">' + (foodGroups[g].points > 0 ? '+' : '') + foodGroups[g].points + '</div>'
            + '<div class="food-grid-item food-servings">'
            +' <button class="food-servings-button food-servings-minus" onClick="adjustServings(this)">-</button>'
            + '<input class="food-servings-input" data-food-group-name="' + g + '" value="' + (g in day.servings ? day.servings[g] : 0) + '"'
            + ' onInput="forceNumeric(this, false)" onChange="saveDataInput()" placeholder="0">'
            + '<button class="food-servings-button food-servings-plus" onClick="adjustServings(this)">+</button>'
            + '</div>'
            + '</div>';
    }

    document.getElementById("food-grid-panel").innerHTML = html;

    displayPoints(day);
}

function displayPoints(day)
{
    var pointActual = 0;
    for(si of document.getElementsByClassName("food-servings-input"))
        pointActual += foodGroups[si.getAttribute("data-food-group-name")].points * parseInt(si.value);

    document.getElementById("points-display").innerHTML = '<div class="points-display-item points-label">Points earned:</div>'
        + '<div class="points-display-item points-counter">' + pointActual + '</div>'
        + ((day.pointGoal - pointActual > 0) ? ('<div class="points-display-item points-label">Points to goal:</div>'
            + '<div class="points-display-item points-counter">' + Math.max(0, day.pointGoal - pointActual) + '</div>')
            : ('<div class="points-display-item points-display-achieved-text">Goal achieved</div>'
            + ('<div class="points-display-item points-display-achieved-icon">&#10004;</div>')));
}

//////////////////////////////
//  SETTINGS FUNCTIONALITY  //
//////////////////////////////

function setFoodGroup(name, points, initial = false)
{
    const existing = foodGroups.hasOwnProperty(name);
    foodGroups[name] = { "points":points };

    if(!initial)
    {
        if(existing)
            showNotification("Adjusted " + name + " point value to " + points);
        else
            showNotification("Added " + name + " group");
    }
}

function removeFoodGroup(name, initial = false)
{
    const existing = foodGroups.hasOwnProperty(name);
    delete foodGroups[name];

    if(!initial)
    {
        if(existing)
            showNotification("Removed " + name + " group");
        else
            showNotification("No group to remove", true);
        refresh();
    }
}

function displayRemovalOptions()
{
    var html = '';
    for(const g of Object.keys(foodGroups))
    {
        html += '<option value="' + g + '">' + g + '</option>';
    }
    document.getElementById("settings-del-group-select").innerHTML = html;
}

//////////////////////////////
//  GRAPHING FUNCTIONALITY  //
//////////////////////////////

function setGraphScale(days)
{
    graphScale = days;

    refresh();
}

function getUnit()
{
    return graphScale > 7*4 ? (graphScale > 7*52 ? 7*4 : 7) : 1;
}

function getUnitName(unit, quantity, capitalize = false)
{
    var result;
    switch(unit)
    {
        case 1:
            result = (capitalize ? "D" : "d") + "ay" + (quantity != 1 ? "s" : "");
            break;
        case 7:
            result = (capitalize ? "W" : "w") + "eek" + (quantity != 1 ? "s" : "");
            break;
        case 7*4:
            result = (capitalize ? "M" : "m") + "onth" + (quantity != 1 ? "s" : "");
            break;
        default:
            result = unit + "-day unit" (quantity != 1 ? "s" : "");
    }
    return result;
}

function drawLineGraph()
{
    const lastDays = days.slice(Math.max(0, (days.length - daysBack) - graphScale), days.length - daysBack);
    const unit = getUnit();

    var pointActuals = [];
    var pointGoals = [];
    var weightActuals = [];
    var weightGoals = [];
    for(var i = 0; i < Math.ceil(lastDays.length / unit); i++)
    {
        const unitDays = lastDays.slice(Math.max(0, lastDays.length - (i+1)*unit), lastDays.length - (i)*unit);
        
        pointActuals.push([i, unitDays.reduce((sum, day) => sum + day.pointActual, 0)]);
        pointGoals.push([i, unitDays.reduce((sum, day) => sum + day.pointGoal, 0)]);
        weightActuals.push([i, unitDays.reduce((sum, day) => sum + day.weightActual, 0) / unitDays.length]);
        weightGoals.push([i, unitDays.reduce((sum, day) => sum + day.weightGoal, 0) / unitDays.length]);
    }

    var graphData = [];
    graphData.push({ "name": "pointActual", "data": pointActuals, color: "#30FF6E", points: { radius: 3, fillColor: "#30FF6E" }, yaxis: 1 });
    graphData.push({ "name": "pointGoal", "data": pointGoals, color: "#188037", points: { radius: 3, fillColor: "#188037" }, yaxis: 1 });
    graphData.push({ "name": "weightActual", "data": weightActuals, color: "#00B4E6", points: { radius: 3, fillColor: "#00B4E6" }, yaxis: 2 });
    graphData.push({ "name": "weightGoal", "data": weightGoals, color: "#005066", points: { radius: 3, fillColor: "#005066" }, yaxis: 2 });

	$.plot($('#linegraph-graph'), graphData, {
		series: {
			points: {
				show: true,
				radius: 5
			},
			lines: {
				show: true
			},
			shadowSize: 0
		},
		grid: {
			color: '#646464',
			borderColor: 'transparent',
			borderWidth: 20,
			hoverable: true
		},
        axisLabels: { show: true },
		xaxis: {
			tickColor: 'transparent',
			tickDecimals: 0,
            transform: function(n) { return -n; },
            inverseTransform: function(n) {return -n; },
            axisLabel: getUnitName(unit, 0, true) + " ago"
		},
        yaxes : [{
            tickDecimals: 0,
            axisLabel: "Points"
            }, {
            tickColor: 'transparent',
            position: "right",
            tickDecimals: 0,
            axisLabel: "Weight (lb.)"
        }]
	});

	function showTooltip(x, y, contents)
    {
		$('<div id="tooltip">' + contents + '</div>').css({
			top: y - 16,
			left: x + 20
		}).appendTo('body').fadeIn(0);
	}

	var previousPoint = null;
	$('#linegraph-graph').bind('plothover', function (event, pos, item) {
		if (item) {
			if (previousPoint != item.dataIndex) {
				previousPoint = item.dataIndex;
				$('#tooltip').remove();
				var x = item.datapoint[0],
					y = item.datapoint[1];
                
                var message;
                switch(item.series.name)
                {
                    case "pointActual":
                        message = "Earned " + y + " points " + x + " " + getUnitName(unit, x) + " ago";
                        break;
                    case "pointGoal":
                        message = "Aimed to earn " + y + " points " + x + " " + getUnitName(unit, x) + " ago";
                        break;
                    case "weightActual":
                        message = "Weighed " + Math.round(y) + " lb. " + x + " " + getUnitName(unit, x) + " ago";
                        break;
                    case "weightGoal":
                        message = "Aimed to weigh " + y + " lb. " + x + " " + getUnitName(unit, x) + " ago";
                        break;
                    default:
                        message = "Undefined";
                }

				showTooltip(item.pageX, item.pageY, message);
			}
		} else {
			$('#tooltip').remove();
			previousPoint = null;
		}
	});
}

function drawStreakGraph()
{
    const canvas = document.getElementById("streak-graph-canvas");
    const width = document.getElementById("streak-graph-container").offsetWidth;

    const lastDays = days.slice(Math.max(0, (days.length - daysBack) - graphScale), days.length - daysBack);

    const unit = getUnit();
    var data = [];
    for(var i = 0; i < Math.ceil(lastDays.length / unit); i++)
    {
        const unitDays = lastDays.slice(Math.max(0, lastDays.length - (i+1)*unit), lastDays.length - (i)*unit);
        data.push({"pointActual":unitDays.reduce((sum, day) => sum + day.pointActual, 0),
            "pointGoal":unitDays.reduce((sum, day) => sum + day.pointGoal, 0)});
    }
    data = data.reverse();

    var todayStrings;
    switch(unit)
    {
        case 1:
            todayStrings = [ "TODAY" ];
            break;
        case 7:
            todayStrings = [ "THIS", "WEEK" ];
            break;
        case 7*4:
            todayStrings = [ "THIS", "MONTH" ];
            break;
        default:
            todayStrings = [ "NOW" ]
    }

    const c = canvas.getContext("2d");

    const boxesPerRow = unit == 1 ? 7 : 10;
    const spacing = 2;
    const boxWidth = ((width - spacing) / (boxesPerRow)) - spacing;
    const boxHeight = boxWidth;
    const todaySize = boxWidth / 5;

    canvas.width = width;
    canvas.height = Math.ceil(data.length / boxesPerRow) * (boxHeight + spacing) + spacing + (todaySize*(todayStrings.length + 1));

    for(var i = 0; i < data.length; i++)
    {
        const xOffset = spacing + (i % boxesPerRow) * (boxWidth+spacing);
        const yOffset = spacing + Math.trunc(i / boxesPerRow) * (boxHeight+spacing);

        const attainment = Math.max(0, data[i].pointActual) / Math.max(1, data[i].pointGoal);

        c.fillStyle = "rgba(12, 64, 28, " + attainment + ")";
        c.fillRect(xOffset + 1, yOffset + 1, boxWidth - 2, boxHeight - 2);

        //Add checkmark if goal attained
        if(attainment >= 1)
        {
            c.fillStyle = "rgba(245, 228, 39, 1)";
            c.textAlign = "start";
            c.font = boxHeight + "px Verdana";
            c.fillText("\u2714", xOffset + (boxWidth/8), yOffset + (boxHeight * (7/8)));
        }

        //Add today label
        if(i == data.length - 1)
        {
            c.fillStyle = "rgb(0,0,0)";
            c.textAlign = "center";
            c.font = "bold " + todaySize + "px Verdana";
            c.fillText("▲", xOffset + (boxWidth / 2), yOffset + boxHeight + todaySize);
            for(var line = 0; line < todayStrings.length; line++)
                c.fillText(todayStrings[line], xOffset + (boxWidth / 2), yOffset + boxHeight + (todaySize*(line + 2)));
        }
    }
}

function getCurrentStreak()
{
    const daySlice = days.slice(0, days.length - daysBack);
    const unit = getUnit();
    var data = [];
    for(var i = 0; i < Math.ceil(daySlice.length / unit); i++)
    {
        const unitDays = daySlice.slice(Math.max(0, daySlice.length - (i+1)*unit), daySlice.length - (i)*unit);
        data.push({"pointActual":unitDays.reduce((sum, day) => sum + day.pointActual, 0),
            "pointGoal":unitDays.reduce((sum, day) => sum + day.pointGoal, 0)});
    }
    data = data.reverse();

    var streak = 0;
    for(var i = data.length-1; i >= 0; i--)
    {
        if(Math.max(0, data[i].pointActual) / Math.max(1, data[i].pointGoal) >= 1)
            streak++;
        else
            break;
    }
    return streak + " " + getUnitName(unit, streak);
}

function getBestStreak()
{
    const unit = getUnit();
    var data = [];
    for(var i = 0; i < Math.ceil(days.length / unit); i++)
    {
        const unitDays = days.slice(Math.max(0, days.length - (i+1)*unit), days.length - (i)*unit);
        data.push({"pointActual":unitDays.reduce((sum, day) => sum + day.pointActual, 0),
            "pointGoal":unitDays.reduce((sum, day) => sum + day.pointGoal, 0)});
    }
    data = data.reverse();

    var best = 0;
    var current = 0;
    for(var i = 0; i < data.length; i++)
    {
        if(Math.max(0, data[i].pointActual) / Math.max(1, data[i].pointGoal) >= 1)
            current++;
        else
        {
            best = Math.max(best, current);
            current = 0;
        }
    }
    var result = Math.max(best, current)

    return result + " " + getUnitName(unit, result);
}