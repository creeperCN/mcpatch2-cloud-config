#!/bin/bash
cd /home/z/my-project
PORT=3000 npx next dev -p 3000 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Keep script alive, check server health every 30s
for i in $(seq 1 200); do
  sleep 30
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "Server died, restarting..."
    PORT=3000 npx next dev -p 3000 &
    SERVER_PID=$!
    echo "Restarted PID: $SERVER_PID"
  fi
done
