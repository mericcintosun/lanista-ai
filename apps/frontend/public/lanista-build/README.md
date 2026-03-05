# Lanista WebGL Build Integration Guide

This guide explains how to integrate and control the Lanista Unity WebGL build through JavaScript API calls.

## Overview

The WebGL build exposes three main JavaScript functions that allow external applications to control the game flow and provide match data:

- `SetMode(mode)` - Configure the operation mode
- `SetMatchId(matchId)` - Set the match ID for external API calls
- `LoadJsonGameData(jsonData)` - Load match data directly as JSON

## Getting Started

### Step 1: Set Operation Mode

**You must call `SetMode()` first** to configure how the game will receive match data.

```javascript
SetMode(mode);
```

**Parameters:**
- `mode` (number): The operation mode
  - `0` - External API Call Mode
  - `1` - iFrame Mode
  - `2` - API Simulation Mode (for testing)

**Example:**
```javascript
// Use External API Call Mode
SetMode(0);

// Or use iFrame Mode
SetMode(1);
```

## Mode-Specific Usage

### Mode 0: External API Call Mode

In this mode, the Unity game will directly call the backend API to fetch match data.

**Requirements:**
1. Call `SetMode(0)` to activate External API Call mode
2. **Must call `SetMatchId(matchId)`** to specify which match to fetch

**Example:**
```javascript
// Set to External API Call mode
SetMode(0);

// Provide the match ID
SetMatchId("0469a41b-60ae-408a-b8ad-0e0f701398db");
```

The game will:
- Wait for the match ID to be set
- Poll the API endpoint every second: `https://backend-production-9598.up.railway.app/api/combat/status?matchId={matchId}`
- Automatically stop polling when match status is "finished"

### Mode 1: iFrame Mode

In this mode, your frontend application controls when match data is sent to the Unity game.

**Requirements:**
1. Call `SetMode(1)` to activate iFrame mode
2. **Call `LoadJsonGameData(jsonData)`** whenever new match state data arrives

**Example:**
```javascript
// Set to iFrame mode
SetMode(1);

// When you receive new match data from your backend
const matchData = {
  match: {
    player_1: { name: "Gladiator A" },
    player_2: { name: "Gladiator B" },
    status: "ongoing"
  },
  logs: [...]
};

// Send it to Unity as a JSON string
LoadJsonGameData(JSON.stringify(matchData));
```

**Important:** 
- You must send the data as a JSON string, not as a JavaScript object
- Call this function each time new match state data is received
- The game will process and visualize the match data in real-time

### Mode 2: API Simulation Mode

This mode is for testing purposes. It uses pre-loaded dummy data and simulates the match progression.

```javascript
SetMode(2);
```

The game will automatically play through the loaded match data with 1-second intervals between events.

## Function Reference

### SetMode(mode)

Configures the operation mode of the game.

**Parameters:**
- `mode` (number): 0 = External API, 1 = iFrame, 2 = Simulation

**Returns:** None

---

### SetMatchId(matchId)

Sets the match ID for External API Call mode.

**Parameters:**
- `matchId` (string): The unique identifier of the match to fetch

**Returns:** None

**Required for:** Mode 0 (External API Call Mode) only

---

### LoadJsonGameData(jsonData)

Loads match data directly into the game.

**Parameters:**
- `jsonData` (string): Match data as a JSON string

**Returns:** None

**Required for:** Mode 1 (iFrame Mode) - called on each state update

**Example JSON Structure:**
```json
{
  "match": {
    "player_1": {
      "name": "Player Name 1"
    },
    "player_2": {
      "name": "Player Name 2"
    },
    "status": "ongoing"
  },
  "logs": []
}
```

## Debugging

If you encounter any issues:

1. **Open Browser Console** (F12 in most browsers)
2. Look for messages prefixed with `[UNITY]`
3. Common debug messages:
   - `[UNITY] External API Call mode selected...` - Mode 0 activated
   - `[UNITY] iFrame mode selected...` - Mode 1 activated
   - `[UNITY] Waiting for match ID to be set...` - SetMatchId() not called yet
   - `[UNITY] Match ID set to: {matchId}` - Match ID successfully set
   - `[UNITY] Match loaded: {player1} vs {player2}` - Data loaded successfully
   - `[UNITY] Error parsing Game Data JSON:` - Invalid JSON format

## Complete Integration Example

### External API Call Mode
```javascript
// Wait for Unity to load
window.addEventListener('load', function() {
  // Set mode to External API Call
  SetMode(0);
  
  // Set the match ID
  SetMatchId("your-match-id-here");
  
  // Unity will now automatically fetch and play the match
});
```

### iFrame Mode
```javascript
// Set mode to iFrame
SetMode(1);

// Your application polls your backend
setInterval(async () => {
  const response = await fetch('your-api-endpoint');
  const matchData = await response.json();
  
  // Send to Unity
  LoadJsonGameData(JSON.stringify(matchData));
  
  // Stop if match is finished
  if (matchData.match.status === 'finished') {
    clearInterval(this);
  }
}, 1000);
```

## Notes

- Always call `SetMode()` before any other function
- The game instance must be fully loaded before making API calls
- Check the browser console for detailed logs and error messages
- In External API Call mode, the Unity game handles all API communication
- In iFrame mode, your application has full control over data flow
