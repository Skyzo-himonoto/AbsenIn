#!/bin/bash
while true; do
  cd ~/AbsenIn
  git add .
  git commit -m "auto backup $(date '+%d-%m %H:%M')" 2>/dev/null
  git push 2>/dev/null
  echo "Backup otomatis jam $(date '+%H:%M') beres"
  sleep 3600
done
