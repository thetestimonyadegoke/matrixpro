@echo off
REM pwsh shim for environments without PowerShell 7.
REM Forwards all arguments to Windows PowerShell (powershell.exe).
powershell.exe %*
