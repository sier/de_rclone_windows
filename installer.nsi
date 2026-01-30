!include "MUI2.nsh"

Name "de_rclone"
OutFile "dist/de_rclone_installer.exe"
InstallDir "$PROGRAMFILES\de_rclone"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\de_rclone.exe"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section
  SetOutPath "$INSTDIR"
  File /r "dist\win-unpacked\*.*"
  CreateShortCut "$DESKTOP\de_rclone.lnk" "$INSTDIR\de_rclone.exe"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Registry information for add/remove programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "DisplayName" "de_rclone"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "QuietUninstallString" "$INSTDIR\Uninstall.exe /S"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "DisplayIcon" "$INSTDIR\de_rclone.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "Publisher" "github.com/sier"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "DisplayVersion" "1.2.6"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "NoRepair" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone" "EstimatedSize" 100000
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\de_rclone.lnk"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\de_rclone"
SectionEnd