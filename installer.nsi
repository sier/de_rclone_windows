!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

Name "de_rclone"
OutFile "dist/de_rclone_installer.exe"
InstallDir "$PROGRAMFILES\de_rclone"  ; Default fallback

Function .onInit
  ${If} ${RunningX64}
    StrCpy $INSTDIR "$PROGRAMFILES64\de_rclone"
  ${Else}
    StrCpy $INSTDIR "$PROGRAMFILES\de_rclone"
  ${EndIf}
FunctionEnd

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\de_rclone.exe"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; Components
InstType "Full Installation" ; 1
InstType "Minimal Installation" ; 2

Section "de_rclone (required)" SecApp
  SectionIn RO  ; Read only, always installed
  SetOutPath "$INSTDIR"
  File /r "dist\win-unpacked\*.*"
  CreateShortCut "$DESKTOP\de_rclone.lnk" "$INSTDIR\de_rclone.exe"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Set registry view for 64-bit systems
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
  
  ; Registry information for add/remove programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "DisplayName" "de_rclone"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "QuietUninstallString" "$INSTDIR\Uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "DisplayIcon" "$INSTDIR\de_rclone.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "Publisher" "madroots"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "DisplayVersion" "1.2.6"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "NoRepair" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "EstimatedSize" 100000
SectionEnd

Section "Rclone" SecRclone
  SectionIn 1  ; Include in full installation
  AddSize 5000 ; ~5MB
  
  ; Check if rclone is already installed in the app directory or PATH
  IfFileExists "$INSTDIR\rclone.exe" 0 +3
    DetailPrint "Rclone is already installed in app directory"
    Goto rclone_done
  
  nsExec::ExecToLog 'where rclone'
  Pop $0
  ${If} $0 == 0
    DetailPrint "Rclone is already available in PATH"
    Goto rclone_done
  ${EndIf}
  
  ; Download and install rclone
  DetailPrint "Downloading rclone..."
  nsExec::ExecToLog "powershell -command $\"try { Invoke-WebRequest -Uri https://downloads.rclone.org/rclone-current-windows-amd64.zip -OutFile $$env:TEMP\rclone.zip -ErrorAction Stop } catch { exit 1 }$\""
  Pop $0
  ${If} $0 != 0
    MessageBox MB_OK "Failed to download rclone. Please install it manually from https://rclone.org/downloads/"
    Goto rclone_done
  ${EndIf}
  
  DetailPrint "Extracting rclone..."
  nsExec::ExecToLog "powershell -command $\"try { Expand-Archive -Path $$env:TEMP\rclone.zip -DestinationPath $$env:TEMP\rclone -ErrorAction Stop } catch { exit 1 }$\""
  Pop $0
  ${If} $0 != 0
    MessageBox MB_OK "Failed to extract rclone. Please install it manually."
    Delete "$TEMP\rclone.zip"
    Goto rclone_done
  ${EndIf}
  
  ; Install rclone to the same directory as de_rclone
  DetailPrint "Installing rclone..."
  nsExec::ExecToLog 'cmd /c for /d %i in ("$TEMP\rclone\rclone-*-windows-amd64") do copy "%i\rclone.exe" "$INSTDIR\rclone.exe" >nul 2>&1'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_OK "Failed to install rclone. Please install it manually."
  ${Else}
    DetailPrint "Rclone installed successfully"
  ${EndIf}
  
  ; Verify rclone installation
  nsExec::ExecToLog '"$INSTDIR\rclone.exe" --version'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_OK "Warning: rclone installation may have failed. Please verify it works or install manually."
  ${Else}
    DetailPrint "Rclone verified successfully"
  ${EndIf}
  
  ; Cleanup
  nsExec::ExecToLog 'cmd /c rd /s /q "$TEMP\rclone" 2>nul'
  Delete "$TEMP\rclone.zip"
  
  rclone_done:
SectionEnd

Section "WinFsp" SecWinFsp
  SectionIn 1  ; Include in full installation
  AddSize 2000 ; ~2MB
  
  ; Check if WinFsp is already installed
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\WinFsp" "DisplayName"
  ${If} $0 != ""
    DetailPrint "WinFsp is already installed"
    Goto winfsp_done
  ${EndIf}
  
  ; Download and install WinFsp
  DetailPrint "Downloading WinFsp..."
  nsExec::ExecToLog "powershell -command $\"try { Invoke-WebRequest -Uri https://github.com/winfsp/winfsp/releases/download/v2.1/winfsp-2.1.25156.msi -OutFile $$env:TEMP\winfsp.msi -ErrorAction Stop } catch { exit 1 }$\""
  Pop $0
  ${If} $0 != 0
    MessageBox MB_OK "Failed to download WinFsp. Please install it manually from https://winfsp.dev/"
    Goto winfsp_done
  ${EndIf}
  
  DetailPrint "Installing WinFsp..."
  nsExec::ExecToLog 'msiexec /i "$TEMP\winfsp.msi" /quiet /norestart'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_OK "Failed to install WinFsp. Please install it manually."
  ${Else}
    DetailPrint "WinFsp installed successfully"
  ${EndIf}
  
  ; Verify WinFsp installation
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\WinFsp" "DisplayName"
  ${If} $0 == ""
    MessageBox MB_OK "Warning: WinFsp installation may have failed. Please verify it works or install manually."
  ${Else}
    DetailPrint "WinFsp verified successfully"
  ${EndIf}
  
  ; Cleanup
  Delete "$TEMP\winfsp.msi"
  
  winfsp_done:
SectionEnd

Section "Uninstall"
  ; Set registry view for 64-bit systems
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}
  
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\de_rclone.lnk"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone"
SectionEnd

; Component descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecApp} "The de_rclone application (required)"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecRclone} "Rclone - command line program to sync files and directories to and from cloud storage"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecWinFsp} "WinFsp - Windows File System Proxy (required for mounting on Windows)"
!insertmacro MUI_FUNCTION_DESCRIPTION_END