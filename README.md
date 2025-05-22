https://github.com/peterherrmann/BetterLog

Google App Scripts will always return a 200 code even if the script failed so you need to check the body to see if it was sucessful or not.

This code is scuffed but has worked great for ingesting data into Google Sheets from our ETLs. We've been able to use this to create dashboards and frequently updated spreadsheets.
