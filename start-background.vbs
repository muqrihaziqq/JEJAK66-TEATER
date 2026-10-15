Set WshShell = CreateObject("WScript.Shell")
' Run start-online.bat hidden in background (0 = hide window)
WshShell.Run "cmd /c """ & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\start-online.bat""", 0, False
