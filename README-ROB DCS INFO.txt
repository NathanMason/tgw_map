Important DCS INFO:

1. Make certain MissionScripting.Lua in DCS has had the DESANITIZEATION items commented out so require etc works.
2. Make certain your Using the LATEST test mission from the MissionFile folder!
3. Make certain you are Testing as a SERVER not just single player (data doesn't always match depending on game modes)
4. If you are NOT using the latest file make certain you have grabbed the latest dynamicDCSTCP.lua and updated it in the mission by editing the mission, triggers, finding the script and clicking open/select new one. then save.


DCS sends the following information.

        serverObject.units[unit.unitID] = {
            	unitID: DCS Unique ID,
            	type: DCS Unique Type,
            	coalition: DCS Coalition Value,
            	lat: Latitude in DDS,
            	lon: Longitude in DDS,
		alt: altitude in METERS,
		missionname: unit name as set in ME,
                playername: _.get(unit, 'playername', ''),
		displayname: unit 'nice' name as in dcs,
		category: unit category
        };


as such the values can be as follows
	UnitID: UINT
	Type: String
	Coalition: INT (0 = neutral, 1 = red, 2 = blue)
	lat: Float
	lon: Float
	alt: Float
	missionname: String
	playername: String
	displayname: String
	category: String (Ground,Air,Heli,Ship,Other)


- Rob.