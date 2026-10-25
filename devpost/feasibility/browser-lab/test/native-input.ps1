param([Parameter(Mandatory)][string]$Hwnd, [Parameter(Mandatory)][ValidateSet('click','type','wheel')][string]$Action, [int]$X, [int]$Y, [int]$ActivateX, [int]$ActivateY, [string]$Text = '')
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class LabInput {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X,Y; }
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx,dy; public uint mouseData,dwFlags,time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk,wScan; public uint dwFlags,time; public UIntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION u; }
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd,uint flags);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll",SetLastError=true)] public static extern uint SendInput(uint n,INPUT[] inputs,int size);
  public static void Mouse(uint flags,uint data=0) { var i=new INPUT(); i.type=0;i.u.mi.dwFlags=flags;i.u.mi.mouseData=data; if(SendInput(1,new[]{i},Marshal.SizeOf<INPUT>())!=1)throw new Exception("SendInput mouse failed"); }
  public static void Unicode(char c) { var a=new INPUT();a.type=1;a.u.ki.wScan=c;a.u.ki.dwFlags=4;var b=a;b.u.ki.dwFlags=6; if(SendInput(2,new[]{a,b},Marshal.SizeOf<INPUT>())!=2)throw new Exception("SendInput Unicode failed"); }
  public static void WheelDown() { Mouse(0x0800,unchecked((uint)-120)); }
}
'@
$target = [IntPtr]::new([long]::Parse($Hwnd))
# Electron supplied physical screen coordinates. Avoid a second virtualization
# transform in PowerShell's otherwise DPI-unaware thread.
if ([LabInput]::SetThreadDpiAwarenessContext([IntPtr]::new(-4)) -eq [IntPtr]::Zero) { throw 'Could not establish per-monitor-v2 DPI coordinates' }
[void][LabInput]::SetForegroundWindow($target)
Start-Sleep -Milliseconds 150
foreach ($key in @(16,17,18,91,92)) { if (([int][LabInput]::GetAsyncKeyState($key) -band 0x8000) -ne 0) { @{status='INCONCLUSIVE';reason='User modifier key held; no input injected'} | ConvertTo-Json -Compress; exit 0 } }
if ([LabInput]::GetForegroundWindow() -ne $target) {
  $activation = [LabInput+POINT]::new();$activation.X=$ActivateX;$activation.Y=$ActivateY
  if ([LabInput]::GetAncestor([LabInput]::WindowFromPoint($activation),2) -ne $target) { @{status='INCONCLUSIVE';reason='Owned titlebar activation point is obscured; no input injected'} | ConvertTo-Json -Compress; exit 0 }
  if (-not [LabInput]::SetCursorPos($ActivateX,$ActivateY)) { throw 'Activation cursor movement failed' }
  [LabInput]::Mouse(0x0002);[LabInput]::Mouse(0x0004);Start-Sleep -Milliseconds 200
}
if ([LabInput]::GetForegroundWindow() -ne $target) { @{status='INCONCLUSIVE';reason='Owned diagnostic window could not become foreground'} | ConvertTo-Json -Compress; exit 0 }
$point = [LabInput+POINT]::new(); $point.X=$X; $point.Y=$Y
if ([LabInput]::GetAncestor([LabInput]::WindowFromPoint($point),2) -ne $target) { @{status='INCONCLUSIVE';reason='Input point is not inside the owned diagnostic window'} | ConvertTo-Json -Compress; exit 0 }
if (-not [LabInput]::SetCursorPos($X,$Y)) { throw 'SetCursorPos failed; no input injected' }
$actual = [LabInput+POINT]::new();[void][LabInput]::GetCursorPos([ref]$actual)
for ($attempt=0; $attempt -lt 6 -and ($actual.X -ne $X -or $actual.Y -ne $Y); $attempt++) { Start-Sleep -Milliseconds 20;[void][LabInput]::GetCursorPos([ref]$actual) }
if ($actual.X -ne $X -or $actual.Y -ne $Y) { @{status='INCONCLUSIVE';reason='Cursor position was not established; no action injected';expected=@{x=$X;y=$Y};actual=@{x=$actual.X;y=$actual.Y}} | ConvertTo-Json -Compress; exit 0 }
if ([LabInput]::GetForegroundWindow() -ne $target) { throw 'Foreground changed; input aborted' }
if ($Action -eq 'wheel') { [LabInput]::WheelDown() }
else {
  [LabInput]::Mouse(0x0002); [LabInput]::Mouse(0x0004)
  if ($Action -eq 'type') { foreach ($char in $Text.ToCharArray()) { if ([LabInput]::GetForegroundWindow() -ne $target) { throw 'Foreground changed; typing aborted' }; [LabInput]::Unicode($char) } }
}
@{status='SENT';method='Win32 SendInput';actualHumanHardware=$false;action=$Action;dpi=[LabInput]::GetDpiForWindow($target);coordinateContext='PER_MONITOR_AWARE_V2';cursor=@{x=$actual.X;y=$actual.Y}} | ConvertTo-Json -Compress
