#!/bin/bash
# Smart Arc Browser Launcher for Neptino
# Opens localhost:3000 in Arc, reusing existing tab if possible

URL="http://localhost:3000"

# Wait for Vite to be ready
sleep 2

# Check if Arc is running
if ! pgrep -f "Arc" > /dev/null; then
    echo "🚀 Launching Arc..."
    open -a "Arc" "$URL"
    exit 0
fi

# Arc is already running - try to reuse existing tab
# Use AppleScript to focus existing localhost:3000 tab or create new one
osascript <<EOF 2>/dev/null
tell application "Arc"
    activate
    
    -- Try to find existing localhost:3000 tab
    set foundTab to false
    set windowCount to count of windows
    
    if windowCount > 0 then
        repeat with w from 1 to windowCount
            try
                set tabCount to count of tabs of window w
                repeat with t from 1 to tabCount
                    set tabURL to URL of tab t of window w
                    if tabURL contains "localhost:3000" then
                        set current tab of window w to tab t of window w
                        set index of window w to 1
                        set foundTab to true
                        exit repeat
                    end if
                end repeat
            end try
            if foundTab then exit repeat
        end repeat
    end if
    
    -- If no existing tab found, open in current window
    if not foundTab then
        tell front window
            tell space of front window
                make new tab with properties {URL:"$URL"}
            end tell
        end tell
    end if
end tell
EOF

if [ $? -eq 0 ]; then
    echo "✅ Arc ready at localhost:3000 (reused tab if available)"
else
    # Fallback if AppleScript fails
    echo "📂 Opening Arc..."
    open -a "Arc" "$URL"
fi
