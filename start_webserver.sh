#!/usr/bin/env bash
cd frontend
npm run build --prod
cd ../backend
node webserver.js 