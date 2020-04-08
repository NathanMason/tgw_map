do
    -- lets start commenting some of this shit.
    local PORT = 3001 -- our port
    local DATA_TIMEOUT_SEC = 1 -- data timeout not that it seems to do much
	-- initalise and basically make our socket shit really this mint.require isn't needed 
    package.path = package.path..";.\\LuaSocket\\?.lua"
    package.cpath = package.cpath..";.\\LuaSocket\\?.dll"

    -- require = mint.require -- we actually don't need this because of how we run our server 
    local socket = require("socket") -- load in socket
    local JSON = loadfile("Scripts\\JSON.lua")() -- load in json.
    -- require = nil -- really need to delete this i don't like it unseting shit on me will fix later
	
	-- dumps out a log file into dcs.log with whatever message and time, though why it's not using io... 
    local function log(msg)
        env.info("DynamicDCS (t=" .. timer.getTime() .. "): " .. msg)
    end

    local cacheDB = {} -- our cachedb, this stores the data below, so if we loose a connection we need to reset this 
	-- this builds our packet.
    local function getDataMessage()
		local payload = {} -- This is our actual 'packet' itself the data message
        payload.units = {} -- all the units in the packet
        local checkDead = {} -- creates the dead table
		-- basically runs a function to add a unit into the cache or update it.
		local function addUnit(unit, unitID, coalition, lat, lon, alt, action)
            -- stores dcs data.
			local curUnit = {
                action = action,
                unitID = unitID
            }
			-- far as i can work out here, action c is create action u is update.
            if action == "C" or action == "U" then
                -- make a entry or find the entry in cachedb with the unit id. then build it
				cacheDB[unitID] = {}
                cacheDB[unitID].lat = lat
                cacheDB[unitID].lon = lon
				cacheDB[unitID].alt = alt
                curUnit.lat = lat
                curUnit.lon = lon
				curUnit.alt = alt
                -- if we create shit then we get the types and the names and store it 
				if action == "C" then
                    curUnit.type = unit:getTypeName()
                    curUnit.coalition = coalition
					local unitdesc = unit:getDesc()
					tempcategory = unitdesc.category
					if tempcategory == Unit.Category.GROUND_UNIT then
						curUnit.category = "Ground"
					elseif tempcategory == Unit.Category.AIRPLANE then
						curUnit.category = "Air"
					elseif tempcategory == Unit.Category.HELICOPTER then
						curUnit.category = "Heli"
					elseif tempcategory == Unit.Category.SHIP then
						curUnit.category = "Ship"
					else
						curUnit.category = "Other"
					end
					curUnit.missionname = unit:getName()
					local unitdisplayname = unitdesc.displayName
					if unitdisplayname ~= nil then
						curUnit.displayname = unitdisplayname
					else
						curUnit.displayname = ""
					end
                    local PlayerName = unit:getPlayerName()
                    if PlayerName ~= nil then
                        curUnit.playername = PlayerName
                    else
                        curUnit.playername = ""
                    end
                end
            end
			-- insert the unit into the payload table..
            table.insert(payload.units, curUnit)
        end
		
		-- entire group run through
        local function addGroups(groups, coalition)
            for groupIndex = 1, #groups do
                local group = groups[groupIndex]
                local units = group:getUnits()
                for unitIndex = 1, #units do
                    local unit = units[unitIndex]
                    local unitID = tonumber(unit:getID())
                    local unitPosition = unit:getPosition()
                    local lat, lon, alt = coord.LOtoLL(unitPosition.p)
                    --check against cache table (keep tabs on if unit is new to table, if table has unit that no longer exists or if unit moved
                     if Unit.isExist(unit) and Unit.isActive(unit) then
                         if cacheDB[unitID] ~= nil then
                             --env.info('cachelat: '..cacheDB[unitID].lat..' reg lat: '..lat..' cachelon: '..cacheDB[unitID].lon..' reg lon: '..lon)
                             if cacheDB[unitID].lat ~= lat or cacheDB[unitID].lon ~= lon or cacheDB[unitID].alt ~= alt then
                                 addUnit(unit, unitID, coalition, lat, lon, alt, "U")
                             end
                         else
                             addUnit(unit, unitID, coalition, lat, lon, alt, "C")
                         end
                         checkDead[unitID] = 1
                    end
                end
            end
        end
		
        local redGroups = coalition.getGroups(coalition.side.RED)
        addGroups(redGroups, 1)
        local blueGroups = coalition.getGroups(coalition.side.BLUE)
        addGroups(blueGroups, 2)

        --check dead, send delete action to server if dead detected
        local unitCnt = 0
        for k, v in pairs( cacheDB ) do
            if checkDead[k] == nil then
                addUnit(0, k, 0, 0, 0, "D")
            end
            unitCnt = unitCnt + 1
        end
        -- store the unit count
		payload.unitCount = unitCnt
        return payload -- return the payload.
    end

    log("Starting DCS unit data server")
	
    local tcp = socket.tcp() -- create a tcp socket.
    local bound, error = tcp:bind('*', PORT) -- bind the tcp socket to the port but all addresses.
    if not bound then
        log("Could not bind: " .. error)
        return
    end
    log("Port " .. PORT .. " bound") -- dump out a message 
	-- start the server by opening listen if it returns an error spit it out else well just say.
    local serverStarted, error = tcp:listen(1) 
    if not serverStarted then
        log("Could not start server: " .. error)
        return
    end
    log("Server started")

	-- starts a client, 
    local client
    local function step()

        if not client then
            tcp:settimeout(0.001)
            client = tcp:accept()

            if client then
                tcp:settimeout(0)
                log("Connection established")
            end
        end

 
        if client then
            local msg = JSON:encode(getDataMessage()).."\n"
            --env.info(msg)
            local bytes, status, lastbyte = client:send(msg)
            if not bytes then
                log("Connection lost")
				cacheDB = {} -- clean out the cache we'll need to resend it because chances are the servers reset.
                client = nil
            end
        end
    end

    timer.scheduleFunction(function(arg, time)
        local success, error = pcall(step)
        if not success then
            log("Error: " .. error)
        end
        return timer.getTime() + DATA_TIMEOUT_SEC
    end, nil, timer.getTime() + DATA_TIMEOUT_SEC)
end