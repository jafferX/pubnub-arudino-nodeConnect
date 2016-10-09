//-----------------------------------------------------------
//dependenices 
//-----------------------------------------------------------
var config = require('./config.js');
var pubnub = require('pubnub')({
	publish_key : config.publishing_key,
	subscribe_key : config.subscribing_key
});
var nedb = require ('nedb');
var serialport = require ('serialport');


//--------------------------------------------------------------
//serial port config
//--------------------------------------------------------------
var portName = 'COM3'; //switch com3, usb connected right now. 
serialport.on('error',function(error) {
	if (error)
	{
    	console.log('error:' +error);
    }
});

//serial port configuration settings
var sp = new serialport.SerialPort(portName,{
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    parser: serialport.parsers.readline("\r\n")
});

//--------------------------------------------------------------
//setting up database
//--------------------------------------------------------------
db = new Object(); // new database object
db.data = new nedb({filename: './data.json',autoload: true});
db.avg = new nedb({filename: './avg.json', autoload: true});

//var db = new nedb({filename: './nedb.json', autoload: true});

db.data.loadDatabase(function (err) {

	console.log('load err:', err);
	});
db.avg.loadDatabase(function (err) {
	console.log('load err:', err);
});
	
//---------------------------------------------------------------
//setting up pubnub to publish
//----------------------------------------------------------------
queryDatabase(db);

	//serial port is turned on, once data is extracted then message is published onto to data stream
	sp.on('data', function(data) {
		console.log(data);
		var message = {"humid" : 10, "temperature" : data};
		pubnub.publish ({
			channel : 'Channel-f0jvdckpa',
			message : message,
			callback : function (err) {
				console.log ("success!", err)
			},
			error : function (err) {
				console.log("failed! retry publish", err);
			}
		});
	});         

//var message = {"humid" : 10, "temperature" : 10};
//var message1 = {"humid": gundam};
//pubnub.publish ({
	//channel : 'Channel-f0jvdckpa',
	//message : message,
	//callback : function (err) {
		//console.log ("success!", err); },
	//error : function(err) {
		//console.log("failed! retry publish", err);}
	
//});
//--------------------------------------------
//subscribing message from pubnub
//--------------------------------------------
//subscribed to data stream and collects data messages and organizes them into a db
pubnub.subscribe({
	channel : "Channel-f0jvdckpa",
	callback : function (message) {
		console.log (">" , message);
		var messageNew = JSON.stringify(message);		
		var messageNew1 = parseSubstring(messageNew);
		console.log (messageNew1[0] + " " + messageNew1[1]);
		insertIntoDatabase(db, messageNew1);
		queryDatabase(db);
		
	}
});


function parseSubstring(message) {
	var section1 = message.substring(1, message.indexOf(","));
	var section2 = message.substring(message.indexOf(",") + 1, message.indexOf("}"));
	var tempN = section1.split(":");
	var tempW = section2.split(":");
	var container = [tempN[1].trim(),tempW[1].trim()];
	return container;
}

function insertIntoDatabase(db, message) {
	var plantData = {
		name: JSON.parse(message[0]),
		temperature: JSON.parse(parseInt(message[1]))
	};
	db.data.insert(plantData,function(err, doc) {
		if (err) {
			console.log(err);
			return;
		}
		console.log("added: ", doc);
		return;
	});
}
	


//function used to query database. takes in database object 
function queryDatabase(db) {
	db.data.find({ temperature: {$lte : 40} }, function (err, docs) {
		console.log(docs);
		//var message = JSON.stringify(docs, ['temperature']);
		//console.log(message);
		var add = 0;
		for(var i = 0; i < docs.length; i++)
		{
			console.log(docs[i].temperature);
			add = add + docs[i].temperature;
			console.log("this is the total " + add);

		}
		var avgObj = {
			name: "obj",
			avgWater: add
		};
		db.avg.insert(avgObj, function(err, doc) {
			if (err) {
				console.log(err);
				return;
			}
			console.log("added:", doc);
			return;
		});
		
		//var string = message.substring(message.indexOf("{") , message.indexOf("]"));
		//console.log(string);
		//var newString = string.split(":");
		//console.log(newString[1]);
		//var k = parseInt(newString[1]);
		//console.log(k);

	});
};



