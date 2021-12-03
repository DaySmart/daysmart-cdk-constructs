@echo off
echo Deleting read me
del "Read Me.txt" 2> nul
echo Working on icomoon_import.json
del icomoon_import.json 2> nul
ren selection.json icomoon_import.json 2> nul
echo Working on icomoon_demo.js
del icomoon_demo.js 2> nul
move demo-files\demo.js icomoon_demo.js 2> nul
echo Working on icomoon_demo.css
del icomoon_demo.css 2> nul
move demo-files\demo.css icomoon_demo.css 2> nul
echo Deleting demo-files
RMDIR  demo-files 2> nul
echo Moving fonts\* to *
del icomoon.eot 2> nul
del icomoon.ttf 2> nul
del icomoon.woff 2> nul
del icomoon.svg 2> nul
move fonts\*.* . 2> nul
echo Deleting fonts folder
RMDIR  fonts 2> nul
echo Working on icomoon_demo.html
del icomoon_demo.html 2> nul
ren demo.html icomoon_demo.html 2> nul
echo Working on icomoon_style.css
del style.scss 2> nul
del variables.scss 2> nul
del icomoon_style.css 2> nul
ren style.css icomoon_style.css 2> nul
echo Making necessary changes to files to get the demo working
powershell -Command "(gc icomoon_demo.html) -replace 'demo-files/demo.css', 'icomoon_demo.css' | Out-File -encoding UTF8 icomoon_demo.html"
powershell -Command "(gc icomoon_demo.html) -replace 'style.css', 'icomoon_style.css' | Out-File -encoding UTF8 icomoon_demo.html"
powershell -Command "(gc icomoon_demo.html) -replace 'demo-files/demo.js', 'icomoon_demo.js' | Out-File -encoding UTF8 icomoon_demo.html"
powershell -Command "(gc icomoon_style.css) -replace 'fonts/', '' | Out-File -encoding UTF8 icomoon_style.css"
echo Done!
pause