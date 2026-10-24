param([Parameter(Mandatory)][string]$Hwnd,[ValidateSet('click','window-message')][string]$Action='click',[int]$X,[int]$Y,[int]$ActivateX,[int]$ActivateY,[int]$ExpectedPid)
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class FlowProofInput {
 [StructLayout(LayoutKind.Sequential)] public struct POINT {public int X,Y;}
 [StructLayout(LayoutKind.Sequential)] public struct MOUSE {public int dx,dy;public uint data,flags,time;public UIntPtr extra;}
 [StructLayout(LayoutKind.Sequential)] public struct KEY {public ushort vk,scan;public uint flags,time;public UIntPtr extra;}
 [StructLayout(LayoutKind.Explicit)] public struct UNION {[FieldOffset(0)]public MOUSE mouse;[FieldOffset(0)]public KEY key;}
 [StructLayout(LayoutKind.Sequential)] public struct INPUT {public uint type;public UNION data;}
 [DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")]public static extern IntPtr WindowFromPoint(POINT p);
 [DllImport("user32.dll")]public static extern IntPtr GetAncestor(IntPtr h,uint f);
 [DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")]public static extern bool GetCursorPos(out POINT p);
 [DllImport("user32.dll")]public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
 [DllImport("user32.dll")]public static extern short GetAsyncKeyState(int k);
 [DllImport("user32.dll")]public static extern uint SendInput(uint count,INPUT[] input,int size);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")]public static extern bool ScreenToClient(IntPtr h,ref POINT point);
 [DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint message,IntPtr wparam,IntPtr lparam);
 public static void Mouse(uint flags){var i=new INPUT();i.type=0;i.data.mouse.flags=flags;if(SendInput(1,new[]{i},Marshal.SizeOf<INPUT>())!=1)throw new Exception("Native click failed");}
}
'@
$target=[IntPtr]::new([long]::Parse($Hwnd))
[void][FlowProofInput]::SetThreadDpiAwarenessContext([IntPtr]::new(-4))
if($Action -eq 'window-message'){
 [uint32]$owner=0;[void][FlowProofInput]::GetWindowThreadProcessId($target,[ref]$owner)
 if($owner -ne $ExpectedPid -or $ExpectedPid -le 0){throw 'Native test window does not belong to the expected FlowProof process'}
 $p=[FlowProofInput+POINT]::new();$p.X=$X;$p.Y=$Y
 if(-not [FlowProofInput]::ScreenToClient($target,[ref]$p) -or $p.X -lt 0 -or $p.Y -lt 0){throw 'Invalid owned-window client point'}
 $position=[IntPtr]::new(($p.Y -shl 16) -bor ($p.X -band 65535))
 if(-not [FlowProofInput]::PostMessage($target,0x200,[IntPtr]::Zero,$position)){throw 'Native window move message failed'}
 if(-not [FlowProofInput]::PostMessage($target,0x201,[IntPtr]::new(1),$position)){throw 'Native window down message failed'}
 if(-not [FlowProofInput]::PostMessage($target,0x202,[IntPtr]::Zero,$position)){throw 'Native window up message failed'}
 if(-not [FlowProofInput]::PostMessage($target,0x100,[IntPtr]::new(0x5A),[IntPtr]::new(1))){throw 'Native key down failed'}
 if(-not [FlowProofInput]::PostMessage($target,0x102,[IntPtr]::new(0x5A),[IntPtr]::new(1))){throw 'Native character failed'}
 if(-not [FlowProofInput]::PostMessage($target,0x101,[IntPtr]::new(0x5A),[IntPtr]::new(0xC0000001L))){throw 'Native key up failed'}
 @{status='SENT';method='Win32 PostMessage to owned FlowProof window';actualHumanHardware=$false;clientPoint=@{x=$p.X;y=$p.Y}}|ConvertTo-Json -Compress;exit 0
}
[void][FlowProofInput]::SetForegroundWindow($target)
Start-Sleep -Milliseconds 100
foreach($key in @(16,17,18,91,92)){if(([int][FlowProofInput]::GetAsyncKeyState($key) -band 0x8000) -ne 0){@{status='UNVERIFIED';reason='Held modifier; input aborted'}|ConvertTo-Json -Compress;exit 0}}
if([FlowProofInput]::GetForegroundWindow() -ne $target){
 $p=[FlowProofInput+POINT]::new();$p.X=$ActivateX;$p.Y=$ActivateY
 if([FlowProofInput]::GetAncestor([FlowProofInput]::WindowFromPoint($p),2) -ne $target){@{status='UNVERIFIED';reason='Owned activation point obscured';expectedWindow=$Hwnd;expectedRoot=[FlowProofInput]::GetAncestor($target,2).ToInt64();foreground=[FlowProofInput]::GetForegroundWindow().ToInt64();hitWindow=[FlowProofInput]::GetAncestor([FlowProofInput]::WindowFromPoint($p),2).ToInt64();activation=@{x=$ActivateX;y=$ActivateY}}|ConvertTo-Json -Compress;exit 0}
 [void][FlowProofInput]::SetCursorPos($ActivateX,$ActivateY);[FlowProofInput]::Mouse(2);[FlowProofInput]::Mouse(4);Start-Sleep -Milliseconds 100
}
$point=[FlowProofInput+POINT]::new();$point.X=$X;$point.Y=$Y
if([FlowProofInput]::GetForegroundWindow() -ne $target -or [FlowProofInput]::GetAncestor([FlowProofInput]::WindowFromPoint($point),2) -ne $target){@{status='UNVERIFIED';reason='Owned foreground/hit test not established'}|ConvertTo-Json -Compress;exit 0}
[void][FlowProofInput]::SetCursorPos($X,$Y)
$actual=[FlowProofInput+POINT]::new();[void][FlowProofInput]::GetCursorPos([ref]$actual)
if([Math]::Abs($actual.X-$X) -gt 1 -or [Math]::Abs($actual.Y-$Y) -gt 1 -or [FlowProofInput]::GetForegroundWindow() -ne $target -or [FlowProofInput]::GetAncestor([FlowProofInput]::WindowFromPoint($actual),2) -ne $target){@{status='UNVERIFIED';reason='Pointer or foreground changed';expected=@{x=$X;y=$Y};actual=@{x=$actual.X;y=$actual.Y}}|ConvertTo-Json -Compress;exit 0}
[FlowProofInput]::Mouse(2);[FlowProofInput]::Mouse(4)
@{status='SENT';method='Win32 SendInput';actualHumanHardware=$false;actualPoint=@{x=$actual.X;y=$actual.Y}}|ConvertTo-Json -Compress
